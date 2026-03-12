import { createWorker } from "tesseract.js";

export type ParsedClass = {
  day: "MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU";
  title: string;
  course_code: string;
  location?: string | null;
  startTime: string;
  endTime: string;
  notes?: string | null;
};

type DayCode = ParsedClass["day"];

type OcrWord = {
  text: string;
  bbox?: { x0: number; y0: number; x1: number; y1: number };
  confidence?: number;
};

const DAYS: DayCode[] = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
const DAY_NAMES: Record<DayCode, string> = {
  MO: "monday",
  TU: "tuesday",
  WE: "wednesday",
  TH: "thursday",
  FR: "friday",
  SA: "saturday",
  SU: "sunday",
};

function normalizeText(value: string) {
  return (value ?? "")
    .toLowerCase()
    .replace(/[|]/g, "i")
    .replace(/[^\w:\- ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanDisplayText(value: string) {
  return (value ?? "")
    .replace(/[^\w\s:&()\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function padTime(hours: number, minutes: number) {
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function to24Hour(hours: number, minutes: number, meridiem: string) {
  let h = hours;
  const ap = meridiem.toLowerCase();
  if (ap === "pm" && h !== 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  return padTime(h, minutes);
}

function parseTimeRange(line: string): { start: string; end: string } | null {
  const normalized = line
    .replace(/[–—]/g, "-")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  const withMeridiem =
    normalized.match(
      /(\d{1,2}):(\d{2})\s*(am|pm)\s*-\s*(\d{1,2}):(\d{2})\s*(am|pm)/i
    ) ||
    normalized.match(
      /(\d{1,2}):(\d{2})\s*(am|pm)\s*-\s*(\d{1,2}):(\d{2})/i
    );

  if (withMeridiem) {
    const [, sh, sm, sap, eh, em, eap] = withMeridiem;
    return {
      start: to24Hour(Number(sh), Number(sm), sap),
      end: to24Hour(Number(eh), Number(em), eap ?? sap),
    };
  }

  const withoutMeridiem = normalized.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/i);
  if (!withoutMeridiem) return null;

  const [, sh, sm, eh, em] = withoutMeridiem;
  return {
    start: padTime(Number(sh), Number(sm)),
    end: padTime(Number(eh), Number(em)),
  };
}

function isHourLabel(line: string) {
  return /^(\d{1,2})(?::\d{2})?\s*(am|pm)$/i.test(normalizeText(line));
}

function normalizeCourseToken(value: string) {
  return value
    .replace(/(?<=\d)[oO](?=\d)/g, "0")
    .replace(/(?<=\d)[iIlL](?=\d)/g, "1")
    .replace(/[–—]/g, "-");
}

function parseCourseCode(line: string): string | null {
  const cleaned = normalizeCourseToken(cleanDisplayText(line).toUpperCase());

  const direct = cleaned.match(/\b([A-Z]{3,5})\s*(\d{3})[- ](\d{3})\b/);
  if (direct) return `${direct[1]} ${direct[2]}-${direct[3]}`;

  const compact = cleaned.match(/\b([A-Z]{3,5})(\d{3})(\d{3})\b/);
  if (compact) return `${compact[1]} ${compact[2]}-${compact[3]}`;

  return null;
}

function cleanLocation(value: string) {
  let cleaned = cleanDisplayText(value)
    .replace(/\b\d+\s*times?\b/gi, "")
    .replace(/\bhrs?\/wk\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  cleaned = cleaned
    .replace(/\bstrathcona anatomy dentistry\b/gi, "Strathcona Anatomy & Dentistry")
    .replace(/\badams building\b/gi, "Adams Building")
    .replace(/\bleacock building\b/gi, "Leacock Building")
    .replace(/\bmaass chemistry building\b/gi, "Maass Chemistry Building")
    .replace(/\bwong building\b/gi, "Wong Building")
    .replace(/\btrottier building\b/gi, "Trottier Building")
    .trim();

  return cleaned.length > 72 ? cleaned.slice(0, 72).trim() : cleaned;
}

async function fileToImageBitmap(file: File): Promise<ImageBitmap> {
  const url = URL.createObjectURL(file);
  try {
    const blob = await fetch(url).then((r) => r.blob());
    return await createImageBitmap(blob);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function preprocessToPng(file: File): Promise<Blob> {
  const bitmap = await fileToImageBitmap(file);

  const targetWidth = 4200;
  const scale = Math.max(1, Math.min(4, targetWidth / bitmap.width));

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported in this browser.");

  ctx.filter = "grayscale(1) contrast(1.95) brightness(1.12)";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Image preprocessing failed."))), "image/png", 1);
  });
}

function buildColumnLinesFromWords(words: OcrWord[]): Record<DayCode, string[]> | null {
  const output: Record<DayCode, string[]> = {
    MO: [],
    TU: [],
    WE: [],
    TH: [],
    FR: [],
    SA: [],
    SU: [],
  };

  const headers = DAYS.map((day) => {
    const headerWord = words.find((word) => normalizeText(word.text) === DAY_NAMES[day] && word.bbox);
    if (!headerWord?.bbox) return null;
    return {
      day,
      centerX: (headerWord.bbox.x0 + headerWord.bbox.x1) / 2,
      centerY: (headerWord.bbox.y0 + headerWord.bbox.y1) / 2,
    };
  }).filter(Boolean) as { day: DayCode; centerX: number; centerY: number }[];

  if (headers.length < 5) return null;

  const orderedHeaders = [...headers].sort((a, b) => a.centerX - b.centerX);
  const bounds = orderedHeaders.map((header, index) => {
    const previous = orderedHeaders[index - 1];
    const next = orderedHeaders[index + 1];
    return {
      day: header.day,
      startX: previous ? (previous.centerX + header.centerX) / 2 : header.centerX - 140,
      endX: next ? (header.centerX + next.centerX) / 2 : header.centerX + 140,
      minY: header.centerY + 8,
    };
  });

  const firstColumnStart = Math.min(...bounds.map((bound) => bound.startX));
  const groupedByDay = new Map<DayCode, { y: number; words: { x: number; text: string }[] }[]>();

  for (const bound of bounds) groupedByDay.set(bound.day, []);

  for (const word of words) {
    if (!word.bbox) continue;

    const normalizedWord = normalizeText(word.text);
    if (!normalizedWord) continue;

    const centerX = (word.bbox.x0 + word.bbox.x1) / 2;
    const centerY = (word.bbox.y0 + word.bbox.y1) / 2;

    if (centerX < firstColumnStart - 10 && isHourLabel(normalizedWord)) continue;

    const bound = bounds.find((candidate) => centerX >= candidate.startX && centerX < candidate.endX);
    if (!bound || centerY <= bound.minY) continue;

    const bucket = groupedByDay.get(bound.day);
    if (!bucket) continue;

    const existingLine = bucket.find((line) => Math.abs(line.y - centerY) <= 12);
    const payload = { x: word.bbox.x0, text: cleanDisplayText(word.text) };

    if (existingLine) {
      existingLine.words.push(payload);
    } else {
      bucket.push({ y: centerY, words: [payload] });
    }
  }

  for (const day of DAYS) {
    const lines = groupedByDay.get(day) ?? [];
    lines
      .sort((a, b) => a.y - b.y)
      .forEach((line) => {
        const text = line.words
          .sort((a, b) => a.x - b.x)
          .map((word) => word.text)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();

        if (text) output[day].push(text);
      });
  }

  return output;
}

function parseDayColumn(day: DayCode, lines: string[]): ParsedClass[] {
  const results: ParsedClass[] = [];

  for (let index = 0; index < lines.length; index++) {
    const current = lines[index];
    if (isHourLabel(current)) continue;

    const courseCode = parseCourseCode(current);
    if (!courseCode) continue;

    let timeRange: { start: string; end: string } | null = null;
    let timeLineIndex = -1;

    for (let probe = index; probe < Math.min(index + 6, lines.length); probe++) {
      const parsed = parseTimeRange(lines[probe]);
      if (parsed) {
        timeRange = parsed;
        timeLineIndex = probe;
        break;
      }
    }

    if (!timeRange) continue;

    const noteLines = lines
      .slice(index + 1, timeLineIndex)
      .filter((line) => !parseCourseCode(line) && !isHourLabel(line))
      .map(cleanDisplayText)
      .filter(Boolean);

    const locationLines: string[] = [];
    for (let probe = timeLineIndex + 1; probe < Math.min(timeLineIndex + 5, lines.length); probe++) {
      const line = lines[probe];
      if (!line || isHourLabel(line) || parseTimeRange(line)) continue;
      if (parseCourseCode(line)) break;
      locationLines.push(line);
    }

    const location = locationLines.length ? cleanLocation(locationLines.join(" ")) : null;
    const notes = noteLines.length ? noteLines.join(" | ") : null;

    results.push({
      day,
      title: courseCode,
      course_code: courseCode,
      location,
      startTime: timeRange.start,
      endTime: timeRange.end,
      notes,
    });

    index = Math.max(index, timeLineIndex);
  }

  const seen = new Set<string>();
  return results.filter((entry) => {
    const key = `${entry.day}|${entry.course_code}|${entry.startTime}|${entry.endTime}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function parseScheduleFromImage(file: File): Promise<ParsedClass[]> {
  const image = await preprocessToPng(file);
  const worker: any = await createWorker("eng");

  try {
    await worker.setParameters({
      tessedit_pageseg_mode: "11",
      preserve_interword_spaces: "1",
    } as any);

    const result = await worker.recognize(image);
    const words = (((result as any)?.data?.words ?? []) as OcrWord[]).filter((word) => word.text?.trim());
    const columns = buildColumnLinesFromWords(words);

    if (!columns) return [];

    const parsed = DAYS.flatMap((day) => parseDayColumn(day, columns[day]));

    return parsed.sort((a, b) => {
      const dayOrder = DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
      if (dayOrder !== 0) return dayOrder;
      return a.startTime.localeCompare(b.startTime);
    });
  } finally {
    await worker.terminate();
  }
}
