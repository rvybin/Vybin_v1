// src/components/SavedTab.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { MapPin, Eye, Bookmark, Trash2 } from "lucide-react";
import { EventModal } from "./EventModal";
import { decodeText } from "../lib/text";

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_type: string | null;
  organization: string | null;
  location: string | null;
  date: string;
  image_url: string | null;
  prize: string | null;
  tags: string[] | null;
  link?: string | null;
  deadline?: string | null;
}

interface InterestRow {
  name: string;
  icon: string; // iconName from DB (e.g., "heart", "briefcase", etc.)
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Career & Professional Development": ["career", "job", "internship", "resume", "linkedin", "network", "employer", "career planning"],
  "Wellness & Mental Health": ["wellness", "mental", "therapy", "stress", "health", "mindfulness", "support", "care"],
  "Workshops & Skill Building": ["workshop", "training", "learn", "skillsets", "tutorial", "seminar", "session"],
  "Social & Community Events": ["social", "community", "mixer", "connect", "meetup", "hangout"],
  "International Student Services": ["international", "immigration", "iss", "visa", "global", "orientation"],
  "Leadership & Personal Growth": ["leadership", "mindset", "growth", "development", "imposter"],
};

const stripHTML = (html?: string | null) =>
  decodeText(html ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalize = (s?: string | null) =>
  (s ?? "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

// ✅ exactly 1 sentence, no ellipsis. If too long, hard-trim without adding "…".
function oneSentenceNoEllipsis(html: string | null, maxChars = 170) {
  const text = stripHTML(html);
  if (!text) return "";

  const parts = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const first = (parts[0] ?? text).trim();

  if (first.length <= maxChars) return first;

  const cut = first.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  const trimmed = (lastSpace > 70 ? cut.slice(0, lastSpace) : cut).trim();
  return trimmed.replace(/[,.!?;:]+$/, "");
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ✅ same emoji mapping as onboarding
function getIcon(iconName: string): string {
  const iconMap: Record<string, string> = {
    laptop: "💻",
    briefcase: "💼",
    palette: "🎨",
    megaphone: "📣",
    cog: "⚙️",
    brain: "🧠",
    rocket: "🚀",
    "dollar-sign": "💰",
    heart: "❤️",
    "graduation-cap": "🎓",
  };
  return iconMap[iconName] || "✨";
}

function pickCategory(ev: { title: string; description: string | null; event_type?: string | null; organization?: string | null }) {
  const text = normalize(`${stripHTML(ev.title)} ${stripHTML(ev.description)} ${ev.event_type ?? ""} ${stripHTML(ev.organization ?? "")}`);

  let bestName = "Social & Community Events";
  let bestHits = -1;

  for (const name of Object.keys(CATEGORY_KEYWORDS)) {
    const kws = CATEGORY_KEYWORDS[name] ?? [];
    let hits = 0;
    for (const kw of kws) if (text.includes(normalize(kw))) hits++;
    if (hits > bestHits) {
      bestHits = hits;
      bestName = name;
    }
  }

  return bestName;
}

export function SavedTab() {
  const { user } = useAuth();
  const [savedEvents, setSavedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [fadeIn, setFadeIn] = useState(false);

  // Map interest name -> iconName (from DB)
  const [interestIconMap, setInterestIconMap] = useState<Record<string, string>>({});

  const MCGILL_RED = "#ED1B2F";
  const LIGHT_BG = "#F6F7F9";

  const loadInterestIcons = async () => {
    try {
      const { data } = await supabase.from("interests").select("name, icon");
      const map: Record<string, string> = {};
      (data ?? []).forEach((r: any) => {
        const row = r as InterestRow;
        if (row?.name) map[row.name.trim().toLowerCase()] = (row.icon ?? "").trim();
      });
      setInterestIconMap(map);
    } catch (e) {
      console.error("Error loading interests icons:", e);
      setInterestIconMap({});
    }
  };

  const metaForCategory = (category: string) => {
    const key = category.trim().toLowerCase();
    const iconName = interestIconMap[key] || "rocket";
    const emoji = getIcon(iconName);

    const accent =
      category === "Wellness & Mental Health"
        ? "#E11D48"
        : category === "Career & Professional Development"
        ? "#2563EB"
        : category === "Workshops & Skill Building"
        ? "#F59E0B"
        : category === "International Student Services"
        ? "#14B8A6"
        : category === "Leadership & Personal Growth"
        ? "#22C55E"
        : "#8B5CF6";

    return { emoji, accent };
  };

  const fetchSavedEvents = async () => {
    if (!user) return;
    setLoading(true);
    setFadeIn(false);

    try {
      const { data: saved, error: savedErr } = await supabase.from("saved_events").select("event_id").eq("user_id", user.id);
      if (savedErr) throw savedErr;

      const eventIds = (saved ?? []).map((s: any) => s.event_id);
      if (!eventIds.length) {
        setSavedEvents([]);
        return;
      }

      const { data: events, error: eventsErr } = await supabase
        .from("events")
        .select("id, title, description, event_type, organization, location, date, image_url, prize, tags, link, deadline")
        .in("id", eventIds)
        .order("date", { ascending: true });

      if (eventsErr) throw eventsErr;

      setSavedEvents((events ?? []) as Event[]);
    } catch (err) {
      console.error("Error fetching saved events:", err);
      setSavedEvents([]);
    } finally {
      setLoading(false);
      setTimeout(() => setFadeIn(true), 60);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadInterestIcons();
    fetchSavedEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const openModal = (ev: Event) => {
    setSelectedEvent(ev);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedEvent(null), 220);
  };

  const removeSaved = async (eventId: string) => {
    if (!user) return;
    try {
      await supabase.from("saved_events").delete().eq("user_id", user.id).eq("event_id", eventId);
      setSavedEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch (err) {
      console.error("Failed to remove saved event:", err);
    }
  };

  const list = useMemo(() => savedEvents, [savedEvents]);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center h-64 text-black/70">Loading…</div>;
  }

  if (!list.length) {
    return (
      <div className="flex-1 px-5" style={{ background: LIGHT_BG }}>
        <div className="pt-6 max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-6 text-center">
            <Bookmark className="w-10 h-10 mx-auto mb-3" style={{ color: "rgba(0,0,0,0.35)" }} />
            <p className="font-semibold text-black">No saved events yet</p>
            <p className="text-sm text-black/60 mt-1">Tap the bookmark icon on any event to save it here.</p>
            <div className="mt-4 h-[2px] w-20 rounded-full mx-auto" style={{ background: MCGILL_RED }} />
          </div>
        </div>
      </div>
    );
  }

  const SavedRow = ({ ev }: { ev: Event }) => {
    const category = pickCategory(ev);
    const { emoji, accent } = metaForCategory(category);
    const hasImage = !!ev.image_url;

    return (
      <div className="group relative overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm transition hover:shadow-md">
        {/* Saved pill (top-left) */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1 rounded-full bg-white border border-black/10 px-3 py-1">
          <Bookmark className="w-4 h-4" style={{ color: MCGILL_RED }} />
          <span className="text-xs font-semibold" style={{ color: MCGILL_RED }}>
            Saved
          </span>
        </div>

        {/* Remove button (top-right) */}
        <button
          onClick={() => removeSaved(ev.id)}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white border border-black/10 hover:bg-black/5 transition"
          title="Remove"
        >
          <Trash2 className="w-4 h-4" style={{ color: "rgba(0,0,0,0.65)" }} />
        </button>

        <div className="flex flex-col sm:flex-row">
          {/* Left panel: image if available, else big emoji */}
          <div
            className="flex h-36 w-full items-center justify-center overflow-hidden sm:h-auto sm:w-52 sm:min-w-[208px]"
            style={{
              background: hasImage ? "#111827" : `linear-gradient(135deg, ${accent} 0%, rgba(237,27,47,0.16) 100%)`,
            }}
          >
            {hasImage ? (
              <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${ev.image_url})`, minHeight: 170 }} />
            ) : (
              <span className="text-5xl select-none">{emoji}</span>
            )}
          </div>

          {/* Right content */}
          <div className="flex-1 p-4 sm:p-5">
            {/* reserve space for the top-right delete button */}
            <div className="pr-0 sm:pr-12">
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between">
                <div className="min-w-0">
                  <h3 className="break-words text-[17px] font-extrabold leading-snug text-black">{decodeText(ev.title)}</h3>
                  {ev.organization && <p className="text-sm text-black/60 mt-1">{decodeText(ev.organization)}</p>}
                </div>

                {/* Date pill (only once) */}
                <span
                  className="shrink-0 text-[11px] font-semibold px-2 py-1 rounded-full border"
                  style={{
                    color: accent,
                    background: "rgba(0,0,0,0.02)",
                    borderColor: "rgba(0,0,0,0.10)",
                  }}
                  title="Event date"
                >
                  {formatDate(ev.date)}
                </span>
              </div>

              <p className="text-sm text-black/70 mt-2 leading-relaxed">{oneSentenceNoEllipsis(ev.description, 180)}</p>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-black/60">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span className="break-words font-bold text-black/75">{decodeText(ev.location ?? "McGill University")}</span>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                onClick={() => openModal(ev)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-black/15 bg-white px-4 py-2 text-sm font-semibold transition hover:border-[#ED1B2F] hover:bg-[#ED1B2F] hover:text-white sm:w-auto"
              >
                <Eye className="w-4 h-4" />
                Details
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="flex-1 overflow-x-hidden pb-24" style={{ background: LIGHT_BG }}>
        {/* Header */}
        <div className="px-4 pb-4 pt-4 sm:px-5 sm:pb-5 sm:pt-6">
          <div className="max-w-5xl mx-auto">
            <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:p-5">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: MCGILL_RED }}>
                Saved
              </h1>
              <p className="text-sm sm:text-base text-black/60 mt-1">Events you’ve bookmarked</p>
              <div className="mt-4 h-[2px] w-24 rounded-full" style={{ background: MCGILL_RED }} />
            </div>
          </div>
        </div>

        <div
          className={`mx-auto max-w-5xl px-4 pb-8 transition-all duration-500 sm:px-5 ${
            fadeIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
          }`}
        >
          <div className="flex flex-col gap-3">
            {list.map((ev) => (
              <SavedRow key={ev.id} ev={ev} />
            ))}
          </div>
        </div>
      </div>

      <EventModal event={selectedEvent as any} isOpen={isModalOpen} onClose={closeModal} />
    </>
  );
}
