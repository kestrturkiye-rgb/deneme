import "server-only";
import type { ForeignLocale } from "./locales";

// Fixed HTTPS destination, no keys, billing account or visitor-time requests.
const endpoint = "https://translate.googleapis.com/translate_a/single";
const protectedText =
  /\{[a-zA-Z]+\}|%s|https?:\/\/[^\s<>]+|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b(?:EN|ISO|IEC|NFPA|ASTM|DIN)(?:[\s/-]*(?:[A-Z]{1,5}[\s/-]*)?\d[\d.:/-]*)+|\b\d{5,}\b|\b(?:K[ıi]vanç(?:\s+Group)?|FIRESTAR|MAXIMUS|OPTIMUS|PRIMUS|STEFAN|SALVATOR|ALEXUS|INDUSTAR|ARCSTAR|METALSTAR|REFSTAR|WILDSTAR|FORESTAR|GORE-TEX|NOMEX|PBI|Kevlar)(?:\s+(?:\d+(?:\.\d+)?|I{1,3}))?/giu;

function mask(source: string) {
  const values: string[] = [];
  const text = source.replace(protectedText, (value) => {
    const token = `KIVANCPRESERVE${String(values.length).padStart(6, "0")}TOKEN`;
    values.push(value);
    return token;
  });
  return {
    text,
    restore(translated: string) {
      let result = translated;
      for (const [i, original] of values.entries()) {
        const token = `KIVANCPRESERVE${String(i).padStart(6, "0")}TOKEN`,
          pattern = new RegExp(token.split("").join("\\s*"), "gi"),
          matches = result.match(pattern);
        if (matches?.length !== 1) throw Error("TRANSLATION_TOKEN_CHANGED");
        result = result.replace(pattern, () => original);
      }
      if (/KIVANCPRESERVE/i.test(result))
        throw Error("TRANSLATION_TOKEN_CHANGED");
      return result;
    },
  };
}

/** Keep paragraph breaks and split long passages without cutting a token. */
function pieces(text: string): string[] {
  const words = text.match(/\S+\s*|\s+/gu) || [],
    chunks: string[] = [];
  let current = "";
  for (const word of words) {
    if (current && encodeURIComponent(current + word).length > 6500) {
      chunks.push(current);
      current = "";
    }
    // A single very long word (e.g. a technical identifier) must not make an
    // unbounded query. Normal model/URL identifiers have already been masked.
    if (encodeURIComponent(word).length > 6500)
      throw Error("TRANSLATION_TEXT_TOO_LONG");
    current += word;
  }
  if (current) chunks.push(current);
  return chunks;
}

async function translatePiece(
  text: string,
  locale: ForeignLocale,
  signal: AbortSignal,
) {
  const url = new URL(endpoint);
  for (const [key, value] of Object.entries({
    client: "gtx",
    sl: "tr",
    tl: locale,
    dt: "t",
    q: text.trim(),
  }))
    url.searchParams.set(key, value);
  const response = await fetch(url, {
    cache: "no-store",
    redirect: "error",
    signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw Error("TRANSLATION_UNAVAILABLE");
  const raw = await response.text();
  if (raw.length > 150_000) throw Error("TRANSLATION_INVALID_RESPONSE");
  const data: unknown = JSON.parse(raw);
  if (!Array.isArray(data) || !Array.isArray(data[0]) || !data[0].length)
    throw Error("TRANSLATION_INVALID_RESPONSE");
  const translated = data[0]
    .map((row: unknown) => {
      if (!Array.isArray(row) || typeof row[0] !== "string")
        throw Error("TRANSLATION_INVALID_RESPONSE");
      return row[0];
    })
    .join("")
    .trim();
  if (
    !translated ||
    translated.length > 40_000 ||
    /<\/?(?:script|iframe)\b/i.test(translated)
  )
    throw Error("TRANSLATION_INVALID_RESPONSE");
  return (
    (text.match(/^\s*/)?.[0] || "") +
    translated +
    (text.match(/\s*$/)?.[0] || "")
  );
}

export async function automaticTranslation(
  source: string,
  locale: ForeignLocale,
  signal: AbortSignal,
) {
  if (/KIVANCPRESERVE/i.test(source)) throw Error("TRANSLATION_RESERVED_TOKEN");
  const protectedSource = mask(source),
    paragraphs = protectedSource.text.split(/(\n+)/),
    result: string[] = [];
  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      result.push(paragraph);
      continue;
    }
    // Brand names, standards and codes alone need no external translation.
    if (!paragraph.replace(/KIVANCPRESERVE\d{6}TOKEN/g, "").match(/\p{L}/u)) {
      result.push(paragraph);
      continue;
    }
    for (const piece of pieces(paragraph))
      result.push(await translatePiece(piece, locale, signal));
  }
  const translated = protectedSource.restore(result.join(""));
  if (translated.length > 40_000) throw Error("TRANSLATION_TEXT_TOO_LONG");
  return translated;
}
