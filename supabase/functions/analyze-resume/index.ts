import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

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

    // Verify premium
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: profile } = await supabaseAdmin
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

    const { resumePdfBase64, jobDescription } = await req.json();
    if (!resumePdfBase64 || !jobDescription?.trim()) {
      return new Response(JSON.stringify({ error: "resumePdfBase64 and jobDescription are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) throw new Error("ANTHROPIC_API_KEY not configured");

    const prompt = `You are an expert resume coach and ATS specialist. The PDF above is the student's resume. Analyze it against the job description below and return ONLY valid JSON — no markdown, no code fences, no extra text.

JOB DESCRIPTION:
${jobDescription.slice(0, 3000)}

Return this exact JSON shape:
{
  "overall_score": <integer 0-100>,
  "breakdown": {
    "keyword_match": <integer 0-100>,
    "impact": <integer 0-100>,
    "ats_format": <integer 0-100>,
    "relevance": <integer 0-100>
  },
  "missing_keywords": [<up to 8 short strings>],
  "improved_bullets": [
    { "original": "<exact bullet from resume>", "improved": "<rewritten version with metrics and action verbs>" }
  ],
  "top_suggestions": [<3 concise, specific suggestions as strings>]
}

Rules:
- improved_bullets: pick the 3 weakest bullets from the resume and rewrite them. Keep the student's experience but make it quantified and impactful.
- missing_keywords: only include keywords that appear in the JD but not the resume.
- Be honest with scoring. A generic resume vs a specific JD should score 40-60, not 80+.
- Return ONLY the JSON object, nothing else.`;

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1200,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: resumePdfBase64,
                },
              },
              { type: "text", text: prompt },
            ],
          },
        ],
      }),
    });

    if (!claudeRes.ok) throw new Error(`Claude error ${claudeRes.status}`);

    const claudeData = await claudeRes.json();
    const raw: string = claudeData.content?.[0]?.text ?? "{}";

    let result: Record<string, unknown>;
    try {
      result = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      result = m ? JSON.parse(m[0]) : {};
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("analyze-resume error:", err);
    return new Response(JSON.stringify({ error: err.message ?? "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
