export interface MatchableEventFields {
  title?: string | null;
  description?: string | null;
  event_type?: string | null;
  organization?: string | null;
}

export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Career & Professional Development": [
    "career",
    "job",
    "internship",
    "resume",
    "linkedin",
    "network",
    "employer",
    "career planning",
  ],
  "Wellness & Mental Health": [
    "wellness",
    "mental",
    "therapy",
    "stress",
    "health",
    "mindfulness",
    "support",
    "care",
  ],
  "Workshops & Skill Building": [
    "workshop",
    "training",
    "learn",
    "skillsets",
    "tutorial",
    "seminar",
    "session",
  ],
  "Social & Community Events": ["social", "community", "mixer", "connect", "meetup", "hangout"],
  "Arts & Creative Activities": ["art", "creative", "crochet", "craft", "design", "music", "painting"],
  "Academic Support & Research": ["research", "library", "thesis", "citation", "academic", "phd", "study"],
  "International Student Services": ["international", "immigration", "iss", "visa", "global", "orientation"],
  "Leadership & Personal Growth": ["leadership", "mindset", "growth", "development", "imposter"],
};

export function stripHtmlForMatching(html?: string | null) {
  return (html ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeMatchText(input?: string | null) {
  return (input ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildEventMatchText(event: MatchableEventFields) {
  return normalizeMatchText(
    `${event.title ?? ""} ${stripHtmlForMatching(event.description)} ${event.event_type ?? ""} ${event.organization ?? ""}`
  );
}

export function matchesInterest(interestName: string, event: MatchableEventFields) {
  const keywords = CATEGORY_KEYWORDS[interestName] ?? [];
  if (!keywords.length) return false;

  const text = buildEventMatchText(event);
  return keywords.some((keyword) => text.includes(normalizeMatchText(keyword)));
}
