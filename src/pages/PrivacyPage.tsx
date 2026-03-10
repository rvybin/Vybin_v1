import { LegalPageLayout } from "../components/LegalPageLayout";

const privacySections = [
  {
    heading: "1. Who We Are",
    paragraphs: [
      "Vybin is an event discovery platform designed for university students.",
      "Contact: vyasrohan07@gmail.com",
      "Location: Montréal, Québec, Canada",
    ],
  },
  {
    heading: "2. Information We Collect",
    paragraphs: [
      "We collect only the information necessary to operate Vybin, including:",
    ],
    bullets: [
      "account information such as name and email address",
      "profile information such as photo and preferences",
      "events you save",
      "events you apply to",
      "technical information such as browser, device, and IP address",
    ],
  },
  {
    heading: "3. How We Use Information",
    paragraphs: ["We use information to:"],
    bullets: [
      "create and manage your account",
      "personalize your event feed",
      "let you save and track events",
      "improve performance, recommendations, and security",
      "send essential account or platform updates",
    ],
  },
  {
    heading: "4. Third-Party Services",
    paragraphs: [
      "Vybin may use trusted third-party providers such as Supabase for authentication, database, and backend services, along with hosting and analytics providers.",
    ],
  },
  {
    heading: "5. Sharing of Information",
    paragraphs: [
      "We do not sell your personal information.",
      "We may share information only with service providers, for legal compliance, or for platform safety and security.",
    ],
  },
  {
    heading: "6. International Data Transfers",
    paragraphs: [
      "Some service providers may process or store data outside Canada, including in the United States.",
    ],
  },
  {
    heading: "7. Your Rights",
    paragraphs: [
      "You may request access, correction, or deletion of your information, subject to legal requirements.",
      "To make a request, email vyasrohan07@gmail.com.",
    ],
  },
  {
    heading: "8. Cookies",
    paragraphs: [
      "Vybin may use cookies or similar technologies for login sessions, security, and analytics.",
    ],
  },
  {
    heading: "9. Data Retention",
    paragraphs: [
      "We retain personal information only as long as needed for platform operation and legal obligations.",
    ],
  },
  {
    heading: "10. Security",
    paragraphs: [
      "We use reasonable safeguards to protect your information, but no system can guarantee absolute security.",
    ],
  },
  {
    heading: "11. Changes to this Policy",
    paragraphs: [
      "We may update this Privacy Policy from time to time. Continued use of Vybin after updates means you accept the revised policy.",
    ],
  },
  {
    heading: "12. Language / Langue",
    paragraphs: [
      "The parties acknowledge that they have required that this Privacy Policy and all related documents be prepared in English.",
      "Les parties reconnaissent avoir exigé que la présente politique de confidentialité et tous les documents connexes soient rédigés en anglais.",
    ],
  },
  {
    heading: "13. Contact",
    paragraphs: [
      "Vybin",
      "Email: vyasrohan07@gmail.com",
      "Location: Montréal, Québec, Canada",
    ],
  },
];

export function PrivacyPage() {
  return (
    <LegalPageLayout title="Privacy Policy">
      {privacySections.map((section) => (
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
        </section>
      ))}
    </LegalPageLayout>
  );
}
