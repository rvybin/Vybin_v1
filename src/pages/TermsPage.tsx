import { useEffect } from "react";
import { LegalPageLayout } from "../components/LegalPageLayout";

const termsSections = [
  {
    heading: "1. Introduction",
    paragraphs: [
      "These Terms of Service (“Terms”) constitute a legally binding agreement between you (“User”, “you”, or “your”) and Vybin (“Vybin”, “we”, “us”, or “our”).",
      "Vybin operates an online platform that helps university students discover campus events, save events, and track applications in one place.",
      "By creating an account, accessing, or using Vybin, you confirm that you have read, understood, and agree to be bound by these Terms.",
      "If you do not agree to these Terms, you must stop using the platform.",
    ],
  },
  {
    heading: "2. Description of the Platform",
    paragraphs: [
      "Vybin is an event discovery and organization platform designed primarily for university students.",
      "The platform allows users to:",
    ],
    bullets: [
      "discover university events",
      "save events",
      "track applications",
      "access links to external event pages",
    ],
    closing:
      "Vybin does not organize, host, or manage third-party events listed on the platform and does not guarantee the accuracy, completeness, or availability of event information.",
  },
  {
    heading: "3. Eligibility",
    paragraphs: [
      "To use Vybin, you must be at least 16 years old and capable of entering into a binding agreement.",
    ],
  },
  {
    heading: "4. User Accounts",
    paragraphs: [
      "You agree to provide accurate account information, keep your login credentials secure, and remain responsible for activity under your account.",
    ],
  },
  {
    heading: "5. User Conduct",
    paragraphs: ["You agree not to use Vybin to:"],
    bullets: [
      "violate any laws or regulations",
      "upload malicious software or disrupt the platform",
      "impersonate another person or organization",
      "misrepresent event information",
      "attempt to access restricted parts of the platform",
    ],
  },
  {
    heading: "6. Third-Party Content and Links",
    paragraphs: [
      "Vybin may display events or links to third-party websites. These sites are not controlled by Vybin, and we are not responsible for their content, accuracy, or availability.",
    ],
  },
  {
    heading: "7. Intellectual Property",
    paragraphs: [
      "All branding, logos, interface elements, software, and platform content are owned by Vybin or its licensors and may not be copied, reproduced, or distributed without permission.",
    ],
  },
  {
    heading: "8. Privacy",
    paragraphs: [
      "Your use of Vybin is also governed by our Privacy Policy, which explains how we collect, use, and protect your information.",
    ],
  },
  {
    heading: "9. Limitation of Liability",
    paragraphs: [
      "Vybin is provided on an “as is” and “as available” basis. To the maximum extent permitted by law, Vybin is not liable for inaccurate event information, missed deadlines, or damages resulting from your use of the platform.",
    ],
  },
  {
    heading: "10. Termination",
    paragraphs: [
      "We may suspend or terminate access to Vybin if you violate these Terms or misuse the platform.",
    ],
  },
  {
    heading: "11. Changes to These Terms",
    paragraphs: [
      "We may update these Terms from time to time. Continued use of Vybin after changes are posted means you accept the updated Terms.",
    ],
  },
  {
    heading: "12. Governing Law",
    paragraphs: [
      "These Terms are governed by the laws of the Province of Québec and the federal laws of Canada applicable therein.",
    ],
  },
  {
    heading: "13. Contact",
    paragraphs: [
      "Vybin",
      "Email: vybinorg@gmail.com",
      "Location: Montréal, Québec, Canada",
    ],
  },
];

export function TermsPage() {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  return (
    <LegalPageLayout title="Terms of Service">
      {termsSections.map((section) => (
        <section key={section.heading} className="space-y-4">
          <h2 className="text-xl font-semibold text-white">{section.heading}</h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {section.bullets ? (
            <ul className="list-disc space-y-2 pl-6 text-white/75">
              {section.bullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          {section.closing ? <p>{section.closing}</p> : null}
        </section>
      ))}
    </LegalPageLayout>
  );
}
