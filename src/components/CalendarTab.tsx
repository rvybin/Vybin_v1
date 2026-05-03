import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CalendarDays, CheckCircle2, Crown, Lock, Sparkles, Trash2, Upload } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { openPremiumCheckout } from "../lib/billing";
import { parseScheduleFromStorage } from "../lib/scheduleOcr";

const MCGILL_RED = "#ED1B2F";
const LIGHT_BG = "#F6F7F9";
const BUCKET = "calendar_uploads";
const ALLOWED_MIME = new Set(["image/png", "image/jpeg"]);
const MAX_MB = 12;
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const DAY_CODES = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"] as const;
const HOURS = Array.from({ length: 13 }, (_, i) => 8 + i);
const PX_PER_HOUR = 68;
const MOBILE_PX_PER_HOUR = 88;
const RRULE_PREFIX = "FREQ=WEEKLY;INTERVAL=1;BYDAY=";

type CalendarItemRow = {
  id: string;
  title: string;
  course_code: string | null;
  location: string | null;
  notes: string | null;
  start_at: string;
  end_at: string;
  rrule: string | null;
};

type CalendarPlacement = CalendarItemRow & {
  dayIndex: number;
  startMinutes: number;
  endMinutes: number;
  colOffset: number;
  colTotal: number;
};

function getMonday(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toMinutes(d: Date) {
  return d.getHours() * 60 + d.getMinutes();
}

function formatHourLabel(hour: number) {
  if (hour === 12) return "12 PM";
  if (hour > 12) return `${hour - 12} PM`;
  return `${hour} AM`;
}

function formatWeekRange(start: Date) {
  const end = addDays(start, 6);
  return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

function formatBlockTime(iso: string) {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  const suffix = h >= 12 ? "PM" : "AM";
  const dh = h % 12 === 0 ? 12 : h % 12;
  return `${dh}:${String(m).padStart(2, "0")} ${suffix}`;
}

function getRRuleDay(rrule: string | null) {
  if (!rrule) return null;
  const m = rrule.match(/BYDAY=([A-Z]{2})/);
  if (!m) return null;
  const idx = DAY_CODES.indexOf(m[1] as (typeof DAY_CODES)[number]);
  return idx >= 0 ? idx : null;
}

function buildRecurringDate(weekStart: Date, dayIndex: number, sourceIso: string) {
  const src = new Date(sourceIso);
  const d = addDays(weekStart, dayIndex);
  d.setHours(src.getHours(), src.getMinutes(), 0, 0);
  return d;
}

function buildKey(item: Pick<CalendarItemRow, "course_code" | "location" | "start_at" | "end_at" | "rrule">) {
  return [
    item.course_code ?? "",
    item.location ?? "",
    new Date(item.start_at).toISOString(),
    new Date(item.end_at).toISOString(),
    item.rrule ?? "",
  ].join("|");
}

function assignOverlapCols(items: CalendarPlacement[]): CalendarPlacement[] {
  const sorted = [...items].sort((a, b) => a.startMinutes - b.startMinutes);
  const groups: { items: CalendarPlacement[]; maxEnd: number }[] = [];

  for (const item of sorted) {
    let placed = false;
    for (const g of groups) {
      if (item.startMinutes < g.maxEnd) {
        g.items.push(item);
        g.maxEnd = Math.max(g.maxEnd, item.endMinutes);
        placed = true;
        break;
      }
    }
    if (!placed) groups.push({ items: [item], maxEnd: item.endMinutes });
  }

  const result: CalendarPlacement[] = [];
  for (const g of groups) {
    g.items.forEach((p, i) => result.push({ ...p, colOffset: i, colTotal: g.items.length }));
  }
  return result;
}

export function CalendarTab() {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [calendarItems, setCalendarItems] = useState<CalendarItemRow[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [mobileDayIndex, setMobileDayIndex] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("is_premium")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setIsPremium((data as any)?.is_premium === true));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadItems();
  }, [user]);

  async function loadItems() {
    if (!user) return;
    setLoadingItems(true);
    try {
      const { data, error } = await supabase
        .from("calendar_items")
        .select("id, title, course_code, location, notes, start_at, end_at, rrule")
        .eq("user_id", user.id)
        .order("start_at", { ascending: true });
      if (error) throw error;
      setCalendarItems((data ?? []) as CalendarItemRow[]);
    } catch {
      setCalendarItems([]);
    } finally {
      setLoadingItems(false);
    }
  }

  const placements = useMemo<CalendarPlacement[]>(() => {
    const raw = calendarItems
      .map((item) => {
        const recurDay = getRRuleDay(item.rrule);
        const start = recurDay !== null
          ? buildRecurringDate(weekStart, recurDay, item.start_at)
          : new Date(item.start_at);
        const end = recurDay !== null
          ? buildRecurringDate(weekStart, recurDay, item.end_at)
          : new Date(item.end_at);

        if (recurDay === null) {
          const we = addDays(weekStart, 7);
          if (start < weekStart || start >= we) return null;
        }

        const dayIndex = recurDay ?? ((start.getDay() + 6) % 7);
        const startMinutes = toMinutes(start);
        const endMinutes = toMinutes(end);
        if (endMinutes <= startMinutes) return null;

        return { ...item, dayIndex, startMinutes, endMinutes, colOffset: 0, colTotal: 1 };
      })
      .filter(Boolean) as CalendarPlacement[];

    const byDay: Record<number, CalendarPlacement[]> = {};
    for (const p of raw) {
      (byDay[p.dayIndex] ??= []).push(p);
    }

    return Object.values(byDay).flatMap(assignOverlapCols);
  }, [calendarItems, weekStart]);

  const mobilePlacements = useMemo(
    () => placements.filter((p) => p.dayIndex === mobileDayIndex),
    [placements, mobileDayIndex]
  );

  async function clearSchedule() {
    if (!user) return;
    if (!window.confirm("This will delete all classes from your calendar. Are you sure?")) return;
    setBusy(true);
    setBusyLabel("Clearing...");
    try {
      await supabase.from("calendar_items").delete().eq("user_id", user.id);
      await loadItems();
      setStatus("success");
      setMessage("Schedule cleared. Upload a new timetable to start fresh.");
    } catch (err: any) {
      setStatus("error");
      setMessage(err?.message ?? "Failed to clear schedule.");
    } finally {
      setBusy(false);
      setBusyLabel("");
    }
  }

  async function onFileSelected(file: File | null) {
    if (!file || !user) return;
    if (!ALLOWED_MIME.has(file.type)) {
      setStatus("error");
      setMessage("Only PNG or JPG images are supported.");
      return;
    }
    if (file.size / (1024 * 1024) > MAX_MB) {
      setStatus("error");
      setMessage(`File is too large. Max ${MAX_MB} MB.`);
      return;
    }

    setStatus("idle");
    setMessage("");
    setBusy(true);
    setBusyLabel("Uploading...");

    let importId: string | null = null;

    try {
      importId = crypto.randomUUID();
      const safeName = (file.name || "schedule").replace(/[^\w.\-]+/g, "_").slice(0, 120);
      const objectPath = `${user.id}/${importId}/${Date.now()}_${safeName}`;

      await supabase.from("calendar_imports").insert({
        id: importId,
        user_id: user.id,
        status: "uploading",
        file_name: file.name,
        file_type: file.type,
        file_path: objectPath,
      } as any);

      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(objectPath, file, { contentType: file.type, upsert: false });
      if (uploadErr) throw uploadErr;

      setBusyLabel("Reading your timetable...");

      const detected = await parseScheduleFromStorage(objectPath);

      if (!detected.length) {
        setStatus("error");
        setMessage("No classes detected. Try a clearer full-timetable screenshot.");
        return;
      }

      setBusyLabel("Saving to calendar...");

      const existingKeys = new Set(calendarItems.map(buildKey));
      const anchor = getMonday(new Date());

      const rows = detected
        .map((entry) => {
          const di = DAY_CODES.indexOf(entry.day);
          const sd = addDays(anchor, di);
          const ed = addDays(anchor, di);
          const [sh, sm] = entry.startTime.split(":").map(Number);
          const [eh, em] = entry.endTime.split(":").map(Number);
          sd.setHours(sh, sm, 0, 0);
          ed.setHours(eh, em, 0, 0);
          return {
            user_id: user.id,
            title: entry.title,
            course_code: entry.course_code,
            location: entry.location ?? null,
            notes: entry.notes ?? null,
            start_at: sd.toISOString(),
            end_at: ed.toISOString(),
            rrule: `${RRULE_PREFIX}${entry.day}`,
          };
        })
        .filter((row) => {
          const k = buildKey(row);
          if (existingKeys.has(k)) return false;
          existingKeys.add(k);
          return true;
        });

      if (rows.length) {
        const { error } = await supabase.from("calendar_items").insert(rows as any);
        if (error) throw error;
        await loadItems();
      }

      setStatus("success");
      setMessage(
        rows.length
          ? `${rows.length} classes added to your schedule.`
          : "Your schedule is already up to date."
      );
    } catch (err: any) {
      if (importId) {
        await supabase
          .from("calendar_imports")
          .update({ status: "failed", error: err?.message ?? "Failed" } as any)
          .eq("id", importId)
          .eq("user_id", user.id);
      }
      setStatus("error");
      setMessage(err?.message ?? "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
      setBusyLabel("");
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (isPremium === null) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" style={{ background: LIGHT_BG }}>
        <p className="text-sm text-black/40">Loading...</p>
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center px-6 text-center" style={{ background: LIGHT_BG }}>
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50">
          <Lock className="h-8 w-8 text-amber-500" />
        </div>
        <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
          <Crown className="h-3.5 w-3.5" /> Premium Feature
        </span>
        <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-black">Class Schedule Planner</h2>
        <p className="mt-2 max-w-sm text-sm text-black/55">
          Upload a screenshot of your McGill timetable and we'll instantly populate your weekly schedule.
        </p>
        <button
          onClick={openPremiumCheckout}
          className="mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          style={{ background: MCGILL_RED }}
        >
          <Crown className="h-4 w-4" /> Upgrade to Premium
        </button>
        <p className="mt-3 text-xs text-black/35">Vybin Premium — coming soon</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: LIGHT_BG }}>
      <div className="mx-auto max-w-5xl px-4 pb-8 pt-4 sm:px-5 sm:pt-6">

        {/* Description card */}
        <div className="mb-4 rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: MCGILL_RED }}>
                  My Schedule
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                  <Crown className="h-3 w-3" /> Premium
                </span>
              </div>
              <p className="mt-1 max-w-md text-sm text-black/55">
                Upload a screenshot of your McGill timetable and your weekly schedule populates instantly — course codes, times, and locations all included.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)}
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                style={{ background: MCGILL_RED }}
              >
                <Upload className="h-4 w-4" />
                {busy ? busyLabel : "Import timetable"}
              </button>

              {calendarItems.length > 0 && (
                <button
                  onClick={clearSchedule}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-black/50 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear schedule
                </button>
              )}

              {status !== "idle" && (
                <div
                  className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium"
                  style={{
                    borderColor: status === "success" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)",
                    background: status === "success" ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                    color: status === "success" ? "rgb(21,128,61)" : "rgb(185,28,28)",
                  }}
                >
                  {status === "success"
                    ? <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                    : <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />}
                  {message}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Calendar card */}
        <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">

          {/* Week nav */}
          <div className="flex items-center justify-between border-b border-black/5 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" style={{ color: MCGILL_RED }} />
              <div>
                <span className="text-sm font-semibold text-black">Weekly view</span>
                <p className="text-[11px] text-black/40">{formatWeekRange(weekStart)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setWeekStart((w) => addDays(w, -7))}
                className="rounded-lg border border-black/10 px-2.5 py-1 text-xs font-semibold text-black/55 transition hover:bg-black/5"
              >
                ‹ Prev
              </button>
              <button
                onClick={() => setWeekStart(getMonday(new Date()))}
                className="rounded-lg border border-black/10 px-2.5 py-1 text-xs font-semibold text-black/55 transition hover:bg-black/5"
              >
                Today
              </button>
              <button
                onClick={() => setWeekStart((w) => addDays(w, 7))}
                className="rounded-lg border border-black/10 px-2.5 py-1 text-xs font-semibold text-black/55 transition hover:bg-black/5"
              >
                Next ›
              </button>
            </div>
          </div>

          {loadingItems ? (
            <div className="flex h-48 items-center justify-center text-sm text-black/35">
              Loading your schedule...
            </div>
          ) : !placements.length ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50">
                <Sparkles className="h-6 w-6" style={{ color: MCGILL_RED }} />
              </div>
              <p className="font-semibold text-black">No classes yet</p>
              <p className="max-w-xs text-sm text-black/45">
                Click "Import timetable" above and upload your McGill schedule screenshot — classes appear here instantly.
              </p>
            </div>
          ) : (
            <>
              {/* ── Mobile: day tabs + single-column grid ── */}
              <div className="md:hidden">
                <div className="flex gap-1.5 overflow-x-auto border-b border-black/5 px-4 py-2.5">
                  {DAY_LABELS.map((label, i) => (
                    <button
                      key={label}
                      onClick={() => setMobileDayIndex(i)}
                      className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${
                        mobileDayIndex === i
                          ? "bg-[#ED1B2F] text-white"
                          : "border border-black/10 text-black/50 hover:bg-black/5"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-[44px_1fr] gap-x-2 px-3 py-3">
                  {/* Time labels */}
                  <div className="relative" style={{ height: HOURS.length * MOBILE_PX_PER_HOUR }}>
                    {HOURS.map((h, i) => (
                      <div
                        key={h}
                        className="absolute right-0 text-[10px] font-medium text-black/35"
                        style={{ top: i * MOBILE_PX_PER_HOUR - 6 }}
                      >
                        {formatHourLabel(h)}
                      </div>
                    ))}
                  </div>

                  {/* Single day column */}
                  <div
                    className="relative overflow-hidden rounded-xl bg-black/[0.02]"
                    style={{ height: HOURS.length * MOBILE_PX_PER_HOUR }}
                  >
                    {HOURS.map((h, i) => (
                      <div
                        key={h}
                        className="absolute inset-x-0 border-t border-black/[0.05]"
                        style={{ top: i * MOBILE_PX_PER_HOUR }}
                      />
                    ))}
                    {mobilePlacements.map((p) => {
                      const top = ((p.startMinutes - HOURS[0] * 60) / 60) * MOBILE_PX_PER_HOUR;
                      const height = Math.max(
                        ((p.endMinutes - p.startMinutes) / 60) * MOBILE_PX_PER_HOUR,
                        48
                      );
                      const pct = 100 / p.colTotal;
                      return (
                        <div
                          key={p.id}
                          className="absolute overflow-hidden rounded-xl bg-gradient-to-b from-[#ED1B2F] to-[#C01020] px-2.5 py-2 shadow-md"
                          style={{
                            top: top + 2,
                            height: height - 4,
                            left: `${p.colOffset * pct + 1}%`,
                            width: `${pct - 2}%`,
                          }}
                        >
                          <p className="truncate text-[12px] font-bold leading-tight text-white">
                            {p.course_code ?? p.title}
                          </p>
                          <p className="mt-0.5 truncate text-[10px] leading-tight text-white/75">
                            {formatBlockTime(p.start_at)} – {formatBlockTime(p.end_at)}
                          </p>
                          {p.location && (
                            <p className="mt-0.5 truncate text-[10px] leading-tight text-white/60">
                              {p.location}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ── Desktop: full 7-day grid ── */}
              <div className="hidden overflow-x-auto md:block">
                <div className="min-w-[640px] px-4 pb-4 pt-3 sm:px-5">
                  {/* Day headers */}
                  <div
                    className="grid gap-1.5"
                    style={{ gridTemplateColumns: "52px repeat(7, minmax(0, 1fr))" }}
                  >
                    <div />
                    {DAY_LABELS.map((label, i) => {
                      const isToday =
                        addDays(weekStart, i).toDateString() === new Date().toDateString();
                      return (
                        <div
                          key={label}
                          className={`rounded-xl px-2 py-2 text-center ${
                            isToday ? "bg-[#ED1B2F]/8" : "bg-black/[0.025]"
                          }`}
                        >
                          <p
                            className={`text-[11px] font-bold ${
                              isToday ? "text-[#ED1B2F]" : "text-black/60"
                            }`}
                          >
                            {label}
                          </p>
                          <p className={`text-[10px] ${isToday ? "text-[#ED1B2F]/70" : "text-black/35"}`}>
                            {addDays(weekStart, i).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Grid body */}
                  <div
                    className="mt-1.5 grid gap-1.5"
                    style={{ gridTemplateColumns: "52px repeat(7, minmax(0, 1fr))" }}
                  >
                    {/* Hour labels */}
                    <div className="relative" style={{ height: HOURS.length * PX_PER_HOUR }}>
                      {HOURS.map((h, i) => (
                        <div
                          key={h}
                          className="absolute right-1 whitespace-nowrap text-[9px] font-medium text-black/30"
                          style={{ top: i * PX_PER_HOUR - 5 }}
                        >
                          {formatHourLabel(h)}
                        </div>
                      ))}
                    </div>

                    {/* Day columns */}
                    {DAY_LABELS.map((label, colIdx) => {
                      const dayPlacements = placements.filter((p) => p.dayIndex === colIdx);
                      const isToday =
                        addDays(weekStart, colIdx).toDateString() === new Date().toDateString();
                      return (
                        <div
                          key={label}
                          className={`relative overflow-hidden rounded-xl border ${
                            isToday ? "border-[#ED1B2F]/20 bg-[#ED1B2F]/[0.02]" : "border-black/[0.06] bg-black/[0.015]"
                          }`}
                          style={{ height: HOURS.length * PX_PER_HOUR }}
                        >
                          {/* Hour lines */}
                          {HOURS.map((h, i) => (
                            <div
                              key={h}
                              className="absolute inset-x-0 border-t border-black/[0.05]"
                              style={{ top: i * PX_PER_HOUR }}
                            />
                          ))}

                          {/* Class blocks */}
                          {dayPlacements.map((p) => {
                            const rawH = ((p.endMinutes - p.startMinutes) / 60) * PX_PER_HOUR;
                            const top = ((p.startMinutes - HOURS[0] * 60) / 60) * PX_PER_HOUR;
                            const blockH = Math.max(rawH, 32) - 4;
                            const pct = 100 / p.colTotal;
                            return (
                              <div
                                key={p.id}
                                title={`${p.course_code ?? p.title}${p.location ? ` · ${p.location}` : ""}`}
                                className="absolute overflow-hidden rounded-lg bg-gradient-to-b from-[#ED1B2F] to-[#C01020] shadow-sm"
                                style={{
                                  top: top + 2,
                                  height: blockH,
                                  left: `${p.colOffset * pct + 2}%`,
                                  width: `${pct - 4}%`,
                                  padding: "4px 6px",
                                }}
                              >
                                <p className="truncate text-[10px] font-bold leading-tight text-white">
                                  {p.course_code ?? p.title}
                                </p>
                                {rawH > 36 && (
                                  <p className="mt-px truncate text-[8.5px] leading-tight text-white/75">
                                    {formatBlockTime(p.start_at)} – {formatBlockTime(p.end_at)}
                                  </p>
                                )}
                                {rawH > 54 && p.location && (
                                  <p className="mt-px truncate text-[8px] leading-tight text-white/60">
                                    {p.location}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
