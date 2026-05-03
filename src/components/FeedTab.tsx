import { useState, useEffect, useRef, useMemo } from "react";
import { MapPin, Bookmark, CalendarPlus, Eye, CheckCircle2 } from "lucide-react";
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
  time?: string | null;
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
  icon: string;
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

const decodeHTMLEntities = (input: string) => {
  return (
    input
      .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n)))
      .replace(/&#x([0-9a-f]+);/gi, (_m, n) => String.fromCharCode(parseInt(n, 16)))
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
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

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
  const [markingApplied, setMarkingApplied] = useState(false);

  const [fadeState] = useState<"fade-in" | "fade-out">("fade-in");
  const [windowDays, setWindowDays] = useState<7 | 14 | 30>(14);
const [interestIconMap, setInterestIconMap] = useState<Record<string, string>>({});

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const FEED_MODAL_STORAGE_KEY = "vybin_feed_selected_event";

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

  useEffect(() => {
    const saved = sessionStorage.getItem(FEED_MODAL_STORAGE_KEY);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as AppEvent;
      if (parsed?.id) {
        setSelectedEvent(parsed);
        setIsModalOpen(true);
      }
    } catch {
      sessionStorage.removeItem(FEED_MODAL_STORAGE_KEY);
    }
  }, []);

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

      const { data: prefs } = await supabase
        .from("user_preferences")
        .select("interest_name")
        .eq("user_id", user.id);

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
        ? upcoming.filter((ev) => interests.some((interestName) => matchesInterest(interestName, ev)))
        : upcoming;

      const chrono = [...filtered].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

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

  const parseCalendarRange = (ev: AppEvent) => {
    const start = new Date(ev.date);
    let end = new Date(start.getTime() + 60 * 60 * 1000);

    const timeText = ev.time ?? "";
    const rangeMatch = timeText.match(
      /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|–|—|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i
    );

    if (rangeMatch) {
      const [, startHourRaw, startMinuteRaw, startMeridiemRaw, endHourRaw, endMinuteRaw, endMeridiemRaw] =
        rangeMatch;

      const resolvedStartMeridiem = (startMeridiemRaw ?? endMeridiemRaw ?? "").toLowerCase();
      const resolvedEndMeridiem = (endMeridiemRaw ?? startMeridiemRaw ?? "").toLowerCase();

      const to24Hour = (hourRaw: string, meridiem: string) => {
        let hour = Number(hourRaw);
        if (meridiem === "pm" && hour !== 12) hour += 12;
        if (meridiem === "am" && hour === 12) hour = 0;
        return hour;
      };

      start.setHours(to24Hour(startHourRaw, resolvedStartMeridiem), Number(startMinuteRaw ?? 0), 0, 0);

      end = new Date(start);
      end.setHours(to24Hour(endHourRaw, resolvedEndMeridiem), Number(endMinuteRaw ?? 0), 0, 0);

      if (end <= start) {
        end = new Date(start.getTime() + 60 * 60 * 1000);
      }
    }

    return { start, end };
  };

  const getCalendarLocation = (ev: AppEvent) => {
    const explicitLocation = ev.location?.trim();
    if (explicitLocation) return explicitLocation;

    const searchableText = `${ev.title} ${ev.description ?? ""} ${ev.event_type ?? ""}`.toLowerCase();
    if (/(online|virtual|zoom|teams|google meet)/i.test(searchableText)) {
      return "Online";
    }

    return "McGill University";
  };

  const handleAddToCalendar = async (ev: AppEvent) => {
    const { start, end } = parseCalendarRange(ev);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      ev.title
    )}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent(
      stripHTML(ev.description)
    )}&location=${encodeURIComponent(getCalendarLocation(ev))}`;

    window.open(url, "_blank");
  };

  const handleMarkApplied = async (ev: { id: string }) => {
    if (!user || appliedEvents.has(ev.id)) return;

    try {
      setMarkingApplied(true);
      const row: ApplicationInsert = { user_id: user.id, event_id: ev.id };
      const { error } = await supabase.from("applications").insert(row);
      if (error) throw error;
      setAppliedEvents((p) => new Set(p).add(ev.id));
    } catch (error: any) {
      if (error?.code !== "23505") {
        console.error("Failed to mark application:", error);
      } else {
        setAppliedEvents((p) => new Set(p).add(ev.id));
      }
    } finally {
      setMarkingApplied(false);
    }
  };

  const openModal = (ev: AppEvent) => {
    setSelectedEvent(ev);
    setIsModalOpen(true);
    sessionStorage.setItem(FEED_MODAL_STORAGE_KEY, JSON.stringify(ev));
  };

  const closeModal = () => {
    setIsModalOpen(false);
    sessionStorage.removeItem(FEED_MODAL_STORAGE_KEY);
    setTimeout(() => setSelectedEvent(null), 220);
  };

  const { thisWeekEvents, nextWeekEvents, laterEvents } = useMemo(() => {
    const now = new Date();

    const startNextWeek = new Date(now);
    const day = startNextWeek.getDay();
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
      <div className="group relative overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm transition hover:shadow-md">
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

        <div className="flex flex-col sm:flex-row">
          <div
            className="flex h-36 w-full items-center justify-center sm:h-auto sm:w-52 sm:min-w-[208px]"
            style={{
              background: `linear-gradient(135deg, ${accent} 0%, rgba(237,27,47,0.22) 100%)`,
            }}
          >
            <div className="select-none text-6xl drop-shadow-sm">{emoji}</div>
          </div>

          <div className="flex-1 p-4 sm:p-5">
            <div className="pr-0 sm:pr-12">
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between">
                <div className="min-w-0">
                  <h3 className="break-words text-[17px] font-extrabold leading-snug text-black">
                    {ev.title}
                  </h3>
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
              <div className="flex flex-wrap items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span className="break-words font-bold text-black/75">
                  {ev.location ?? "McGill University"}
                </span>
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

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                onClick={() => openModal(ev)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-black/15 bg-white px-4 py-2 text-sm font-semibold transition hover:border-[#ED1B2F] hover:bg-[#ED1B2F] hover:text-white sm:w-auto"
              >
                <Eye className="w-4 h-4" />
                View Details & Apply
              </button>

              <button
                onClick={() => handleAddToCalendar(ev)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-black/15 bg-white px-4 py-2 text-sm font-semibold transition hover:border-[#ED1B2F] hover:bg-[#ED1B2F] hover:text-white sm:w-auto"
              >
                <CalendarPlus className="w-4 h-4" />
                Add to Calendar
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
      <div ref={scrollRef} className="flex-1 overflow-x-hidden pb-24" style={{ background: LIGHT_BG }}>
        <div className="px-4 pb-4 pt-4 sm:px-5 sm:pb-5 sm:pt-6">
          <div className="max-w-5xl mx-auto">
            <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: MCGILL_RED }}>
                    McGill Events
                  </h1>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <p className="text-sm sm:text-base text-black/60">Events matched to your interests</p>
                    <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-red-50 text-red-600 border border-red-200">
                      Next {windowDays} days
                    </span>
                  </div>
                  <div className="mt-4 h-[2px] w-24 rounded-full" style={{ background: MCGILL_RED }} />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <WindowPill days={7} />
                  <WindowPill days={14} />
                  <WindowPill days={30} />

                </div>
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
            className={`mx-auto max-w-5xl px-4 pb-8 transition-opacity duration-300 sm:px-5 ${
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

      <EventModal
        event={selectedEvent as any}
        isOpen={isModalOpen}
        onClose={closeModal}
        isApplied={selectedEvent ? appliedEvents.has(selectedEvent.id) : false}
        onMarkApplied={selectedEvent ? handleMarkApplied : undefined}
        markingApplied={markingApplied}
      />


    </>
  );
}