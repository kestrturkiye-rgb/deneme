import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
export const translationFixtureOptions =
  "--import " +
  fileURLToPath(
    new URL("./fixtures/translation-provider.mjs", import.meta.url),
  );

/** Real authenticated save/batch/publish protocol, using an isolated provider. */
export async function publishWithTranslations(call, body) {
  const saved = await call("/api/admin/content", { ...body, action: "save" });
  if (!saved.ok) return saved;
  let state = await saved.json();
  for (let i = 0; i < 3000; i++) {
    const r = await call("/api/admin/translations", {
      version: state.version,
      scope: "changes",
    });
    assert.equal(r.status, 200, await r.clone().text());
    const result = await r.json();
    assert.equal(result.sync.error, null);
    state = result.state;
    if (!result.sync.remaining)
      return call("/api/admin/content", {
        action: "publish",
        version: state.version,
        content: state.draft,
      });
  }
  throw Error("Translation did not finish");
}
