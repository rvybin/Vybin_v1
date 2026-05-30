import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Use service role key directly — Supabase's built-in JWT check already
  // blocks unauthenticated callers before this code runs.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:hello@vybin.org";

  if (!vapidPublic || !vapidPrivate) {
    return new Response(JSON.stringify({ error: "VAPID not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  // Find all classes that need a reminder fired right now
  const { data: due, error: rpcError } = await supabase.rpc("get_due_class_reminders");
  if (rpcError) {
    console.error("get_due_class_reminders error:", rpcError);
    return new Response(JSON.stringify({ error: rpcError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!due?.length) {
    return new Response(JSON.stringify({ sent: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let sent = 0;

  for (const item of due as {
    user_id: string;
    calendar_item_id: string;
    title: string;
    course_code: string | null;
    location: string | null;
  }[]) {
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth_key")
      .eq("user_id", item.user_id);

    if (!subs?.length) continue;

    const label = item.course_code || item.title;
    const notifBody = item.location ? `${label} · ${item.location}` : label;

    const payload = JSON.stringify({
      title: "Class starting soon",
      body: notifBody,
      icon: "/favicon.png",
      tag: `class-${item.calendar_item_id}`,
      url: "/app",
    });

    const expiredEndpoints: string[] = [];

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          payload
        );
        sent++;
      } catch (err: any) {
        if (err.statusCode === 410) expiredEndpoints.push(sub.endpoint);
      }
    }

    if (expiredEndpoints.length) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", item.user_id)
        .in("endpoint", expiredEndpoints);
    }

    // Mark this reminder as sent for today so we don't fire it again
    await supabase.from("sent_reminders").upsert(
      {
        user_id: item.user_id,
        calendar_item_id: item.calendar_item_id,
        occurrence_date: new Date().toISOString().slice(0, 10),
      },
      { onConflict: "user_id,calendar_item_id,occurrence_date" }
    );
  }

  return new Response(JSON.stringify({ sent }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
