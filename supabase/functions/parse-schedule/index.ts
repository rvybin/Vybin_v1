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
      return new Response(JSON.stringify({ error: "Premium subscription required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { storagePath } = await req.json();
    if (!storagePath) {
      return new Response(JSON.stringify({ error: "storagePath is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from("calendar_uploads")
      .download(storagePath);

    if (downloadError || !fileData) {
      throw new Error(`Storage download failed: ${downloadError?.message}`);
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64 = btoa(binary);
    const mimeType = fileData.type || "image/png";

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mimeType, data: base64 },
              },
              {
                type: "text",
                text: `This is a McGill University weekly class timetable. Extract every class block visible and return ONLY a valid JSON array — no markdown, no explanation, no code fences.

Each object must have exactly these fields:
- "day": one of "MO", "TU", "WE", "TH", "FR", "SA", "SU"
- "course_code": the full course code as shown (e.g. "MATH 141-002")
- "title": same value as course_code
- "startTime": 24-hour format string "HH:MM" (e.g. "09:35")
- "endTime": 24-hour format string "HH:MM" (e.g. "10:25")
- "location": building name and room (e.g. "Leacock Building 132"), or null if not visible

TIME ACCURACY RULES (critical — read carefully):
- Determine startTime and endTime from the VISUAL POSITION of each block in the grid. The left column shows hour markers; use the block's top edge for startTime and bottom edge for endTime.
- The time text printed inside Minerva cells (e.g. "8:35 am-9:55 am") often belongs to the course's other sections and can be WRONG for the specific slot displayed. Always verify against the visual grid position.
- McGill standard session lengths: 50 minutes ("1 hr" in course listings) or 80 minutes ("1.5 hr"). A cell labelled "1 times 1 hr/wk" means one 50-minute session — compute endTime as startTime + 50 min, regardless of what the cell text says.
- NEVER output two classes on the same day with overlapping times. If a conflict arises from cell text, trust the visual grid position to resolve it.

Other rules:
- If the same course appears in multiple day columns, create a separate entry per day
- Do not duplicate the same course on the same day at the same time
- Convert all am/pm times to 24-hour format
- Return [] if no classes are found
- Return ONLY the raw JSON array, nothing else`,
              },
            ],
          },
        ],
      }),
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      throw new Error(`Claude API error ${claudeResponse.status}: ${errorText}`);
    }

    const claudeData = await claudeResponse.json();
    const responseText: string = claudeData.content?.[0]?.text ?? "[]";

    let parsed: unknown[];
    try {
      parsed = JSON.parse(responseText);
    } catch {
      const match = responseText.match(/\[[\s\S]*\]/);
      parsed = match ? JSON.parse(match[0]) : [];
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("parse-schedule error:", err);
    return new Response(JSON.stringify({ error: err?.message ?? "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
