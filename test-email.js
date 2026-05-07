const TO_EMAIL = "vyasrohan07@gmail.com";

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:500px;margin:40px auto;padding:0 16px 40px;">

    <div style="background:#ED1B2F;border-radius:16px 16px 0 0;padding:28px 40px;text-align:center;">
      <span style="color:white;font-size:28px;font-weight:800;letter-spacing:-0.5px;">vybin</span>
    </div>

    <div style="background:#ffffff;border-radius:0 0 16px 16px;padding:36px 40px;box-shadow:0 4px 16px rgba(0,0,0,0.06);">

      <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111;">Welcome to Premium, Rohan!</h1>
      <p style="margin:0 0 28px;font-size:14px;color:#666;line-height:1.6;">Your Vybin Premium subscription is now active.</p>

      <div style="background:#fafafa;border-radius:12px;padding:18px 20px;margin-bottom:28px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="width:24px;vertical-align:top;padding-bottom:14px;">
              <span style="color:#ED1B2F;font-weight:700;font-size:15px;">&#10003;</span>
            </td>
            <td style="padding-bottom:14px;padding-left:10px;">
              <strong style="color:#111;font-size:13px;display:block;">AI Assistant</strong>
              <span style="color:#777;font-size:13px;">Ask anything about McGill campus life, events and courses.</span>
            </td>
          </tr>
          <tr>
            <td style="width:24px;vertical-align:top;">
              <span style="color:#ED1B2F;font-weight:700;font-size:15px;">&#10003;</span>
            </td>
            <td style="padding-left:10px;">
              <strong style="color:#111;font-size:13px;display:block;">Class Schedule Planner</strong>
              <span style="color:#777;font-size:13px;">Upload your McGill timetable and your weekly schedule populates instantly.</span>
            </td>
          </tr>
        </table>
      </div>

      <table style="width:100%;border-collapse:collapse;border:1px solid #efefef;border-radius:12px;margin-bottom:28px;">
        <tr>
          <td style="padding:13px 18px;color:#888;font-size:13px;border-bottom:1px solid #efefef;width:50%;">Plan</td>
          <td style="padding:13px 18px;color:#111;font-size:13px;font-weight:600;text-align:right;border-bottom:1px solid #efefef;">Vybin Premium</td>
        </tr>
        <tr>
          <td style="padding:13px 18px;color:#888;font-size:13px;border-bottom:1px solid #efefef;">Amount</td>
          <td style="padding:13px 18px;color:#111;font-size:13px;font-weight:600;text-align:right;border-bottom:1px solid #efefef;">CA$10.00 / month</td>
        </tr>
        <tr>
          <td style="padding:13px 18px;color:#888;font-size:13px;border-bottom:1px solid #efefef;">Billed to</td>
          <td style="padding:13px 18px;color:#111;font-size:13px;font-weight:600;text-align:right;border-bottom:1px solid #efefef;">${TO_EMAIL}</td>
        </tr>
        <tr>
          <td style="padding:13px 18px;color:#888;font-size:13px;">Next billing date</td>
          <td style="padding:13px 18px;color:#111;font-size:13px;font-weight:600;text-align:right;">June 6, 2026</td>
        </tr>
      </table>

      <p style="margin:0 0 6px;font-size:13px;color:#aaa;">Manage or cancel your subscription anytime under Profile in the app.</p>
      <p style="margin:0;font-size:13px;color:#aaa;">Questions? Reply to this email anytime.</p>
    </div>

    <p style="text-align:center;margin:20px 0 0;font-size:12px;color:#bbb;">
      Vybin &middot; <a href="https://vybin.org" style="color:#bbb;text-decoration:none;">vybin.org</a> &middot; Made for McGill students
    </p>
  </div>
</body>
</html>`;

fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    "Authorization": "Bearer re_HNgSq9rK_FaMsnd1R7jB5Um4gVNsUuNPZ",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    from: "Vybin <hello@vybin.org>",
    to: TO_EMAIL,
    subject: `You're now a Vybin Premium member 🎉 [${Date.now()}]`,
    html,
  }),
})
  .then((r) => r.json())
  .then((data) => {
    if (data.id) console.log("Email sent! Check inbox.");
    else console.error("Error:", data);
  })
  .catch((err) => console.error("Error:", err));
