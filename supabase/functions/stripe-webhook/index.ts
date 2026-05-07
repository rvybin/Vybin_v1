import Stripe from "npm:stripe@14";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

function welcomeEmail(name: string, email: string, nextBilling: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to Vybin Premium</title>
</head>
<body style="margin:0;padding:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:500px;margin:40px auto;padding:0 16px 40px;">

    <!-- Header -->
    <div style="background:#ED1B2F;border-radius:16px 16px 0 0;padding:28px 40px;text-align:center;">
      <span style="color:white;font-size:28px;font-weight:800;letter-spacing:-0.5px;">vybin</span>
    </div>

    <!-- Card -->
    <div style="background:#ffffff;border-radius:0 0 16px 16px;padding:36px 40px;box-shadow:0 4px 16px rgba(0,0,0,0.06);">

      <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111;">Welcome to Premium, ${name}!</h1>
      <p style="margin:0 0 28px;font-size:14px;color:#666;line-height:1.6;">Your Vybin Premium subscription is now active.</p>

      <!-- Features -->
      <div style="background:#fafafa;border-radius:12px;padding:18px 20px;margin-bottom:28px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="width:20px;vertical-align:top;padding-bottom:14px;">
              <span style="color:#ED1B2F;font-weight:700;font-size:15px;">✓</span>
            </td>
            <td style="padding-bottom:14px;padding-left:10px;">
              <strong style="color:#111;font-size:13px;display:block;">AI Assistant</strong>
              <span style="color:#777;font-size:13px;">Ask anything about McGill campus life, events and courses.</span>
            </td>
          </tr>
          <tr>
            <td style="width:20px;vertical-align:top;">
              <span style="color:#ED1B2F;font-weight:700;font-size:15px;">✓</span>
            </td>
            <td style="padding-left:10px;">
              <strong style="color:#111;font-size:13px;display:block;">Class Schedule Planner</strong>
              <span style="color:#777;font-size:13px;">Upload your McGill timetable and your weekly schedule populates instantly.</span>
            </td>
          </tr>
        </table>
      </div>

      <!-- Receipt -->
      <table style="width:100%;border-collapse:collapse;border:1px solid #efefef;border-radius:12px;overflow:hidden;margin-bottom:28px;">
        <tr style="border-bottom:1px solid #efefef;">
          <td style="padding:13px 18px;color:#888;font-size:13px;">Plan</td>
          <td style="padding:13px 18px;color:#111;font-size:13px;font-weight:600;text-align:right;">Vybin Premium</td>
        </tr>
        <tr style="border-bottom:1px solid #efefef;">
          <td style="padding:13px 18px;color:#888;font-size:13px;">Amount</td>
          <td style="padding:13px 18px;color:#111;font-size:13px;font-weight:600;text-align:right;">CA$10.00 / month</td>
        </tr>
        <tr style="border-bottom:1px solid #efefef;">
          <td style="padding:13px 18px;color:#888;font-size:13px;">Billed to</td>
          <td style="padding:13px 18px;color:#111;font-size:13px;font-weight:600;text-align:right;">${email}</td>
        </tr>
        <tr>
          <td style="padding:13px 18px;color:#888;font-size:13px;">Next billing date</td>
          <td style="padding:13px 18px;color:#111;font-size:13px;font-weight:600;text-align:right;">${nextBilling}</td>
        </tr>
      </table>

      <p style="margin:0 0 6px;font-size:13px;color:#aaa;">Manage or cancel your subscription at <a href="https://vybin.org" style="color:#ED1B2F;text-decoration:none;">vybin.org</a> under Profile.</p>
      <p style="margin:0;font-size:13px;color:#aaa;">Questions? Reply to this email anytime.</p>
    </div>

    <!-- Footer -->
    <p style="text-align:center;margin:20px 0 0;font-size:12px;color:#bbb;">
      Vybin · <a href="https://vybin.org" style="color:#bbb;text-decoration:none;">vybin.org</a> · Made for McGill students
    </p>
  </div>
</body>
</html>`;
}

async function sendWelcomeEmail(toEmail: string, name: string, nextBilling: string) {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("FROM_EMAIL") ?? "Vybin <hello@vybin.org>";
  if (!resendKey) {
    console.warn("RESEND_API_KEY not set — skipping welcome email");
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: toEmail,
      subject: "You're now a Vybin Premium member 🎉",
      html: welcomeEmail(name, toEmail, nextBilling),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Resend error:", err);
  }
}

Deno.serve(async (req: Request) => {
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      sig!,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return new Response(`Webhook error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (!userId) break;

        await supabase
          .from("profiles")
          .update({
            is_premium: true,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
          } as any)
          .eq("id", userId);

        // Get billing date from subscription
        let nextBilling = "in ~1 month";
        try {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          nextBilling = new Date(sub.current_period_end * 1000).toLocaleDateString("en-US", {
            year: "numeric", month: "long", day: "numeric",
          });
        } catch {}

        // Get user email + name
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, display_name")
          .eq("id", userId)
          .maybeSingle();

        const email =
          (profile as any)?.email ||
          session.customer_details?.email ||
          "";
        const name = (profile as any)?.display_name || email.split("@")[0] || "there";

        if (email) {
          await sendWelcomeEmail(email, name, nextBilling);
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const isActive = sub.status === "active" || sub.status === "trialing";
        await supabase
          .from("profiles")
          .update({ is_premium: isActive } as any)
          .eq("stripe_customer_id" as any, sub.customer as string);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await supabase
          .from("profiles")
          .update({ is_premium: false, stripe_subscription_id: null } as any)
          .eq("stripe_customer_id" as any, sub.customer as string);
        break;
      }
    }
  } catch (err: any) {
    console.error("Webhook handler error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
