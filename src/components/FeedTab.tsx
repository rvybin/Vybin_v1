import { useState, useEffect, useRef, useMemo } from "react";
import { MapPin, Bookmark, Send, Eye, CheckCircle2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { EventModal } from "./EventModal";
import type { Database } from "../lib/database.types";
import { buildEventMatchText, matchesInterest, normalizeMatchText } from "../lib/eventMatching";

type SavedEventInsert = Database["public"]["Tables"]["saved_events"]["Insert"];
type ApplicationInsert = Database["public"]["Tables"]["applications"]["Insert"];

interface AppEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: string | null;
  organization: string | null;
  location: string | null;
  date: string;
  deadline: string | null;
  image_url: string | null;
  prize: string | null;
  tags: string[] | null;
  link?: string | null;
}

interface SavedEvent {
  event_id: string;
}
interface Application {
  event_id: string;
}

interface InterestRow {
  name: string;
  icon: string; // iconName from DB (e.g., "heart", "briefcase", etc.)
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
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

// ✅ Decode HTML entities incl. accents (pr&eacute;senter) + numeric entities (&#233; / &#x00E9;)
const decodeHTMLEntities = (input: string) => {
  return (
    input
      // numeric entities
      .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n)))
      .replace(/&#x([0-9a-f]+);/gi, (_m, n) => String.fromCharCode(parseInt(n, 16)))
      // common named entities
      .replace(/&nbsp;/gi, " ")
      .replace(/&bull;|&#8226;/gi, "•")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&rsquo;|&lsquo;/gi, "'")
      .replace(/&rdquo;|&ldquo;/gi, '"')
      .replace(/&ndash;|&#8211;/gi, "–")
      .replace(/&mdash;|&#8212;/gi, "—")
      .replace(/&hellip;|&#8230;/gi, "…")
      // common accented letters (named entities)
      .replace(/&eacute;/gi, "é")
      .replace(/&egrave;/gi, "è")
      .replace(/&ecirc;/gi, "ê")
      .replace(/&agrave;/gi, "à")
      .replace(/&acirc;/gi, "â")
      .replace(/&ccedil;/gi, "ç")
      .replace(/&ocirc;/gi, "ô")
      .replace(/&ucirc;/gi, "û")
  );
};

const stripHTML = (html?: string | null) =>
  decodeHTMLEntities(html ?? "")
    // strip tags after decode (either order works; decode first helps with weird mixes)
    .replace(/<[^>]*>/g, " ")
    // cleanup
    .replace(/\s+/g, " ")
    .trim();

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
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ✅ same mapping as onboarding
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

function pickCategory(ev: AppEvent, candidates: string[]) {
  const text = buildEventMatchText(ev);

  let bestName = candidates[0] ?? "Social & Community Events";
  let bestHits = -1;

  for (const name of candidates) {
    const kws = CATEGORY_KEYWORDS[name] ?? [];
    let hits = 0;
    for (const kw of kws) if (text.includes(normalizeMatchText(kw))) hits++;
    if (hits > bestHits) {
      bestHits = hits;
      bestName = name;
    }
  }

  return bestName;
}

export function FeedTab() {
  const { user } = useAuth();

  const [events, setEvents] = useState<AppEvent[]>([]);
  const [savedEvents, setSavedEvents] = useState<Set<string>>(new Set());
  const [appliedEvents, setAppliedEvents] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [fadeState, setFadeState] = useState<"fade-in" | "fade-out">("fade-in");

  const [windowDays, setWindowDays] = useState<7 | 14 | 30>(14);

  // interest name -> iconName (from DB)
  const [interestIconMap, setInterestIconMap] = useState<Record<string, string>>({});

  const scrollRef = useRef<HTMLDivElement | null>(null);

  const MCGILL_RED = "#ED1B2F";
  const LIGHT_BG = "#F6F7F9";

  useEffect(() => {
    if (!user) return;
    loadInterestIcons();
    loadUserData();
    loadEventsWithPreferences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadEventsWithPreferences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowDays]);

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

  const handleRefresh = () => {
    setFadeState("fade-out");
    setTimeout(() => {
      loadEventsWithPreferences();
      setFadeState("fade-in");
    }, 220);
  };

  const loadUserData = async () => {
    if (!user) return;

    const [saved, applied] = await Promise.all([
      supabase.from("saved_events").select("event_id").eq("user_id", user.id),
      supabase.from("applications").select("event_id").eq("user_id", user.id),
    ]);

    if (saved.data) setSavedEvents(new Set(saved.data.map((x: SavedEvent) => x.event_id)));
    if (applied.data) setAppliedEvents(new Set(applied.data.map((x: Application) => x.event_id)));
  };

  const loadEventsWithPreferences = async () => {
    setLoading(true);
    try {
      if (!user) return;

      const { data: prefs } = await supabase.from("user_preferences").select("interest_name").eq("user_id", user.id);
      const interests = (prefs ?? []).map((p: any) => (p.interest_name as string) ?? "").filter(Boolean);

      const now = new Date();
      const end = new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000);

      const startISO = now.toISOString();
      const endISO = end.toISOString();

      const HARD_LIMIT = 180;

      const { data: allEvents } = await supabase
        .from("events")
        .select("*")
        .gte("date", startISO)
        .lt("date", endISO)
        .order("date", { ascending: true })
        .limit(HARD_LIMIT);

      const upcoming = (allEvents ?? []).filter((e: any) => {
        const d = new Date(e.date);
        return d >= now && d < end;
      }) as AppEvent[];

      const filtered = interests.length
        ? upcoming.filter((ev) => {
            return interests.some((interestName) => matchesInterest(interestName, ev));
          })
        : upcoming;

      const chrono = [...filtered].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setEvents(chrono);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (id: string) => {
    if (!user) return;

    if (savedEvents.has(id)) {
      await supabase.from("saved_events").delete().eq("user_id", user.id).eq("event_id", id);
      setSavedEvents((p) => {
        const n = new Set(p);
        n.delete(id);
        return n;
      });
    } else {
      const row: SavedEventInsert = { user_id: user.id, event_id: id };
      await supabase.from("saved_events").insert(row);
      setSavedEvents((p) => new Set(p).add(id));
    }
  };

  const handleApply = async (id: string, ev: AppEvent) => {
    if (!user || appliedEvents.has(id)) return;

    const row: ApplicationInsert = { user_id: user.id, event_id: id };
    await supabase.from("applications").insert(row);
    setAppliedEvents((p) => new Set(p).add(id));

    const start = new Date(ev.date);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      ev.title
    )}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent(stripHTML(ev.description))}`;

    window.open(url, "_blank");
  };

  const openModal = (ev: AppEvent) => {
    setSelectedEvent(ev);
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedEvent(null), 220);
  };

  // Buckets
  const { thisWeekEvents, nextWeekEvents, laterEvents } = useMemo(() => {
    const now = new Date();

    const startNextWeek = new Date(now);
    const day = startNextWeek.getDay(); // Sun=0
    const daysUntilMonday = (8 - day) % 7 || 7;
    startNextWeek.setDate(startNextWeek.getDate() + daysUntilMonday);
    startNextWeek.setHours(0, 0, 0, 0);

    const endNextWeek = new Date(startNextWeek);
    endNextWeek.setDate(endNextWeek.getDate() + 7);

    const chrono = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const thisW: AppEvent[] = [];
    const nextW: AppEvent[] = [];
    const later: AppEvent[] = [];

    for (const ev of chrono) {
      const d = new Date(ev.date);
      if (d < startNextWeek) thisW.push(ev);
      else if (d < endNextWeek) nextW.push(ev);
      else later.push(ev);
    }

    return { thisWeekEvents: thisW, nextWeekEvents: nextW, laterEvents: later };
  }, [events]);

  const SectionHeader = (title: string, subtitle: string, count: number) => (
    <div className="flex items-center justify-between mt-10 mb-3">
      <div>
        <h2 className="text-xl font-extrabold text-black">{title}</h2>
        <p className="text-sm text-black/60">{subtitle}</p>
      </div>
      <span className="text-xs font-semibold px-3 py-1 rounded-full bg-red-50 text-red-600 border border-red-200">
        {count} events
      </span>
    </div>
  );

  const WindowPill = ({ days }: { days: 7 | 14 | 30 }) => {
    const active = windowDays === days;
    return (
      <button
        onClick={() => setWindowDays(days)}
        className={[
          "px-3 py-1.5 rounded-full text-xs font-semibold border transition",
          active
            ? "bg-[#ED1B2F] text-white border-[#ED1B2F]"
            : "bg-white text-black/70 border-black/10 hover:bg-black/5",
        ].join(" ")}
      >
        {days}d
      </button>
    );
  };

  // accent + emoji per category
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

  const EventRow = ({ ev }: { ev: AppEvent }) => {
    const isSaved = savedEvents.has(ev.id);
    const isApplied = appliedEvents.has(ev.id);

    const category = pickCategory(ev, Object.keys(CATEGORY_KEYWORDS));
    const { emoji, accent } = metaForCategory(category);

    return (
      <div className="group relative rounded-2xl border border-black/10 bg-white shadow-sm transition hover:shadow-md overflow-hidden">
        <button
          onClick={() => handleSave(ev.id)}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white border border-black/10 hover:bg-black/5 transition"
          title={isSaved ? "Unsave" : "Save"}
        >
          <Bookmark
            className="w-4 h-4"
            style={{
              color: isSaved ? "#ED1B2F" : "rgba(0,0,0,0.55)",
              fill: isSaved ? "#ED1B2F" : "none",
            }}
          />
        </button>

        <div className="flex">
          <div
            className="w-52 min-w-[208px] flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${accent} 0%, rgba(237,27,47,0.22) 100%)`,
            }}
          >
            <div className="select-none text-6xl drop-shadow-sm">{emoji}</div>
          </div>

          <div className="flex-1 p-5">
            <div className="pr-12">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[17px] font-extrabold text-black leading-snug">{ev.title}</h3>
                  {ev.organization && <p className="text-sm text-black/60 mt-1">{ev.organization}</p>}
                </div>

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

              <p className="text-sm text-black/70 mt-2 leading-relaxed">
                {oneSentenceNoEllipsis(ev.description, 180)}
              </p>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-black/60">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span className="font-bold text-black/75">{ev.location ?? "McGill University"}</span>
              </div>

              {isApplied && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4" style={{ color: "#ED1B2F" }} />
                  <span className="font-semibold" style={{ color: "#ED1B2F" }}>
                    Applied
                  </span>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={() => openModal(ev)}
                className="rounded-xl px-4 py-2 text-sm font-semibold border border-black/15 bg-white transition hover:bg-[#ED1B2F] hover:border-[#ED1B2F] hover:text-white flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Details
              </button>

              <button
                onClick={() => handleApply(ev.id, ev)}
                disabled={isApplied}
                className="rounded-xl px-4 py-2 text-sm font-semibold border border-black/15 bg-white transition hover:bg-[#ED1B2F] hover:border-[#ED1B2F] hover:text-white disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isApplied ? <CheckCircle2 className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                {isApplied ? "Applied" : "Apply"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderEvents = (list: AppEvent[]) => (
    <div className="flex flex-col gap-3">
      {list.map((ev) => (
        <EventRow key={ev.id} ev={ev} />
      ))}
    </div>
  );

  return (
    <>
      <div ref={scrollRef} className="flex-1 pb-24" style={{ background: LIGHT_BG }}>
        <div className="px-5 pt-6 pb-5">
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-5 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: MCGILL_RED }}>
                  McGill Events
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm sm:text-base text-black/60">Events matched to your interests</p>
                  <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-red-50 text-red-600 border border-red-200">
                    Next {windowDays} days
                  </span>
                </div>
                <div className="mt-4 h-[2px] w-24 rounded-full" style={{ background: MCGILL_RED }} />
              </div>

              <div className="flex items-center gap-2">
                <WindowPill days={7} />
                <WindowPill days={14} />
                <WindowPill days={30} />
                <button
                  onClick={handleRefresh}
                  className="ml-1 px-3 py-1.5 rounded-full text-xs font-semibold border border-black/10 bg-white hover:bg-black/5 transition flex items-center gap-2"
                  title="Refresh"
                >
                  <span className="inline-block">⟳</span>
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48 text-black/70">Loading…</div>
        ) : events.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-black/60">No matching events found.</div>
        ) : (
          <div
            className={`px-5 pb-8 max-w-5xl mx-auto transition-opacity duration-300 ${
              fadeState === "fade-in" ? "opacity-100" : "opacity-0"
            }`}
          >
            {SectionHeader("This week", "Happening soon — don’t miss these.", thisWeekEvents.length)}
            {thisWeekEvents.length ? (
              renderEvents(thisWeekEvents)
            ) : (
              <div className="text-sm text-black/50 py-6">No events this week in your window.</div>
            )}

            {SectionHeader("Next week", "Plan ahead and lock these in.", nextWeekEvents.length)}
            {nextWeekEvents.length ? (
              renderEvents(nextWeekEvents)
            ) : (
              <div className="text-sm text-black/50 py-6">No events next week in your window.</div>
            )}

            {SectionHeader("Later", "Still within your selected window.", laterEvents.length)}
            {laterEvents.length ? (
              renderEvents(laterEvents)
            ) : (
              <div className="text-sm text-black/50 py-6">No later events in your window.</div>
            )}
          </div>
        )}
      </div>

      <EventModal event={selectedEvent as any} isOpen={isModalOpen} onClose={closeModal} />
    </>
  );
}
