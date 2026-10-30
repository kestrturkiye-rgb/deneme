import { NextResponse } from "next/server";
import { authenticated, sameOrigin } from "@/cms/auth";
import { readState, saveState, editorState, type Content } from "@/cms/store";
import { validateContent } from "@/cms/schema";
import { automaticTranslation } from "@/i18n/automatic.server";
import { translationPlan, type SyncScope } from "@/i18n/sync";
import type { Localization } from "@/i18n/content";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!sameOrigin(request) || !(await authenticated()))
    return NextResponse.json({ error: "Yetkisiz istek." }, { status: 403 });
  let body: { version: number; scope: SyncScope };
  try {
    if (Number(request.headers.get("content-length") || 0) > 1000)
      throw Error();
    const text = await request.text();
    if (text.length > 1000) throw Error();
    body = JSON.parse(text);
    if (
      !body ||
      !Number.isInteger(body.version) ||
      !["changes", "all"].includes(body.scope) ||
      Object.keys(body).some((key) => !["version", "scope"].includes(key))
    )
      throw Error();
  } catch {
    return NextResponse.json(
      { error: "Geçersiz çeviri isteği." },
      { status: 400 },
    );
  }
  const state = await readState();
  if (body.version !== state.version)
    return NextResponse.json(
      { error: "İçerik başka bir oturumda değişti. Güncel taslağı yükleyin." },
      { status: 409 },
    );
  const tasks = translationPlan(state.draft, state.published, body.scope).slice(
      0,
      4,
    ),
    signal = AbortSignal.timeout(18_000),
    results = await Promise.allSettled(
      tasks.map(async (task) => ({
        ...task,
        text: await automaticTranslation(task.source, task.locale, signal),
      })),
    );
  const config: Localization = structuredClone(
    (state.draft.localization as unknown as Localization) || {
      translations: {},
    },
  );
  let completed = 0;
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    const { locale, id, source, text } = result.value;
    config.translations[locale] ||= {};
    config.translations[locale]![id] = { source, text, automatic: true };
    completed++;
  }
  if (completed) {
    state.draft.localization = config as unknown as Content["localization"];
    if (validateContent(state.draft).length)
      return NextResponse.json(
        { error: "Çeviri doğrulanamadı. Türkçe taslak ve yayın korundu." },
        { status: 502 },
      );
    state.updatedAt = new Date().toISOString();
    state.version++;
    try {
      await saveState(state);
    } catch (error) {
      if ((error as Error).message === "VERSION_CONFLICT")
        return NextResponse.json(
          {
            error:
              "İçerik başka bir oturumda değişti. Güncel taslağı yükleyin.",
          },
          { status: 409 },
        );
      throw error;
    }
  }
  return NextResponse.json(
    {
      state: editorState(state),
      sync: {
        completed,
        remaining: translationPlan(state.draft, state.published, body.scope)
          .length,
        error: results.some((r) => r.status === "rejected")
          ? "Çeviri hizmetine şu anda ulaşılamıyor veya hizmet sınırına ulaşıldı. Türkçe taslağınız ve tamamlanan çeviriler kaydedildi; yayın değiştirilmedi. Yeniden deneyin."
          : null,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
