import { useEffect } from "react";
import { LegalPageLayout } from "../components/LegalPageLayout";

const EFFECTIVE_DATE = "May 31, 2026";

const termsSections = [
  {
    heading: "1. Introduction",
    body: [
      {
        type: "p" as const,
        text: 'These Terms of Service ("Terms") constitute a legally binding agreement between you ("User", "you", or "your") and Vybin ("Vybin", "we", "us", or "our"), operated from Montréal, Québec, Canada.',
      },
      {
        type: "p" as const,
        text: "By creating an account or using any part of Vybin, you confirm you have read, understood, and agree to be bound by these Terms. If you do not agree, you must stop using the platform immediately.",
      },
    ],
  },
  {
    heading: "2. Description of Services",
    body: [
      { type: "p" as const, text: "Vybin is a student platform for McGill University and other universities. Current features include:" },
      {
        type: "ul" as const,
        items: [
          "Event discovery — browse and save upcoming campus events",
          "Application tracking — track club and program applications",
          "AI Assistant — an AI-powered chat tool that answers questions about campus life, events, and academic resources",
          "Class Schedule Planner — upload a timetable screenshot to populate a visual weekly schedule with class reminders",
          "Resume Optimizer — AI-powered tool that compares your resume against a job description and suggests improvements",
          "Push Notifications — optional browser notifications for class reminders and platform updates",
        ],
      },
      {
        type: "p" as const,
        text: "Some features are available exclusively to Premium subscribers. Vybin does not organize, host, or manage third-party events and does not guarantee the accuracy, completeness, or availability of event information.",
      },
    ],
  },
  {
    heading: "3. Eligibility",
    body: [
      {
        type: "p" as const,
        text: "You must be at least 16 years old to use Vybin and capable of entering into a binding agreement. By using the platform you represent that you meet these requirements.",
      },
    ],
  },
  {
    heading: "4. User Accounts",
    body: [
      { type: "p" as const, text: "You agree to:" },
      {
        type: "ul" as const,
        items: [
          "Provide accurate and complete registration information",
          "Keep your login credentials secure and confidential",
          "Notify us promptly if you suspect unauthorized access to your account",
          "Take full responsibility for all activity that occurs under your account",
        ],
      },
      {
        type: "p" as const,
        text: "We reserve the right to suspend or terminate accounts that violate these Terms.",
      },
    ],
  },
  {
    heading: "5. Premium Subscriptions & Billing",
    body: [
      {
        type: "p" as const,
        text: "Certain features — including the AI Assistant, Class Schedule Planner, and Resume Optimizer — require a Vybin Premium subscription.",
      },
      { type: "p" as const, text: "By subscribing to Vybin Premium you agree that:" },
      {
        type: "ul" as const,
        items: [
          "Subscriptions are billed monthly at the current listed price (currently CA$4.99/month) and renew automatically until cancelled",
          "Payments are processed securely by Stripe. Vybin does not store your payment card details",
          "You may cancel your subscription at any time via your Profile settings. Access continues until the end of the current billing period",
          "All payments are non-refundable except where required by applicable law",
          "Prices may change with at least 30 days' notice to active subscribers",
        ],
      },
    ],
  },
  {
    heading: "6. AI Features & Limitations",
    body: [
      {
        type: "p" as const,
        text: "Vybin uses AI models (including Anthropic Claude) to power the AI Assistant, Schedule Planner OCR, and Resume Optimizer. By using these features you acknowledge:",
      },
      {
        type: "ul" as const,
        items: [
          "AI-generated responses may be inaccurate, incomplete, or outdated. Always verify important information through official sources",
          "The AI Assistant is not a substitute for professional academic, legal, medical, or financial advice",
          "Class schedules extracted from uploaded images may contain errors. You are responsible for verifying your actual timetable",
          "Resume suggestions are AI-generated and may not reflect current industry standards or specific employer requirements",
          "Your inputs (messages, uploaded images, job descriptions) may be processed by third-party AI providers to generate responses — see our Privacy Policy",
        ],
      },
    ],
  },
  {
    heading: "7. User-Uploaded Content",
    body: [
      {
        type: "p" as const,
        text: "When you upload content to Vybin (such as timetable screenshots or resume PDFs), you:",
      },
      {
        type: "ul" as const,
        items: [
          "Represent that you have the right to upload and use this content",
          "Grant Vybin a limited, non-exclusive license to process the content solely to provide the requested feature",
          "Acknowledge that uploaded files are stored securely on Supabase and processed through AI models as described in our Privacy Policy",
        ],
      },
      {
        type: "p" as const,
        text: "Do not upload content that you do not have permission to share, that contains personal information of others, or that violates any law.",
      },
    ],
  },
  {
    heading: "8. Push Notifications",
    body: [
      {
        type: "p" as const,
        text: "Vybin may send push notifications for class reminders and platform updates if you grant permission in your browser or device settings. You may withdraw consent at any time through your browser/device settings or your Vybin Profile. Revoking permission disables reminder delivery.",
      },
    ],
  },
  {
    heading: "9. User Conduct",
    body: [
      { type: "p" as const, text: "You agree not to:" },
      {
        type: "ul" as const,
        items: [
          "Violate any applicable law or regulation",
          "Upload malicious software or content designed to disrupt the platform",
          "Attempt to circumvent rate limits, access controls, or security measures",
          "Impersonate another person or misrepresent your affiliation",
          "Submit false or misleading event information",
          "Use the AI Assistant to generate harmful, illegal, or abusive content",
          "Resell or sublicense access to Premium features",
        ],
      },
    ],
  },
  {
    heading: "10. Third-Party Content and Links",
    body: [
      {
        type: "p" as const,
        text: "Vybin may display events or links to third-party websites and services. These external sites are not controlled by Vybin. We are not responsible for their content, accuracy, availability, or privacy practices. Visiting external links is at your own risk.",
      },
    ],
  },
  {
    heading: "11. Intellectual Property",
    body: [
      {
        type: "p" as const,
        text: "All branding, logos, interface elements, software, and platform content are owned by Vybin or its licensors and may not be copied, reproduced, or distributed without prior written permission.",
      },
    ],
  },
  {
    heading: "12. Privacy",
    body: [
      {
        type: "p" as const,
        text: "Your use of Vybin is governed by our Privacy Policy, which explains in detail how we collect, use, store, and protect your personal information — including data related to AI interactions, uploaded files, push subscriptions, and payment processing.",
      },
    ],
  },
  {
    heading: "13. Disclaimers",
    body: [
      {
        type: "p" as const,
        text: 'Vybin is provided on an "as is" and "as available" basis. We make no warranties — express or implied — regarding reliability, accuracy, or fitness for a particular purpose. Event information displayed on Vybin is sourced from third parties and may be inaccurate.',
      },
    ],
  },
  {
    heading: "14. Limitation of Liability",
    body: [
      {
        type: "p" as const,
        text: "To the maximum extent permitted by applicable law, Vybin, its operators, and affiliates shall not be liable for any indirect, incidental, special, or consequential damages — including missed deadlines, inaccurate AI responses, schedule extraction errors, or payment disputes — arising from your use of the platform.",
      },
    ],
  },
  {
    heading: "15. Termination",
    body: [
      {
        type: "p" as const,
        text: "We may suspend or terminate your access to Vybin at any time if you violate these Terms or misuse the platform, with or without notice. Upon termination, your right to use the platform ceases immediately. Premium subscription refunds upon termination are handled on a case-by-case basis in compliance with applicable consumer protection law.",
      },
    ],
  },
  {
    heading: "16. Changes to These Terms",
    body: [
      {
        type: "p" as const,
        text: "We may update these Terms from time to time. We will notify you of material changes by updating the effective date above or through in-app notice. Continued use of Vybin after changes are posted constitutes your acceptance of the revised Terms.",
      },
    ],
  },
  {
    heading: "17. Governing Law",
    body: [
      {
        type: "p" as const,
        text: "These Terms are governed by and construed in accordance with the laws of the Province of Québec and the federal laws of Canada applicable therein, without regard to conflict of law principles. Any disputes shall be resolved in the competent courts of Montréal, Québec.",
      },
    ],
  },
  {
    heading: "18. Contact",
    body: [
      {
        type: "p" as const,
        text: "If you have questions about these Terms, please contact us:",
      },
      {
        type: "contact" as const,
        lines: ["Vybin", "Email: hello@vybin.org", "Montréal, Québec, Canada"],
      },
    ],
  },
];

type SectionBody =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "contact"; lines: string[] };

export function TermsPage() {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  return (
    <LegalPageLayout title="Terms of Service" effectiveDate={EFFECTIVE_DATE}>
      {termsSections.map((section) => (
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
