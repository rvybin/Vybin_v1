import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CalendarDays, CheckCircle2, Crown, Lock, Sparkles, Upload } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { openPremiumCheckout } from "../lib/billing";
import { parseScheduleFromStorage, type ParsedClass } from "../lib/scheduleOcr";

const MCGILL_RED = "#ED1B2F";
const LIGHT_BG = "#F6F7F9";
const BUCKET = "calendar_uploads";
const ALLOWED_MIME = new Set(["image/png", "image/jpeg"]);
const MAX_MB = 12;
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const DAY_CODES = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"] as const;
const HOURS = Array.from({ length: 13 }, (_, index) => 8 + index);
const MOBILE_PIXELS_PER_HOUR = 84;
const DESKTOP_PIXELS_PER_HOUR = 56;
const WEEKLY_RRULE_PREFIX = "FREQ=WEEKLY;INTERVAL=1;BYDAY=";

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
};

function formatTimeLabel(hour: number) {
  if (hour === 12) return "12 PM";
  if (hour > 12) return `${hour - 12} PM`;
  return `${hour} AM`;
}

function getMonday(date: Date) {
  const monday = new Date(date);
  const day = monday.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  monday.setDate(monday.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function formatWeekRange(weekStart: Date) {
  const weekEnd = addDays(weekStart, 6);
  const startText = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endText = weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${startText} - ${endText}`;
}

function toMinutes(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

function buildRecurringDate(weekStart: Date, dayIndex: number, sourceIso: string) {
  const source = new Date(sourceIso);
  const next = addDays(weekStart, dayIndex);
  next.setHours(source.getHours(), source.getMinutes(), 0, 0);
  return next;
}

function getRRuleDay(rrule: string | null) {
  if (!rrule) return null;
  const match = rrule.match(/BYDAY=([A-Z]{2})/);
  if (!match) return null;
  const dayIndex = DAY_CODES.indexOf(match[1] as (typeof DAY_CODES)[number]);
  return dayIndex >= 0 ? dayIndex : null;
}

function buildCalendarKey(item: Pick<CalendarItemRow, "course_code" | "location" | "start_at" | "end_at" | "rrule">) {
  return [
    item.course_code ?? "",
    item.location ?? "",
    new Date(item.start_at).toISOString(),
    new Date(item.end_at).toISOString(),
    item.rrule ?? "",
  ].join("|");
}

function minutesToLocalTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHour}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

export function CalendarTab() {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [isPremium, setIsPremium] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("is_premium")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setIsPremium((data as any)?.is_premium === true));
  }, [user]);

  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [savingClasses, setSavingClasses] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [parsed, setParsed] = useState<ParsedClass[]>([]);
  const [calendarItems, setCalendarItems] = useState<CalendarItemRow[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [mobileDayIndex, setMobileDayIndex] = useState(0);

  useEffect(() => {
    if (!user) return;
    loadCalendarItems();
  }, [user]);

  const loadCalendarItems = async () => {
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
    } catch (error) {
      console.error("Failed to load calendar items:", error);
      setCalendarItems([]);
    } finally {
      setLoadingItems(false);
    }
  };

  const placements = useMemo<CalendarPlacement[]>(() => {
    return calendarItems
      .map((item) => {
        const recurringDayIndex = getRRuleDay(item.rrule);
        const start = recurringDayIndex !== null ? buildRecurringDate(weekStart, recurringDayIndex, item.start_at) : new Date(item.start_at);
        const end = recurringDayIndex !== null ? buildRecurringDate(weekStart, recurringDayIndex, item.end_at) : new Date(item.end_at);

        if (recurringDayIndex === null) {
          const weekEnd = addDays(weekStart, 7);
          if (start < weekStart || start >= weekEnd) return null;
        }

        const dayIndex = recurringDayIndex ?? ((start.getDay() + 6) % 7);
        const startMinutes = toMinutes(start);
        const endMinutes = toMinutes(end);
        if (endMinutes <= startMinutes) return null;

        return {
          ...item,
          dayIndex,
          startMinutes,
          endMinutes,
        };
      })
      .filter(Boolean) as CalendarPlacement[];
  }, [calendarItems, weekStart]);

  const mobilePlacements = useMemo(
    () => placements.filter((placement) => placement.dayIndex === mobileDayIndex),
    [placements, mobileDayIndex]
  );

  const pickFile = () => fileRef.current?.click();

  const onFileSelected = async (file: File | null) => {
    setStatus("idle");
    setMessage("");
    setParsed([]);

    if (!user) {
      setStatus("error");
      setMessage("You must be signed in to upload a schedule.");
      return;
    }
    if (!file) return;

    if (!ALLOWED_MIME.has(file.type)) {
      setStatus("error");
      setMessage("Only PNG or JPG images are supported right now.");
      return;
    }

    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_MB) {
      setStatus("error");
      setMessage(`File too large. Max size is ${MAX_MB}MB.`);
      return;
    }

    setUploading(true);

    let currentImportId: string | null = null;

    try {
      currentImportId = crypto.randomUUID();
      const safeName = (file.name || "schedule").replace(/[^\w.\-]+/g, "_").slice(0, 120);
      const objectPath = `${user.id}/${currentImportId}/${Date.now()}_${safeName}`;

      await supabase.from("calendar_imports").insert({
        id: currentImportId,
        user_id: user.id,
        status: "uploading",
        file_name: file.name,
        file_type: file.type,
        file_path: objectPath,
        error: null,
        parsed_json: null,
      } as any);

      const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(objectPath, file, {
        contentType: file.type,
        upsert: false,
      });
      if (uploadErr) throw uploadErr;

      await supabase
        .from("calendar_imports")
        .update({ status: "uploaded", error: null } as any)
        .eq("id", currentImportId)
        .eq("user_id", user.id);

      setStatus("success");
      setMessage("Uploaded. Extracting classes from your timetable...");

      setParsing(true);
      const detectedClasses = await parseScheduleFromStorage(objectPath);
      setParsed(detectedClasses);

      await supabase
        .from("calendar_imports")
        .update({
          status: detectedClasses.length ? "parsed" : "uploaded",
          parsed_json: detectedClasses as any,
        } as any)
        .eq("id", currentImportId)
        .eq("user_id", user.id);

      if (!detectedClasses.length) {
        setStatus("error");
        setMessage("We could not detect any classes. Try a sharper screenshot with the full timetable visible.");
        return;
      }

      setStatus("success");
      setMessage(`Detected ${detectedClasses.length} classes. Review them below and save to your calendar.`);
    } catch (error: any) {
      console.error(error);

      if (user && currentImportId) {
        await supabase
          .from("calendar_imports")
          .update({ status: "failed", error: error?.message ?? "Upload failed" } as any)
          .eq("id", currentImportId)
          .eq("user_id", user.id);
      }

      setStatus("error");
      setMessage(error?.message ?? "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      setParsing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const saveToCalendar = async () => {
    if (!user || !parsed.length) return;

    setSavingClasses(true);
    setStatus("idle");
    setMessage("");

    try {
      const existingKeys = new Set(calendarItems.map((item) => buildCalendarKey(item)));
      const weekAnchor = getMonday(new Date());

      const rows = parsed
        .map((entry) => {
          const dayIndex = DAY_CODES.indexOf(entry.day);
          const startDate = addDays(weekAnchor, dayIndex);
          const endDate = addDays(weekAnchor, dayIndex);

          const [startHour, startMinute] = entry.startTime.split(":").map(Number);
          const [endHour, endMinute] = entry.endTime.split(":").map(Number);

          startDate.setHours(startHour, startMinute, 0, 0);
          endDate.setHours(endHour, endMinute, 0, 0);

          return {
            user_id: user.id,
            title: entry.title,
            course_code: entry.course_code,
            location: entry.location ?? null,
            notes: entry.notes ?? null,
            start_at: startDate.toISOString(),
            end_at: endDate.toISOString(),
            rrule: `${WEEKLY_RRULE_PREFIX}${entry.day}`,
          };
        })
        .filter((row) => {
          const key = buildCalendarKey(row);
          if (existingKeys.has(key)) return false;
          existingKeys.add(key);
          return true;
        });

      if (!rows.length) {
        setStatus("success");
        setMessage("These classes are already in your calendar.");
        return;
      }

      const { error } = await supabase.from("calendar_items").insert(rows as any);
      if (error) throw error;

      await loadCalendarItems();
      setParsed([]);
      setStatus("success");
      setMessage(`Saved ${rows.length} weekly classes to your calendar.`);
    } catch (error: any) {
      console.error(error);
      setStatus("error");
      setMessage(error?.message ?? "Failed to save classes.");
    } finally {
      setSavingClasses(false);
    }
  };

  if (isPremium === null) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" style={{ background: LIGHT_BG }}>
        <p className="text-sm text-black/50">Loading...</p>
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center px-6 text-center" style={{ background: LIGHT_BG }}>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200">
          <Lock className="h-8 w-8 text-amber-500" />
        </div>
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
          <Crown className="h-3.5 w-3.5" />
          Premium Feature
        </div>
        <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-black">Class Schedule Planner</h2>
        <p className="mt-2 max-w-sm text-sm text-black/60">
          Upload a screenshot of your McGill timetable and we'll auto-populate your weekly schedule with course codes, times, and locations.
        </p>
        <button
          onClick={openPremiumCheckout}
          className="mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          style={{ background: MCGILL_RED }}
        >
          <Crown className="h-4 w-4" />
          Upgrade to Premium
        </button>
        <p className="mt-3 text-xs text-black/40">Vybin Premium — coming soon</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-x-hidden pb-24" style={{ background: LIGHT_BG }}>
      <div className="px-4 pb-4 pt-4 sm:px-5 sm:pb-5 sm:pt-6">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl" style={{ color: MCGILL_RED }}>
                    Calendar
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                    <Crown className="h-3.5 w-3.5" />
                    Premium feature
                  </span>
                </div>

                <p className="mt-1 text-sm text-black/60 sm:text-base">
                  Upload your McGill timetable screenshot and turn it into a clean weekly schedule.
                </p>
                <div className="mt-4 h-[2px] w-24 rounded-full" style={{ background: MCGILL_RED }} />
              </div>

              <button
                onClick={openPremiumCheckout}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-black/75 transition hover:bg-black/5"
              >
                <Lock className="h-4 w-4" />
                Unlock with Stripe
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-8 sm:px-5">
        <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 bg-black/5">
                  <Upload className="h-5 w-5" style={{ color: MCGILL_RED }} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-black">Import your semester schedule</p>
                  <p className="mt-1 text-sm text-black/60">
                    Upload a timetable screenshot in the McGill week-grid format. We extract course code, class time,
                    and location automatically.
                  </p>

                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={(event) => onFileSelected(event.target.files?.[0] ?? null)}
                  />

                  <button
                    onClick={pickFile}
                    disabled={uploading || parsing}
                    className="mt-4 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all duration-150 hover:-translate-y-[1px] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ background: MCGILL_RED }}
                  >
                    {uploading ? "Uploading..." : parsing ? "Extracting..." : "Upload screenshot"}
                  </button>

                  <p className="mt-3 text-xs text-black/45">Supported: PNG/JPG. Use a full timetable screenshot for the best result.</p>

                  {status !== "idle" ? (
                    <div
                      className="mt-4 flex items-start gap-2 rounded-xl border px-4 py-3"
                      style={{
                        borderColor: status === "success" ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.35)",
                        background: status === "success" ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                      }}
                    >
                      {status === "success" ? (
                        <CheckCircle2 className="mt-0.5 h-5 w-5" style={{ color: "rgba(34,197,94,0.95)" }} />
                      ) : (
                        <AlertTriangle className="mt-0.5 h-5 w-5" style={{ color: "rgba(239,68,68,0.95)" }} />
                      )}
                      <div className="text-sm text-black/75">{message}</div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-black">Detected classes</p>
                  <p className="text-sm text-black/55">Review before saving to your calendar.</p>
                </div>
                <span className="rounded-full border border-black/10 bg-black/[0.03] px-2.5 py-1 text-[11px] font-semibold text-black/55">
                  {parsed.length} found
                </span>
              </div>

              {parsed.length ? (
                <div className="mt-4 space-y-3">
                  {parsed.map((entry) => (
                    <div key={`${entry.day}-${entry.course_code}-${entry.startTime}`} className="rounded-xl border border-black/10 bg-black/[0.02] px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-semibold text-black">{entry.course_code}</div>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-black/55">
                          {entry.day}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-black/60">
                        {minutesToLocalTime(entry.startTime)} - {minutesToLocalTime(entry.endTime)}
                      </div>
                      <div className="mt-1 text-sm text-black/60">{entry.location || "Location not detected"}</div>
                    </div>
                  ))}

                  <button
                    onClick={saveToCalendar}
                    disabled={savingClasses}
                    className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all duration-150 hover:-translate-y-[1px] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ background: MCGILL_RED }}
                  >
                    {savingClasses ? "Saving..." : "Save classes to calendar"}
                  </button>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-black/10 bg-black/[0.02] px-4 py-6 text-center text-sm text-black/50">
                  Upload a timetable screenshot to preview your detected classes here.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" style={{ color: MCGILL_RED }} />
                  <p className="font-semibold text-black">Weekly schedule</p>
                </div>
                <p className="mt-1 text-sm text-black/55">{formatWeekRange(weekStart)}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setWeekStart((current) => addDays(current, -7))}
                  className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-black/65 transition hover:bg-black/5"
                >
                  Prev week
                </button>
                <button
                  onClick={() => setWeekStart(getMonday(new Date()))}
                  className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-black/65 transition hover:bg-black/5"
                >
                  This week
                </button>
                <button
                  onClick={() => setWeekStart((current) => addDays(current, 7))}
                  className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-black/65 transition hover:bg-black/5"
                >
                  Next week
                </button>
              </div>
            </div>

            {loadingItems ? (
              <div className="mt-6 flex h-48 items-center justify-center text-black/55">Loading your calendar...</div>
            ) : !placements.length ? (
              <div className="mt-6 rounded-2xl border border-dashed border-black/10 bg-black/[0.02] px-5 py-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50">
                  <Sparkles className="h-6 w-6" style={{ color: MCGILL_RED }} />
                </div>
                <p className="mt-4 font-semibold text-black">No classes scheduled yet</p>
                <p className="mt-1 text-sm text-black/55">
                  Upload your McGill timetable screenshot and save the detected classes to populate your weekly view.
                </p>
              </div>
            ) : (
              <>
                <div className="mt-5 md:hidden">
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {DAY_LABELS.map((label, index) => (
                      <button
                        key={label}
                        onClick={() => setMobileDayIndex(index)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                          mobileDayIndex === index
                            ? "border-[#ED1B2F] bg-[#ED1B2F] text-white"
                            : "border-black/10 bg-white text-black/60 hover:bg-black/5"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 grid grid-cols-[56px_minmax(0,1fr)] gap-3">
                    <div className="relative" style={{ height: `${HOURS.length * MOBILE_PIXELS_PER_HOUR}px` }}>
                      {HOURS.map((hour, index) => (
                        <div
                          key={hour}
                          className="absolute left-0 text-[11px] font-semibold text-black/45"
                          style={{ top: `${index * MOBILE_PIXELS_PER_HOUR - 7}px` }}
                        >
                          {formatTimeLabel(hour)}
                        </div>
                      ))}
                    </div>

                    <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-[#F8F9FB]" style={{ height: `${HOURS.length * MOBILE_PIXELS_PER_HOUR}px` }}>
                      {HOURS.map((hour, index) => (
                        <div
                          key={hour}
                          className="absolute inset-x-0 border-t border-dashed border-black/5"
                          style={{ top: `${index * MOBILE_PIXELS_PER_HOUR}px` }}
                        />
                      ))}

                      {mobilePlacements.map((placement) => {
                        const top = ((placement.startMinutes - HOURS[0] * 60) / 60) * MOBILE_PIXELS_PER_HOUR;
                        const height = ((placement.endMinutes - placement.startMinutes) / 60) * MOBILE_PIXELS_PER_HOUR;

                        return (
                          <div
                            key={placement.id}
                            className="absolute left-3 right-3 rounded-2xl border border-[#ED1B2F]/15 bg-gradient-to-br from-[#ED1B2F] to-[#FF6B7B] px-3 py-3 text-white shadow-md"
                            style={{ top, height: Math.max(height, 56) }}
                          >
                            <div className="text-sm font-bold">{placement.course_code ?? placement.title}</div>
                            <div className="mt-1 text-xs text-white/90">
                              {new Date(placement.start_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} -{" "}
                              {new Date(placement.end_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                            </div>
                            <div className="mt-1 text-xs text-white/90">{placement.location || "Location TBD"}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-5 hidden md:block">
                  <div className="grid grid-cols-[72px_repeat(7,minmax(0,1fr))] gap-2">
                    <div />
                    {DAY_LABELS.map((label, index) => (
                      <div key={label} className="rounded-xl bg-black/[0.03] px-3 py-2 text-center">
                        <div className="text-sm font-semibold text-black">{label}</div>
                        <div className="text-xs text-black/45">
                          {addDays(weekStart, index).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 grid grid-cols-[72px_repeat(7,minmax(0,1fr))] gap-2">
                    <div className="relative" style={{ height: `${HOURS.length * DESKTOP_PIXELS_PER_HOUR}px` }}>
                      {HOURS.map((hour, index) => (
                        <div
                          key={hour}
                          className="absolute left-0 text-xs font-semibold text-black/45"
                          style={{ top: `${index * DESKTOP_PIXELS_PER_HOUR - 7}px` }}
                        >
                          {formatTimeLabel(hour)}
                        </div>
                      ))}
                    </div>

                    {DAY_LABELS.map((label, columnIndex) => (
                      <div
                        key={label}
                        className="relative overflow-hidden rounded-2xl border border-black/10 bg-[#F8F9FB]"
                        style={{ height: `${HOURS.length * DESKTOP_PIXELS_PER_HOUR}px` }}
                      >
                        {HOURS.map((hour, index) => (
                          <div
                            key={hour}
                            className="absolute inset-x-0 border-t border-dashed border-black/5"
                            style={{ top: `${index * DESKTOP_PIXELS_PER_HOUR}px` }}
                          />
                        ))}

                        {placements
                          .filter((placement) => placement.dayIndex === columnIndex)
                          .map((placement) => {
                            const top = ((placement.startMinutes - HOURS[0] * 60) / 60) * DESKTOP_PIXELS_PER_HOUR;
                            const height = ((placement.endMinutes - placement.startMinutes) / 60) * DESKTOP_PIXELS_PER_HOUR;

                            return (
                              <div
                                key={placement.id}
                                className="absolute left-2 right-2 rounded-2xl border border-[#ED1B2F]/15 bg-gradient-to-br from-[#ED1B2F] to-[#FF6B7B] px-3 py-2.5 text-white shadow-sm"
                                style={{ top, height: Math.max(height, 54) }}
                              >
                                <div className="text-sm font-bold leading-tight">{placement.course_code ?? placement.title}</div>
                                <div className="mt-1 text-[11px] text-white/90">
                                  {new Date(placement.start_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} -{" "}
                                  {new Date(placement.end_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                                </div>
                                <div className="mt-1 text-[11px] text-white/90">{placement.location || "Location TBD"}</div>
                              </div>
                            );
                          })}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
