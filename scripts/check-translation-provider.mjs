import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

// This separate check contacts the real free service with fixed public sample
// text. It never reads/writes CMS data, credentials, products or inquiries.
const sourceModule = (
  await readFile("src/i18n/automatic.server.ts", "utf8")
).replace(/^import "server-only";\s*/m, "");
const { outputText } = ts.transpileModule(sourceModule, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  },
});
const { automaticTranslation } = await import(
  "data:text/javascript;base64," + Buffer.from(outputText).toString("base64")
);
const source =
  "Maximus 2.0 (832551): EN 469 standardına uygun koruyucu kıyafet. {count} seçenek için https://example.com/details adresini inceleyin.";
try {
  for (const locale of ["en", "es", "ar", "de"]) {
    const text = await automaticTranslation(
      source,
      locale,
      AbortSignal.timeout(18_000),
    );
    assert.notEqual(text, source, "Provider must return a translation");
    if (locale === "ar")
      assert(
        /[\u0600-\u06ff]/.test(text),
        "Arabic translation must contain Arabic text",
      );
    for (const token of [
      "Maximus 2.0",
      "832551",
      "EN 469",
      "{count}",
      "https://example.com/details",
    ])
      assert(text.includes(token), locale + " changed " + token);
    console.log(locale + ": " + text);
  }
  console.log(
    "Real provider: all four languages and protected technical tokens passed. No CMS data was changed.",
  );
} catch (error) {
  console.error(
    "Real translation provider check failed: " +
      error.message +
      (error.cause?.message ? " (" + error.cause.message + ")" : ""),
  );
  process.exitCode = 1;
}
