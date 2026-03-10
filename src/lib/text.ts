// src/lib/text.ts

// Decode HTML entities (named + numeric) safely
export function decodeText(input?: string | null) {
  if (!input) return "";

  let s = String(input);

  // Numeric entities: &#233; and &#x00E9;
  s = s
    .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, n) => String.fromCharCode(parseInt(n, 16)));

  // Named entities (common ones you’ll see in event descriptions)
  const map: Record<string, string> = {
    nbsp: " ",
    amp: "&",
    quot: '"',
    apos: "'",
    lt: "<",
    gt: ">",

    rsquo: "'",
    lsquo: "'",
    rdquo: '"',
    ldquo: '"',

    ndash: "–",
    mdash: "—",
    hellip: "…",
    bull: "•",
    laquo: "«",
    raquo: "»",

    // Accents (French + common)
    eacute: "é",
    egrave: "è",
    ecirc: "ê",
    euml: "ë",
    aacute: "á",
    agrave: "à",
    acirc: "â",
    auml: "ä",
    ccedil: "ç",
    icirc: "î",
    iuml: "ï",
    ocirc: "ô",
    ouml: "ö",
    uacute: "ú",
    ugrave: "ù",
    ucirc: "û",
    uuml: "ü",
  };

  s = s.replace(/&([a-zA-Z]+);/g, (m, name) => {
    const key = String(name).toLowerCase();
    return key in map ? map[key] : m;
  });

  // Collapse weird spacing that comes from &nbsp; etc
  return s.replace(/\s+/g, " ").trim();
}

// Remove html tags + decode entities + shorten safely
export function cleanDescription(input?: string | null, maxLen = 140) {
  const decoded = decodeText(input);

  const noHtml = decoded
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (noHtml.length <= maxLen) return noHtml;
  return noHtml.slice(0, maxLen).trimEnd() + "…";
}

