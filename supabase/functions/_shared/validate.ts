/** Input validation and sanitization helpers. */

/** Escape HTML entities to prevent XSS in server-rendered HTML. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * SSRF protection — returns false for loopback, private RFC-1918 ranges,
 * link-local (169.254.x.x / cloud metadata), and non-HTTP(S) schemes.
 */
export function isSafeExternalUrl(raw: unknown): boolean {
  if (typeof raw !== "string" || raw.length > 2048) return false;
  let url: URL;
  try { url = new URL(raw); } catch { return false; }

  if (url.protocol !== "http:" && url.protocol !== "https:") return false;

  const h = url.hostname.toLowerCase();
  if (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "::1" ||
    h === "0.0.0.0" ||
    // 10.0.0.0/8
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h) ||
    // 172.16.0.0/12
    /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(h) ||
    // 192.168.0.0/16
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(h) ||
    // 169.254.0.0/16 — AWS/GCP instance metadata + link-local
    /^169\.254\./.test(h) ||
    // IPv6 private (ULA fc00::/7, link-local fe80::/10)
    /^fe[89ab]/i.test(h) ||
    /^fc/i.test(h)
  ) return false;

  return true;
}

/** Returns an error message if the value is not a non-empty string within length. */
export function requireString(
  value: unknown,
  field: string,
  maxLen: number,
  minLen = 1
): string | null {
  if (typeof value !== "string") return `${field} must be a string`;
  if (value.trim().length < minLen) return `${field} is required`;
  if (value.length > maxLen) return `${field} exceeds maximum length of ${maxLen}`;
  return null;
}

/**
 * Validate a Claude messages array:
 * - Must be a non-empty array
 * - Max 50 messages
 * - Each message must have role ("user"|"assistant") and string content
 * - Each content capped at 8000 characters
 */
export function validateMessages(messages: unknown): string | null {
  if (!Array.isArray(messages)) return "messages must be an array";
  if (messages.length === 0) return "messages must not be empty";
  if (messages.length > 50) return "messages exceeds maximum of 50 items";

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (typeof m !== "object" || m === null) return `messages[${i}] must be an object`;
    const { role, content } = m as Record<string, unknown>;
    if (role !== "user" && role !== "assistant") {
      return `messages[${i}].role must be "user" or "assistant"`;
    }
    if (typeof content !== "string") return `messages[${i}].content must be a string`;
    if (content.length > 8000) return `messages[${i}].content exceeds 8000 characters`;
  }

  return null;
}
