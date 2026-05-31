import { useEffect } from "react";
import { LegalPageLayout } from "../components/LegalPageLayout";

const EFFECTIVE_DATE = "May 31, 2026";

const privacySections = [
  {
    heading: "1. Who We Are",
    body: [
      {
        type: "p" as const,
        text: "Vybin is a student platform built for university students in Montréal and beyond. This Privacy Policy explains what personal information we collect, how we use it, and your rights under applicable Canadian privacy law — including the Personal Information Protection and Electronic Documents Act (PIPEDA) and Québec Law 25.",
      },
      {
        type: "contact" as const,
        lines: ["Vybin", "Email: hello@vybin.org", "Montréal, Québec, Canada"],
      },
    ],
  },
  {
    heading: "2. Information We Collect",
    body: [
      { type: "p" as const, text: "We collect only information necessary to operate Vybin:" },
      {
        type: "ul" as const,
        items: [
          "Account information — name, email address, and password (managed by Supabase Auth)",
          "Profile information — display name, profile photo, university, and interest preferences",
          "Activity data — events you save, applications you track, and preferences you set",
          "Class schedule data — timetable images you upload and the extracted schedule entries",
          "AI interaction data — messages you send to the AI Assistant and job descriptions submitted to the Resume Optimizer",
          "Push notification subscriptions — browser endpoint, encryption keys (p256dh and auth) used to deliver notifications",
          "Payment information — subscription status and Stripe customer/subscription IDs (we never store card numbers)",
          "Technical data — IP address, browser type, device type, and usage logs",
        ],
      },
    ],
  },
  {
    heading: "3. How We Use Information",
    body: [
      { type: "p" as const, text: "We use the information we collect to:" },
      {
        type: "ul" as const,
        items: [
          "Create and manage your account and authenticate you securely",
          "Personalize your event feed based on your interests",
          "Process timetable images through AI (Claude by Anthropic) to generate your class schedule",
          "Power the AI Assistant to answer your questions about campus life and events",
          "Analyse your resume against job descriptions and provide AI-generated improvement suggestions",
          "Send class reminders and platform updates via push notifications (only if you opt in)",
          "Process and manage your Premium subscription via Stripe",
          "Send transactional emails — such as subscription confirmation and cancellation notices — via Resend",
          "Improve platform performance, security, and recommendations",
          "Comply with applicable legal obligations",
        ],
      },
    ],
  },
  {
    heading: "4. AI Processing",
    body: [
      {
        type: "p" as const,
        text: "Vybin uses Claude, an AI model developed by Anthropic, to power the AI Assistant, extract class schedules from uploaded images, and analyse resumes. When you use these features:",
      },
      {
        type: "ul" as const,
        items: [
          "Your messages, uploaded images, and job descriptions are sent to Anthropic's API for processing",
          "Anthropic processes this data as a data processor on our behalf, subject to their data usage policies",
          "We do not use your personal data to train Anthropic's models",
          "AI responses are not stored permanently — only the inputs and outputs needed to serve your request are transmitted",
        ],
      },
      {
        type: "p" as const,
        text: "You can review Anthropic's privacy practices at anthropic.com.",
      },
    ],
  },
  {
    heading: "5. Third-Party Service Providers",
    body: [
      {
        type: "p" as const,
        text: "We share data with trusted providers solely to operate Vybin:",
      },
      {
        type: "ul" as const,
        items: [
          "Supabase (US) — authentication, database storage, file storage, and edge functions",
          "Anthropic (US) — AI processing for the AI Assistant, Schedule Planner, and Resume Optimizer",
          "Stripe (US) — payment processing and subscription management",
          "Resend (US) — transactional email delivery (subscription confirmation, cancellation)",
        ],
      },
      {
        type: "p" as const,
        text: "We do not sell your personal information to any third party.",
      },
    ],
  },
  {
    heading: "6. International Data Transfers",
    body: [
      {
        type: "p" as const,
        text: "Some of our service providers are located in the United States. By using Vybin, you consent to the transfer of your information to the US for processing, subject to appropriate safeguards. We enter into data processing agreements with providers to ensure your data is handled in compliance with applicable privacy law.",
      },
    ],
  },
  {
    heading: "7. Push Notifications",
    body: [
      {
        type: "p" as const,
        text: "If you enable push notifications, we store your browser's push subscription details (endpoint URL, p256dh key, auth key) in our database linked to your account. This data is used solely to deliver your requested notifications. You may revoke permission at any time through your browser settings or Vybin Profile, which deletes your subscription from our system.",
      },
    ],
  },
  {
    heading: "8. Payment Data",
    body: [
      {
        type: "p" as const,
        text: "Vybin Premium payments are handled entirely by Stripe. We store only your Stripe customer ID and subscription ID — never your card number, CVV, or banking details. For Stripe's data practices, see stripe.com/privacy.",
      },
    ],
  },
  {
    heading: "9. Data Retention",
    body: [
      {
        type: "p" as const,
        text: "We retain your personal information for as long as your account is active or as needed to provide services. If you delete your account, we delete your personal data within 30 days, except where retention is required by law (e.g., billing records). Uploaded timetable images are retained for 90 days and then automatically deleted.",
      },
    ],
  },
  {
    heading: "10. Your Rights",
    body: [
      {
        type: "p" as const,
        text: "Under PIPEDA and Québec Law 25, you have the right to:",
      },
      {
        type: "ul" as const,
        items: [
          "Access the personal information we hold about you",
          "Request correction of inaccurate information",
          "Request deletion of your account and personal data",
          "Withdraw consent for optional data uses (e.g., push notifications)",
          "Receive a copy of your data in a portable format (data portability)",
          "Lodge a complaint with the Office of the Privacy Commissioner of Canada (OPC)",
        ],
      },
      {
        type: "p" as const,
        text: "To exercise any of these rights, contact us at hello@vybin.org. We will respond within 30 days.",
      },
    ],
  },
  {
    heading: "11. Cookies & Local Storage",
    body: [
      {
        type: "p" as const,
        text: "Vybin uses browser cookies and local storage to maintain your login session and remember your preferences. We do not use third-party advertising cookies or tracking pixels. You may clear cookies through your browser settings, which may log you out of Vybin.",
      },
    ],
  },
  {
    heading: "12. Security",
    body: [
      {
        type: "p" as const,
        text: "We use industry-standard safeguards to protect your information — including encrypted storage, HTTPS-only connections, row-level security policies, and rate limiting on all API endpoints. No system can guarantee absolute security, and you use Vybin at your own risk.",
      },
    ],
  },
  {
    heading: "13. Children's Privacy",
    body: [
      {
        type: "p" as const,
        text: "Vybin is not directed at children under 16. We do not knowingly collect personal information from anyone under 16. If you believe a minor has provided us with personal data, contact us and we will delete it promptly.",
      },
    ],
  },
  {
    heading: "14. Changes to this Policy",
    body: [
      {
        type: "p" as const,
        text: "We may update this Privacy Policy to reflect changes in our practices or applicable law. Material changes will be communicated through in-app notice or email. Continued use of Vybin after the effective date of any update constitutes acceptance of the revised policy.",
      },
    ],
  },
  {
    heading: "15. Language / Langue",
    body: [
      {
        type: "p" as const,
        text: "The parties acknowledge that they have required that this Privacy Policy and all related documents be prepared in English.",
      },
      {
        type: "p" as const,
        text: "Les parties reconnaissent avoir exigé que la présente politique de confidentialité et tous les documents connexes soient rédigés en anglais.",
      },
    ],
  },
  {
    heading: "16. Contact",
    body: [
      {
        type: "p" as const,
        text: "For privacy inquiries, data access requests, or complaints, please contact us:",
      },
      {
        type: "contact" as const,
        lines: ["Vybin — Privacy", "Email: hello@vybin.org", "Montréal, Québec, Canada"],
      },
    ],
  },
];

type SectionBody =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "contact"; lines: string[] };

export function PrivacyPage() {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  return (
    <LegalPageLayout title="Privacy Policy" effectiveDate={EFFECTIVE_DATE}>
      {privacySections.map((section) => (
        <section key={section.heading} className="space-y-3">
          <h2 className="text-lg font-bold text-white">{section.heading}</h2>
          {(section.body as SectionBody[]).map((block, i) => {
            if (block.type === "p") {
              return <p key={i} className="text-[15px] leading-7 text-white/75">{block.text}</p>;
            }
            if (block.type === "ul") {
              return (
                <ul key={i} className="space-y-1.5 pl-5">
                  {block.items.map((item) => (
                    <li key={item} className="flex gap-2 text-[15px] leading-7 text-white/70">
                      <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#ED1B2F]" />
                      {item}
                    </li>
                  ))}
                </ul>
              );
            }
            if (block.type === "contact") {
              return (
                <div key={i} className="rounded-xl border border-white/10 bg-white/5 px-5 py-4 space-y-1">
                  {block.lines.map((line) => (
                    <p key={line} className="text-[14px] text-white/70">{line}</p>
                  ))}
                </div>
              );
            }
            return null;
          })}
        </section>
      ))}
    </LegalPageLayout>
  );
}
