import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
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

    const { data: profile } = await supabaseUser
      .from("profiles")
      .select("is_premium")
      .eq("id", user.id)
      .maybeSingle();

    if (!(profile as any)?.is_premium) {
      return new Response(JSON.stringify({ error: "Premium required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: prefs } = await supabaseAdmin
      .from("user_preferences")
      .select("interest_name")
      .eq("user_id", user.id);

    const interests =
      (prefs ?? [])
        .map((p: any) => p.interest_name)
        .filter(Boolean)
        .join(", ") || "not specified";

    const now = new Date().toISOString();
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: events } = await supabaseAdmin
      .from("events")
      .select("title, date, location, description, organization, event_type, tags")
      .gte("date", now)
      .lte("date", in30Days)
      .order("date", { ascending: true })
      .limit(30);

    const eventsText =
      (events ?? [])
        .map((e: any) => {
          const date = e.date
            ? new Date(e.date).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })
            : "TBD";
          const parts = [
            `• ${e.title} — ${date}`,
            e.location && `  Location: ${e.location}`,
            e.organization && `  By: ${e.organization}`,
            e.description && `  ${e.description.slice(0, 120)}`,
          ].filter(Boolean);
          return parts.join("\n");
        })
        .join("\n\n") || "No upcoming events found.";

    const systemPrompt = `You are Vybin's AI assistant — a friendly, knowledgeable guide for first-year students at McGill University in Montreal, Canada.

This student's interests: ${interests}

Upcoming McGill campus events (next 30 days):
${eventsText}

How to help:
- Recommend specific events from the list above when relevant
- Answer questions about McGill campus life, academic tips, clubs, and student resources
- Be warm and concise — like a helpful older student, not a formal chatbot
- Keep responses to 2–4 sentences unless a longer answer is genuinely needed
- If asked something outside McGill/student life, gently redirect to what you can help with
- Today's date: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`;

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) throw new Error("ANTHROPIC_API_KEY not configured");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Claude API error: ${err}`);
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text ?? "Sorry, I couldn't generate a response. Please try again.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("ai-assistant error:", err);
    return new Response(JSON.stringify({ error: err?.message ?? "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
