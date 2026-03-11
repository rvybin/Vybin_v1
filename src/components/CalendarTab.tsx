// src/components/CalendarTab.tsx
import { useRef, useState } from "react";
import { CalendarDays, Upload, CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { parseScheduleFromImage, type ParsedClass } from "../lib/scheduleOcr";

const MCGILL_RED = "#ED1B2F";
const LIGHT_BG = "#F6F7F9";

const BUCKET = "calendar_uploads";

// PNG/JPG only (Option A)
const ALLOWED_MIME = new Set(["image/png", "image/jpeg"]);
const MAX_MB = 12;

export function CalendarTab() {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);

  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  const [importId, setImportId] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedClass[]>([]);

  const pickFile = () => fileRef.current?.click();

  const onFileSelected = async (file: File | null) => {
    setStatus("idle");
    setMessage("");
    setParsed([]);
    setImportId(null);

    if (!user) {
      setStatus("error");
      setMessage("You must be signed in to upload a schedule.");
      return;
    }
    if (!file) return;

    // Validate type
    if (!ALLOWED_MIME.has(file.type)) {
      setStatus("error");
      setMessage("Only PNG or JPG images are supported right now.");
      return;
    }

    // Validate size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_MB) {
      setStatus("error");
      setMessage(`File too large. Max size is ${MAX_MB}MB.`);
      return;
    }

    setUploading(true);

    try {
      // 1) Create import row first
      const newImportId = crypto.randomUUID();
      setImportId(newImportId);

      const safeName = (file.name || "schedule")
        .replace(/[^\w.\-]+/g, "_")
        .slice(0, 120);

      const objectPath = `${user.id}/${newImportId}/${Date.now()}_${safeName}`;

      // ✅ MATCH YOUR TABLE COLUMNS:
      // file_path, file_name, file_type, status, error, parsed_json
      const { error: insertErr } = await supabase.from("calendar_imports").insert({
        id: newImportId,
        user_id: user.id,
        status: "uploading",
        file_name: file.name,
        file_type: file.type,
        file_path: objectPath,
        error: null,
        parsed_json: null,
      });

      if (insertErr) throw insertErr;

      // 2) Upload to bucket
      const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(objectPath, file, {
        contentType: file.type,
        upsert: false,
      });

      if (uploadErr) throw uploadErr;

      // 3) Mark uploaded
      const { error: updateErr } = await supabase
        .from("calendar_imports")
        .update({ status: "uploaded", error: null })
        .eq("id", newImportId)
        .eq("user_id", user.id);

      if (updateErr) throw updateErr;

      setStatus("success");
      setMessage("Uploaded! Now extracting your classes…");

      // 4) OCR parse locally
      setParsing(true);
      const classes = await parseScheduleFromImage(file);
      setParsed(classes);

      // Save parsed_json back to the import row (optional but nice)
      await supabase
        .from("calendar_imports")
        .update({
          status: classes.length ? "parsed" : "uploaded",
          parsed_json: classes as any,
        })
        .eq("id", newImportId)
        .eq("user_id", user.id);

      if (!classes.length) {
        setStatus("error");
        setMessage(
          "Upload worked, but we couldn’t detect any classes. Try a clearer screenshot (zoom in / higher resolution)."
        );
      } else {
        setStatus("success");
        setMessage(`Found ${classes.length} class blocks. Next: review + save.`);
      }
    } catch (e: any) {
      console.error(e);

      // also store the error in the import row if we have one
      if (user && importId) {
        await supabase
          .from("calendar_imports")
          .update({ status: "failed", error: e?.message || "Upload failed" })
          .eq("id", importId)
          .eq("user_id", user.id);
      }

      setStatus("error");
      setMessage(e?.message || "Upload failed. Check console for details.");
    } finally {
      setUploading(false);
      setParsing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const saveToCalendar = async () => {
    if (!user || !importId || !parsed.length) return;

    // Your table is `calendar_items` (from your screenshot)
    // Columns shown: user_id, title, course_code, location, notes, start_at, end_at
    // ✅ Do NOT include import_id unless you actually added that column
    const base = new Date();
    const dayToOffset: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

    const rows = parsed.map((c) => {
      const d = new Date(base);
      const offset = (dayToOffset[c.day] - d.getDay() + 7) % 7;
      d.setDate(d.getDate() + offset);

      const [sh, sm] = c.startTime.split(":").map(Number);
      const [eh, em] = c.endTime.split(":").map(Number);

      const start = new Date(d);
      start.setHours(sh, sm, 0, 0);

      const end = new Date(d);
      end.setHours(eh, em, 0, 0);

      return {
        user_id: user.id,
        title: c.title,
        course_code: c.course_code ?? null,
        location: c.location ?? null,
        notes: c.notes ?? null,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
      };
    });

    const { error } = await supabase.from("calendar_items").insert(rows as any);

    if (error) {
      console.error(error);
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("success");
    setMessage("Saved to your calendar! Next we’ll render them in a week view like your screenshot.");
  };

  return (
    <div className="flex-1 overflow-x-hidden pb-24" style={{ background: LIGHT_BG }}>
      {/* Header */}
      <div className="px-4 pb-4 pt-4 sm:px-5 sm:pb-5 sm:pt-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between sm:p-5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: MCGILL_RED }}>
                Calendar
              </h1>
              <p className="text-sm sm:text-base text-black/60 mt-1">Your classes and events — all in one place</p>
              <div className="mt-4 h-[2px] w-24 rounded-full" style={{ background: MCGILL_RED }} />
            </div>

            <div className="hidden sm:flex items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2">
                <CalendarDays className="w-4 h-4" style={{ color: MCGILL_RED }} />
                <span className="text-xs font-semibold text-black/70">Month</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 pb-8 sm:px-5">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-black/10 bg-black/5">
                <Upload className="w-5 h-5" style={{ color: MCGILL_RED }} />
              </div>

              <div className="flex-1">
                <p className="font-semibold text-black">Import your semester schedule</p>
                <p className="text-sm text-black/60 mt-1">
                  Upload a screenshot of your timetable and we’ll build your calendar automatically.
                </p>

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)}
                />

                {/* ✅ More “interactive” button */}
                <button
                  onClick={pickFile}
                  disabled={uploading || parsing}
                  className={[
                    "mt-4 rounded-xl px-4 py-2.5 text-sm font-semibold text-white",
                    "transition-all duration-150",
                    "hover:shadow-md hover:-translate-y-[1px]",
                    "active:translate-y-0 active:shadow-sm",
                    "disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none",
                  ].join(" ")}
                  style={{ background: MCGILL_RED }}
                >
                  {uploading ? "Uploading…" : parsing ? "Extracting…" : "Upload schedule"}
                </button>

                <p className="text-xs text-black/45 mt-3">Supported: PNG/JPG. You’ll review before anything is saved.</p>

                {/* Status message */}
                {status !== "idle" && (
                  <div
                    className="mt-4 rounded-xl border px-4 py-3 flex items-start gap-2"
                    style={{
                      borderColor: status === "success" ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.35)",
                      background: status === "success" ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                    }}
                  >
                    {status === "success" ? (
                      <CheckCircle2 className="w-5 h-5" style={{ color: "rgba(34,197,94,0.95)" }} />
                    ) : (
                      <AlertTriangle className="w-5 h-5" style={{ color: "rgba(239,68,68,0.95)" }} />
                    )}
                    <div className="text-sm text-black/75">{message}</div>
                  </div>
                )}

                {/* Preview */}
                {parsed.length > 0 && (
                  <div className="mt-6">
                    <div className="text-sm font-bold text-black mb-2">Detected classes</div>
                    <div className="rounded-xl border border-black/10 overflow-hidden">
                      {parsed.map((c, idx) => (
                        <div key={idx} className="px-4 py-3 border-b border-black/10 text-sm">
                          <div className="font-semibold text-black">
                            {c.course_code} <span className="text-black/50 font-medium">({c.day})</span>
                          </div>
                          <div className="text-black/60">
                            {c.startTime}–{c.endTime} • {c.location ?? "No location detected"}
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={saveToCalendar}
                      className="mt-4 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all duration-150 hover:shadow-md hover:-translate-y-[1px] active:translate-y-0 active:shadow-sm"
                      style={{ background: MCGILL_RED }}
                    >
                      Save to calendar
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 h-[1px] bg-black/10" />

            <div className="mt-6 text-sm text-black/60">
              Next: render a true week grid view (Mon–Sun, time axis) like your screenshot.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
