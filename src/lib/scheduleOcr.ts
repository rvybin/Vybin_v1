// src/lib/scheduleOcr.ts
import { createWorker } from "tesseract.js";

export type ParsedClass = {
  day: "MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU";
  title: string;
  course_code: string;
  location?: string | null;
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  notes?: string | null;
};

const DAYS: ParsedClass["day"][] = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];

function normalize(s: string) {
  return (s ?? "")
    .toLowerCase()
    .replace(/[^\w:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function to24(hm: string, ap?: string) {
  const [h0, m0] = hm.split(":").map(Number);
  let h = h0;
  const a = (ap ?? "").toLowerCase();
  if (a === "pm" && h !== 12) h += 12;
  if (a === "am" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${String(m0).padStart(2, "0")}`;
}

function pad24(hm: string) {
  const [h, m] = hm.split(":");
  return `${String(Number(h)).padStart(2, "0")}:${m}`;
}

function parseTimeRange(line: string): { start: string; end: string } | null {
  const x = line.replace(/\s+/g, " ").trim();

  const m =
    x.match(/(\d{1,2}:\d{2})\s*(am|pm)?\s*[-–]\s*(\d{1,2}:\d{2})\s*(am|pm)?/i) ||
    x.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/i);

  if (!m) return null;

  const t1 = m[1];
  const ap1 = m[2];
  const t2 = (m[3] ?? m[2]) as string;
  const ap2 = m[4];

  const start = ap1 ? to24(t1, ap1) : pad24(t1);
  const end = ap2 ? to24(t2, ap2) : pad24(t2);

  return { start, end };
}

function looksLikeHourLabel(line: string) {
  const n = normalize(line);
  return /^(\d{1,2})(am|pm)$/.test(n);
}

/**
 * Merge "C O M P" -> "COMP"
 * and also normalize common OCR digit/letter confusions in numeric parts.
 */
function squashSpacedLetters(raw: string) {
  const tokens = raw.split(/\s+/).filter(Boolean);

  const out: string[] = [];
  let buf: string[] = [];

  const flush = () => {
    if (buf.length) {
      out.push(buf.join(""));
      buf = [];
    }
  };

  for (const t of tokens) {
    if (/^[A-Za-z]$/.test(t)) {
      buf.push(t);
    } else {
      flush();
      out.push(t);
    }
  }
  flush();

  return out.join(" ");
}

function fixOcrDigits(s: string) {
  // Only apply in number-ish contexts (keeps building names intact)
  // Replace O->0, I/l->1 when adjacent to digits or hyphens.
  return s
    .replace(/(?<=\d)[Oo](?=\d)/g, "0")
    .replace(/(?<=\d)[Il](?=\d)/g, "1")
    .replace(/(?<=-)[Oo](?=\d)/g, "0")
    .replace(/(?<=-)[Il](?=\d)/g, "1")
    .replace(/(?<=\d)[Oo](?=-)/g, "0")
    .replace(/(?<=\d)[Il](?=-)/g, "1");
}

function parseCourseCode(line: string): string | null {
  // Clean and stabilize spacing/dashes
  let raw = line.replace(/[^\w\s-–]/g, " ").replace(/\s+/g, " ").trim();
  raw = squashSpacedLetters(raw);
  raw = fixOcrDigits(raw);

  const u = raw.toUpperCase().replace(/–/g, "-");

  // direct: "MATH 141-002" / "COMP 202-001" / "WCOM 206-716"
  const m1 = u.match(/\b([A-Z]{3,5})\s*(\d{3})-(\d{3})\b/);
  if (m1) return `${m1[1]}${m1[2]}-${m1[3]}`;

  // glued: "MATH141002" => "MATH141-002"
  const m2 = u.match(/\b([A-Z]{3,5})(\d{3})(\d{3})\b/);
  if (m2) return `${m2[1]}${m2[2]}-${m2[3]}`;

  return null;
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
  const bmp = await fileToImageBitmap(file);

  const targetMaxW = 4200;
  const scale = Math.max(1, Math.min(4, targetMaxW / bmp.width));

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  // keep thin blue text readable
  ctx.filter = "grayscale(1) contrast(1.85) brightness(1.12)";
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);

  const out = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png", 1);
  });

  return out;
}

/**
 * More reliable column splitter:
 * - finds weekday header line
 * - uses detected weekday start positions
 * - builds column boundaries using midpoints between starts
 * - interpolates missing day starts (rare)
 */
function splitTextIntoDayColumns(text: string): Record<ParsedClass["day"], string[]> {
  const lines = (text ?? "").replace(/\r/g, "").split("\n");

  const out: Record<ParsedClass["day"], string[]> = {
    MO: [],
    TU: [],
    WE: [],
    TH: [],
    FR: [],
    SA: [],
    SU: [],
  };

  // Find a header line with multiple weekday names
  const headerIdx = lines.findIndex((l) => {
    const low = l.toLowerCase();
    const hits =
      (low.includes("monday") ? 1 : 0) +
      (low.includes("tuesday") ? 1 : 0) +
      (low.includes("wednesday") ? 1 : 0) +
      (low.includes("thursday") ? 1 : 0) +
      (low.includes("friday") ? 1 : 0);
    return hits >= 3;
  });

  if (headerIdx === -1) return out;

  const header = lines[headerIdx];

  // Establish a stable line length for slicing
  const lineLen = Math.max(
    header.length,
    ...lines.slice(headerIdx, headerIdx + 60).map((l) => l.length)
  );

  // Raw detected starts
  const detected: Record<ParsedClass["day"], number> = {
    MO: header.toLowerCase().indexOf("monday"),
    TU: header.toLowerCase().indexOf("tuesday"),
    WE: header.toLowerCase().indexOf("wednesday"),
    TH: header.toLowerCase().indexOf("thursday"),
    FR: header.toLowerCase().indexOf("friday"),
    SA: header.toLowerCase().indexOf("saturday"),
    SU: header.toLowerCase().indexOf("sunday"),
  };

  // List of found starts (for step estimation)
  const found = DAYS.map((d, idx) => ({ d, idx, pos: detected[d] }))
    .filter((x) => x.pos >= 0)
    .sort((a, b) => a.pos - b.pos);

  if (found.length < 3) return out;

  // Estimate average step between day columns
  let stepSum = 0;
  let stepCount = 0;
  for (let i = 0; i < found.length - 1; i++) {
    const a = found[i];
    const b = found[i + 1];
    const idxGap = Math.max(1, b.idx - a.idx);
    stepSum += (b.pos - a.pos) / idxGap;
    stepCount++;
  }
  const avgStep = stepCount ? stepSum / stepCount : Math.max(12, Math.floor(lineLen / 7));

  // Fill starts for all 7 days (interpolate / extrapolate if missing)
  const starts: number[] = new Array(7).fill(-1);
  for (const f of found) starts[f.idx] = f.pos;

  // Left-to-right fill
  for (let i = 0; i < 7; i++) {
    if (starts[i] >= 0) continue;

    // find nearest left and right known
    let L = i - 1;
    while (L >= 0 && starts[L] < 0) L--;
    let R = i + 1;
    while (R < 7 && starts[R] < 0) R++;

    if (L >= 0 && R < 7) {
      // interpolate
      const t = (i - L) / (R - L);
      starts[i] = Math.round(starts[L] + t * (starts[R] - starts[L]));
    } else if (L >= 0) {
      starts[i] = Math.round(starts[L] + avgStep * (i - L));
    } else if (R < 7) {
      starts[i] = Math.round(starts[R] - avgStep * (R - i));
    } else {
      starts[i] = Math.round(i * avgStep);
    }
  }

  // Build bounds using MIDPOINTS (this is the key fix)
  const bounds = starts.map((s, i) => {
    const next = i < 6 ? starts[i + 1] : lineLen;
    const e = i < 6 ? Math.round((s + next) / 2) : lineLen;
    const prev = i > 0 ? starts[i - 1] : 0;
    const ss = i > 0 ? Math.round((prev + s) / 2) : Math.max(0, s);
    return { s: Math.max(0, ss), e: Math.max(0, e) };
  });

  // Slice every line under the header
  for (let li = headerIdx + 1; li < lines.length; li++) {
    const l = lines[li].padEnd(lineLen, " ");

    for (let di = 0; di < 7; di++) {
      const seg = l.slice(bounds[di].s, bounds[di].e);
      const trimmed = seg.replace(/\s+/g, " ").trim();
      if (trimmed) out[DAYS[di]].push(trimmed);
    }
  }

  return out;
}

function cleanLocation(raw: string): string {
  let s = raw.replace(/\s+/g, " ").trim();

  // Drop obvious non-location noise
  s = s
    .replace(/\b(\d+\s*times?|hrs?\/wk)\b/gi, "")
    .replace(/\b(am|pm)\b/gi, "")
    .replace(/\b\d{1,2}:\d{2}\b/g, "")
    .replace(/\s+[-–]\s+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // If we have a "Building" phrase, keep from that phrase onward
  const buildingIdx = s.toLowerCase().indexOf("building");
  if (buildingIdx !== -1) {
    // keep a bit before "Building" (e.g., "Adams Building AUD 4817")
    const start = Math.max(0, buildingIdx - 20);
    s = s.slice(start).trim();
  }

  // Normalize known McGill quirks
  s = s
    .replace(/\bstrathcona anatomy dentistry\b/gi, "Strathcona Anatomy & Dentistry")
    .replace(/\bmaass\b/gi, "Maass")
    .replace(/\bleacock\b/gi, "Leacock")
    .replace(/\bwong\b/gi, "Wong")
    .replace(/\btrotter\b/gi, "Trottier")
    .trim();

  // Avoid absurdly long locations (means leakage)
  if (s.length > 60) s = s.slice(0, 60).trim();

  return s;
}

/**
 * Parse one day's column lines into class entries.
 */
function parseDayColumn(day: ParsedClass["day"], lines: string[]): ParsedClass[] {
  const res: ParsedClass[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (looksLikeHourLabel(line)) continue;

    const code = parseCourseCode(line);
    if (!code) continue;

    // find time within next few lines
    let time: { start: string; end: string } | null = null;
    let tIdx = -1;

    for (let j = i; j < Math.min(i + 10, lines.length); j++) {
      const tr = parseTimeRange(lines[j]);
      if (tr) {
        time = tr;
        tIdx = j;
        break;
      }
    }

    if (!time) continue;

    // location is usually next line after time, but can be 2 lines after
    let location: string | null = null;

    for (let k = tIdx + 1; k < Math.min(tIdx + 5, lines.length); k++) {
      const cand = lines[k].trim();
      if (!cand) continue;
      if (looksLikeHourLabel(cand)) continue;
      if (parseTimeRange(cand)) continue;

      // stop if next class starts
      if (parseCourseCode(cand)) break;

      const n = normalize(cand);
      if (n.length < 3) continue;

      // prefer lines with building-ish words
      const buildingish =
        /building|strathcona|dentistry|leacock|wong|trottier|maass|adams/i.test(cand);

      if (buildingish) {
        location = cleanLocation(cand);
        break;
      }

      // fallback: first reasonable line
      if (!location && n.length <= 80) {
        location = cleanLocation(cand);
      }
    }

    res.push({
      day,
      title: code,
      course_code: code,
      location: location || null,
      startTime: time.start,
      endTime: time.end,
      notes: null,
    });

    // jump forward so we don't double-detect
    i = Math.max(i, tIdx);
  }

  // dedupe
  const key = (x: ParsedClass) => `${x.day}|${x.course_code}|${x.startTime}|${x.endTime}`;
  const seen = new Set<string>();
  return res.filter((x) => {
    const k = key(x);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export async function parseScheduleFromImage(file: File): Promise<ParsedClass[]> {
  const img = await preprocessToPng(file);

  const worker: any = await createWorker("eng");
  try {
    await worker.setParameters(
      {
        tessedit_pageseg_mode: "6",
        preserve_interword_spaces: "1",
      } as any
    );

    const result = await worker.recognize(img);
    const fullText: string = (result as any)?.data?.text ?? "";

    const cols = splitTextIntoDayColumns(fullText);

    const out: ParsedClass[] = [];
    for (const d of DAYS) {
      out.push(...parseDayColumn(d, cols[d]));
    }

    return out;
  } finally {
    await worker.terminate();
  }
}
