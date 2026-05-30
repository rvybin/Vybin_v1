import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { escapeHtml } from "../_shared/validate.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// All arguments must already be HTML-safe (no user input)
function htmlPage(title: string, message: string, color: string) {
  const icon = color === "#16a34a" ? "&#10003;" : "&#10005;";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;">
  <div style="text-align:center;max-width:400px;padding:40px 24px;">
    <div style="width:64px;height:64px;border-radius:50%;background:${escapeHtml(color)};display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:28px;">
      ${icon}
    </div>
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111;">${escapeHtml(title)}</h1>
    <p style="margin:0;font-size:15px;color:#666;line-height:1.6;">${escapeHtml(message)}</p>
    <p style="margin:24px 0 0;font-size:12px;color:#aaa;">Vybin Admin</p>
  </div>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  try {
    // IP-based rate limit: 20 review actions per hour per IP (brute-force protection on secret)
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rl = await checkRateLimit(`review-event:ip:${clientIp}`, 20, 3600);
    if (!rl.allowed) {
      return new Response(htmlPage("Too Many Requests", "Please slow down.", "#888"), {
        status: 429,
        headers: { "Content-Type": "text/html", "Retry-After": String(rl.retryAfterSec) },
      });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const action = url.searchParams.get("action");
    const secret = url.searchParams.get("secret");
    const adminSecret = Deno.env.get("ADMIN_REVIEW_SECRET") ?? "";

    if (!id || !action || secret !== adminSecret) {
      return new Response(htmlPage("Invalid Link", "This link is invalid or has expired.", "#dc2626"), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const { data: submission, error } = await supabase
      .from("event_submissions")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !submission) {
      return new Response(htmlPage("Not Found", "This submission could not be found.", "#dc2626"), {
        headers: { "Content-Type": "text/html" },
      });
    }

    if (submission.status !== "pending") {
      return new Response(htmlPage("Already Reviewed", `This event was already ${submission.status}.`, "#888"), {
        headers: { "Content-Type": "text/html" },
      });
    }

    if (action === "approve") {
      const { error: insertError } = await supabase.from("events").insert({
        title: submission.title,
        description: submission.description ?? null,
        date: submission.date,
        deadline: submission.deadline ?? null,
        location: submission.location ?? null,
        organization: submission.organization,
        event_type: submission.event_type ?? null,
        tags: submission.tags ?? null,
        image_url: submission.image_url ?? null,
        link: submission.link ?? null,
        prize: submission.prize ?? null,
        category: null,
      });

      if (insertError) {
        console.error("Insert error:", insertError);
        return new Response(htmlPage("Error", "Failed to publish the event. Check logs.", "#dc2626"), {
          headers: { "Content-Type": "text/html" },
        });
      }

      await supabase
        .from("event_submissions")
        .update({ status: "approved" })
        .eq("id", id);

      return new Response(
        htmlPage("Event Published!", `"${submission.title ?? ""}" by ${submission.organization ?? ""} is now live on Vybin.`, "#16a34a"),
        { headers: { "Content-Type": "text/html" } }
      );
    }

    if (action === "reject") {
      await supabase
        .from("event_submissions")
        .update({ status: "rejected" })
        .eq("id", id);

      return new Response(
        htmlPage("Event Rejected", `"${submission.title ?? ""}" has been rejected and will not be published.`, "#dc2626"),
        { headers: { "Content-Type": "text/html" } }
      );
    }

    return new Response(htmlPage("Invalid Action", "Unknown action.", "#888"), {
      headers: { "Content-Type": "text/html" },
    });
  } catch (err: any) {
    console.error("review-event error:", err);
    return new Response(htmlPage("Error", err?.message ?? "Something went wrong.", "#dc2626"), {
      headers: { "Content-Type": "text/html" },
    });
  }
});
