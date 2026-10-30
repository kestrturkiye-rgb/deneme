// Explicitly preloaded by isolated tests only. This models the provider's HTTP
// contract; it is never imported by the app and does not prove live translation.
import { appendFileSync, existsSync, readFileSync } from "node:fs";
const original = globalThis.fetch;
globalThis.fetch = async (input, options) => {
  const url = new URL(
    typeof input === "string" || input instanceof URL ? input : input.url,
  );
  if (url.hostname !== "translate.googleapis.com")
    return original(input, options);
  const control = process.env.CMS_TRANSLATION_TEST_CONTROL,
    settings =
      control && existsSync(control)
        ? JSON.parse(readFileSync(control, "utf8"))
        : {};
  const locale = url.searchParams.get("tl"),
    text = url.searchParams.get("q");
  if (process.env.CMS_TRANSLATION_TEST_LOG)
    appendFileSync(
      process.env.CMS_TRANSLATION_TEST_LOG,
      JSON.stringify({ locale, text }) + "\n",
    );
  if (settings.delay) await new Promise((r) => setTimeout(r, settings.delay));
  if (
    settings.mode === "fail" ||
    (settings.mode === "partial" && locale === "de")
  )
    return new Response("Unavailable", { status: 429 });
  if (settings.mode === "malformed") return Response.json({ invalid: true });
  const translated =
    "[" +
    locale +
    "] " +
    (settings.mode === "tokens"
      ? text.replace(/KIVANCPRESERVE\d+TOKEN/g, "")
      : text);
  return Response.json([[[translated, text]], null, "tr"]);
};
