type CalendarItem = {
  course_code: string | null;
  title: string;
  start_at: string;
  end_at: string;
  rrule: string | null;
};

const DAY_CODES = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"] as const;

function jsDayToIndex(jsDay: number): number {
  return (jsDay + 6) % 7;
}

function getRRuleDayIndex(rrule: string | null): number | null {
  if (!rrule) return null;
  const m = rrule.match(/BYDAY=([A-Z]{2})/);
  if (!m) return null;
  const idx = DAY_CODES.indexOf(m[1] as (typeof DAY_CODES)[number]);
  return idx >= 0 ? idx : null;
}

function parseEventTime(timeStr: string | null | undefined): { start: number; end: number } | null {
  if (!timeStr) return null;
  const m = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?(?:\s*[-–]\s*(\d{1,2}):(\d{2})\s*(AM|PM)?)?/i);
  if (!m) return null;
  const [, sh, sm, sAP, eh, em, eAP] = m;

  let sH = parseInt(sh, 10);
  const sM = parseInt(sm, 10);
  const sSuffix = sAP?.toUpperCase();
  if (sSuffix === "PM" && sH !== 12) sH += 12;
  if (sSuffix === "AM" && sH === 12) sH = 0;
  const startMinutes = sH * 60 + sM;

  let endMinutes: number;
  if (eh) {
    let eH = parseInt(eh, 10);
    const eM = parseInt(em, 10);
    const eSuffix = (eAP ?? sAP)?.toUpperCase();
    if (eSuffix === "PM" && eH !== 12) eH += 12;
    if (eSuffix === "AM" && eH === 12) eH = 0;
    endMinutes = eH * 60 + eM;
  } else {
    endMinutes = startMinutes + 90;
  }

  return { start: startMinutes, end: endMinutes };
}

function isoToMinutes(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

export function findConflicts(
  event: { date: string | null; time?: string | null },
  calendarItems: CalendarItem[]
): string[] {
  if (!event.date || !calendarItems.length) return [];

  const eventDate = new Date(event.date);
  const eventDayIdx = jsDayToIndex(eventDate.getDay());
  const eventTime = parseEventTime(event.time);

  // Without a parseable event time we cannot confirm an overlap — stay silent.
  if (!eventTime) return [];

  const conflicts: string[] = [];

  for (const item of calendarItems) {
    const itemDayIdx = getRRuleDayIndex(item.rrule);
    if (itemDayIdx === null || itemDayIdx !== eventDayIdx) continue;

    const classStart = isoToMinutes(item.start_at);
    const classEnd = isoToMinutes(item.end_at);
    const overlaps = !(eventTime.end <= classStart || eventTime.start >= classEnd);
    if (overlaps) conflicts.push(item.course_code ?? item.title);
  }

  return [...new Set(conflicts)];
}
