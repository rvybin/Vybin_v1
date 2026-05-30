import webpush from "npm:web-push@3.6.7";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, tooManyRequests } from "../_shared/rateLimit.ts";
import { requireString } from "../_shared/validate.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Require authentication — users can only push to themselves
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: 10 manual pushes per user per hour
    const rl = await checkRateLimit(`send-push:${user.id}`, 10, 3600);
    if (!rl.allowed) return tooManyRequests(corsHeaders, rl.retryAfterSec);

    const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
    const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
    const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:hello@vybin.app";

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      throw new Error("VAPID keys not configured");
    }

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const reqBody = await req.json();
    const { user_id, title, body: notifBody, url } = reqBody;

    // user_id must match the authenticated user — no cross-user notification injection
    if (!user_id || user_id !== user.id) {
      return new Response(JSON.stringify({ error: "user_id must match authenticated user" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate notification fields
    const titleErr = requireString(title, "title", 200);
    if (titleErr) {
      return new Response(JSON.stringify({ error: titleErr }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: subs, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth_key")
      .eq("user_id", user_id);

    if (subsError) throw subsError;
    if (!subs?.length) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.stringify({ title, body: notifBody, url });

    const results = await Promise.allSettled(
      subs.map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          payload
        )
      )
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - sent;

    // Clean up subscriptions that are no longer valid (410 Gone)
    const expiredEndpoints: string[] = [];
    results.forEach((r, i) => {
      if (r.status === "rejected" && (r.reason as any)?.statusCode === 410) {
        expiredEndpoints.push(subs[i].endpoint);
      }
    });
    if (expiredEndpoints.length) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", user_id)
        .in("endpoint", expiredEndpoints);
    }

    return new Response(JSON.stringify({ sent, failed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("send-push error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
