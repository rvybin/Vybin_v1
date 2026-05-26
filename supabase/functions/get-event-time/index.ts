import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function isoToHHMM(iso: string): string | null {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  } catch {
    return null;
  }
}

// Try to extract start/end from JSON-LD Event schema blocks embedded in the HTML.
// CampusGroups (myInvolvement) includes these for SEO even on JS-rendered pages.
function extractFromJsonLd(html: string): { startTime: string | null; endTime: string | null } | null {
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const block of blocks) {
    try {
      const data = JSON.parse(block[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const type = item["@type"];
        if (type === "Event" || type === "SocialEvent" || type === "EducationEvent") {
          if (item.startDate) {
            return {
              startTime: isoToHHMM(item.startDate),
              endTime: item.endDate ? isoToHHMM(item.endDate) : null,
            };
          }
        }
      }
    } catch {
      // malformed JSON-LD — try next block
    }
  }
  return null;
}

// Try common meta tag patterns used by event platforms.
function extractFromMeta(html: string): { startTime: string | null; endTime: string | null } | null {
  const patterns = [
    /property=["']event:start_time["'][^>]+content=["']([^"']+)["']/i,
    /name=["']event:start_time["'][^>]+content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]+property=["']event:start_time["']/i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1]) {
      const endM = html.match(/property=["']event:end_time["'][^>]+content=["']([^"']+)["']/i)
        ?? html.match(/content=["']([^"']+)["'][^>]+property=["']event:end_time["']/i);
      return { startTime: isoToHHMM(m[1]), endTime: endM?.[1] ? isoToHHMM(endM[1]) : null };
    }
  }
  return null;
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#\d+;/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

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

    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ startTime: null, endTime: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the event page server-side
    let html: string;
    try {
      const pageRes = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; Vybin/1.0)" },
        signal: AbortSignal.timeout(8000),
      });
      if (!pageRes.ok) throw new Error(`HTTP ${pageRes.status}`);
      html = await pageRes.text();
    } catch {
      return new Response(JSON.stringify({ startTime: null, endTime: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Try JSON-LD structured data first (fast, accurate, no Claude cost)
    const fromJsonLd = extractFromJsonLd(html);
    if (fromJsonLd?.startTime) {
      return new Response(JSON.stringify(fromJsonLd), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Try meta tags
    const fromMeta = extractFromMeta(html);
    if (fromMeta?.startTime) {
      return new Response(JSON.stringify(fromMeta), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Fall back to Claude on the visible text (handles non-standard platforms)
    const pageText = htmlToText(html).slice(0, 5000);
    if (!pageText.trim()) {
      return new Response(JSON.stringify({ startTime: null, endTime: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) throw new Error("ANTHROPIC_API_KEY not configured");

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 80,
        messages: [
          {
            role: "user",
            content: `Extract the event start and end time from this text. Return ONLY JSON: {"startTime":"HH:MM","endTime":"HH:MM"} in 24-hour format. If only a start time exists set endTime 2 hours later. If no time found return {"startTime":null,"endTime":null}. No other text.\n\n${pageText}`,
          },
        ],
      }),
    });

    if (!claudeRes.ok) throw new Error(`Claude error ${claudeRes.status}`);

    const claudeData = await claudeRes.json();
    const raw: string = claudeData.content?.[0]?.text ?? "{}";

    let result: { startTime: string | null; endTime: string | null };
    try {
      result = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      result = m ? JSON.parse(m[0]) : { startTime: null, endTime: null };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("get-event-time error:", err);
    return new Response(JSON.stringify({ startTime: null, endTime: null }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
