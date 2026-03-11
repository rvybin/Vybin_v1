import { X, Calendar, MapPin, Award, ExternalLink, Tag } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

interface Event {
  id: string;
  title: string;
  description: string;
  event_type?: string | null;
  organization?: string | null;
  location?: string | null;
  date: string;
  deadline?: string | null;
  image_url?: string | null;
  prize?: string | null;
  tags?: string[] | null;
  link?: string | null;
}

interface EventModalProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
  isApplied?: boolean;
  onMarkApplied?: (event: Event) => Promise<void> | void;
  markingApplied?: boolean;
}

export function EventModal({
  event,
  isOpen,
  onClose,
  isApplied = false,
  onMarkApplied,
  markingApplied = false,
}: EventModalProps) {
  const MCGILL_RED = "#ED1B2F";

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen || !event) return null;

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
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center p-2 sm:items-center sm:p-4">
      <button
        aria-label="Close"
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm cursor-default"
      />

      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-[24px] border border-black/10 bg-white shadow-2xl sm:rounded-3xl"
        style={{ maxHeight: "min(92vh, 860px)", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="relative border-b border-black/10">
          <div className="px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="break-words text-lg font-extrabold tracking-tight text-black sm:text-2xl">
                  {event.title}
                </h2>
                {event.organization && (
                  <p className="text-sm text-black/60 mt-1">{event.organization}</p>
                )}
              </div>

              <button
                onClick={onClose}
                className="rounded-full bg-white border border-black/10 p-2 hover:bg-black/5 transition"
                title="Close"
              >
                <X className="h-5 w-5 text-black/70" />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {event.event_type ? (
                <span
                  className="px-3 py-1 rounded-full text-xs font-semibold border"
                  style={{ borderColor: "rgba(0,0,0,0.12)", color: MCGILL_RED }}
                >
                  {event.event_type}
                </span>
              ) : null}
            </div>
          </div>

          {/* red accent line */}
          <div className="h-[2px]" style={{ background: MCGILL_RED }} />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Hero image */}
          {event.image_url && (
            <div
              className="w-full h-48 sm:h-56 rounded-2xl border border-black/10 bg-cover bg-center mb-5"
              style={{
                backgroundImage: `url(${event.image_url})`,
              }}
            />
          )}

          <div className="space-y-4">
            <div className="grid gap-2">
              <div className="flex items-center gap-2 text-sm text-black/70">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(event.date)}</span>
              </div>

              <div className="flex items-start gap-2 text-sm text-black/70">
                <MapPin className="w-4 h-4" />
                <span className="break-words">{event.location ?? "McGill University"}</span>
              </div>

              {event.prize && (
                <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: MCGILL_RED }}>
                  <Award className="w-4 h-4" />
                  <span>{event.prize}</span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-black/10">
              <h3 className="text-sm font-bold text-black">About</h3>
              <p className="mt-2 text-sm leading-relaxed text-black/75 whitespace-pre-line">
                {stripHTML(event.description)}
              </p>
            </div>

            {event.tags && event.tags.length > 0 && (
              <div className="pt-2 border-t border-black/10">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-black/60" />
                  <h3 className="text-sm font-bold text-black">Tags</h3>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {event.tags.map((tag, i) => (
                    <span
                      key={`${tag}-${i}`}
                      className="px-3 py-1 rounded-full text-xs font-semibold border bg-white"
                      style={{ borderColor: "rgba(0,0,0,0.12)", color: "rgba(0,0,0,0.7)" }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer CTA */}
        <div className="border-t border-black/10 bg-white p-4 sm:p-5">
          <div className="flex flex-col gap-3">
            {event.link ? (
              <a
                href={event.link}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl py-3 font-semibold text-white transition hover:opacity-90"
                style={{ background: MCGILL_RED }}
              >
                <ExternalLink className="h-5 w-5" />
                Open Event Link
              </a>
            ) : (
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] px-4 py-3 text-sm text-black/60">
                No external event link was provided for this event.
              </div>
            )}

            {onMarkApplied ? (
              <button
                onClick={() => onMarkApplied(event)}
                disabled={isApplied || markingApplied}
                className="w-full rounded-2xl py-3 font-semibold border border-black/15 bg-white transition hover:bg-black/5 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isApplied ? "Applied" : markingApplied ? "Marking..." : "Mark as Applied"}
              </button>
            ) : null}

            {!event.link && !onMarkApplied ? (
              <button
                onClick={onClose}
                className="w-full rounded-2xl py-3 font-semibold border border-black/15 bg-white hover:bg-black/5 transition"
              >
                Close
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
