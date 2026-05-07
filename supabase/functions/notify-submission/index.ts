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

    const { submissionId } = await req.json();
    if (!submissionId) {
      return new Response(JSON.stringify({ error: "submissionId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: submission, error } = await supabase
      .from("event_submissions")
      .select("*")
      .eq("id", submissionId)
      .maybeSingle();

    if (error || !submission) {
      return new Response(JSON.stringify({ error: "Submission not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const secret = Deno.env.get("ADMIN_REVIEW_SECRET") ?? "";
    const fnUrl = Deno.env.get("SUPABASE_URL")!.replace("/rest/v1", "") + "/functions/v1/review-event";
    const approveUrl = `${fnUrl}?id=${submissionId}&action=approve&secret=${encodeURIComponent(secret)}`;
    const rejectUrl = `${fnUrl}?id=${submissionId}&action=reject&secret=${encodeURIComponent(secret)}`;

    const date = submission.date
      ? new Date(submission.date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })
      : "Not specified";

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:540px;margin:40px auto;padding:0 16px 40px;">
    <div style="background:#ED1B2F;border-radius:16px 16px 0 0;padding:24px 40px;text-align:center;">
      <span style="color:white;font-size:26px;font-weight:800;letter-spacing:-0.5px;">vybin</span>
      <p style="color:rgba(255,255,255,0.85);margin:4px 0 0;font-size:13px;">New event submission for your review</p>
    </div>
    <div style="background:#fff;border-radius:0 0 16px 16px;padding:36px 40px;box-shadow:0 4px 16px rgba(0,0,0,0.06);">

      <h2 style="margin:0 0 4px;font-size:20px;font-weight:800;color:#111;">${submission.title}</h2>
      <p style="margin:0 0 24px;font-size:13px;color:#888;">Submitted by ${submission.organization}</p>

      <table style="width:100%;border-collapse:collapse;border:1px solid #efefef;border-radius:12px;margin-bottom:24px;">
        <tr style="border-bottom:1px solid #efefef;">
          <td style="padding:11px 16px;color:#888;font-size:13px;width:40%;">Organization</td>
          <td style="padding:11px 16px;color:#111;font-size:13px;font-weight:600;">${submission.organization}</td>
        </tr>
        <tr style="border-bottom:1px solid #efefef;">
          <td style="padding:11px 16px;color:#888;font-size:13px;">Date</td>
          <td style="padding:11px 16px;color:#111;font-size:13px;font-weight:600;">${date}</td>
        </tr>
        <tr style="border-bottom:1px solid #efefef;">
          <td style="padding:11px 16px;color:#888;font-size:13px;">Location</td>
          <td style="padding:11px 16px;color:#111;font-size:13px;font-weight:600;">${submission.location ?? "Not specified"}</td>
        </tr>
        <tr style="border-bottom:1px solid #efefef;">
          <td style="padding:11px 16px;color:#888;font-size:13px;">Type</td>
          <td style="padding:11px 16px;color:#111;font-size:13px;font-weight:600;">${submission.event_type ?? "Not specified"}</td>
        </tr>
        ${submission.link ? `<tr style="border-bottom:1px solid #efefef;"><td style="padding:11px 16px;color:#888;font-size:13px;">Link</td><td style="padding:11px 16px;font-size:13px;"><a href="${submission.link}" style="color:#ED1B2F;">${submission.link}</a></td></tr>` : ""}
        ${submission.tags?.length ? `<tr><td style="padding:11px 16px;color:#888;font-size:13px;">Tags</td><td style="padding:11px 16px;color:#111;font-size:13px;">${submission.tags.join(", ")}</td></tr>` : ""}
      </table>

      ${submission.description ? `
      <div style="background:#fafafa;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#aaa;text-transform:uppercase;letter-spacing:0.5px;">Description</p>
        <p style="margin:0;font-size:14px;color:#444;line-height:1.6;">${submission.description}</p>
      </div>` : ""}

      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding-right:8px;">
            <a href="${approveUrl}" style="display:block;background:#16a34a;color:white;text-align:center;padding:14px;border-radius:12px;font-size:15px;font-weight:700;text-decoration:none;">
              Approve & Publish
            </a>
          </td>
          <td style="padding-left:8px;">
            <a href="${rejectUrl}" style="display:block;background:#fff;color:#dc2626;text-align:center;padding:14px;border-radius:12px;font-size:15px;font-weight:700;text-decoration:none;border:2px solid #dc2626;">
              Reject
            </a>
          </td>
        </tr>
      </table>
    </div>
    <p style="text-align:center;margin:20px 0 0;font-size:12px;color:#bbb;">Vybin admin · <a href="https://vybin.org" style="color:#bbb;text-decoration:none;">vybin.org</a></p>
  </div>
</body>
</html>`;

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const adminEmail = Deno.env.get("ADMIN_EMAIL") ?? "vyasrohan07@gmail.com";

    if (resendKey) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Vybin <hello@vybin.org>",
          to: adminEmail,
          subject: `New event submission: ${submission.title} by ${submission.organization}`,
          html,
        }),
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("notify-submission error:", err);
    return new Response(JSON.stringify({ error: err?.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
