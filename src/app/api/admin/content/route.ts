import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { authenticated, sameOrigin } from "@/cms/auth";
import { readState, saveState, type Content } from "@/cms/store";
import { validateContent } from "@/cms/schema";
export const runtime = "nodejs";
export async function GET() {
  if (!(await authenticated()))
    return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  return NextResponse.json(await readState(), {
    headers: { "Cache-Control": "no-store" },
  });
}
export async function POST(request: Request) {
  if (!sameOrigin(request) || !(await authenticated()))
    return NextResponse.json({ error: "Yetkisiz istek." }, { status: 403 });
  if (Number(request.headers.get("content-length") || 0) > 2_000_000)
    return NextResponse.json(
      { error: "İçerik en fazla 2 MB olabilir." },
      { status: 413 },
    );
  let body;
  try {
    const text = await request.text();
    if (text.length > 2_000_000) throw new Error();
    body = JSON.parse(text);
    if (!body || typeof body !== "object") throw new Error();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON." }, { status: 400 });
  }
  if (body.action === "preview") {
    (await cookies()).set("cms_preview", body.enabled ? "1" : "0", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 8 * 60 * 60,
    });
    return NextResponse.json({ ok: true });
  }
  const state = await readState();
  if (body.version !== state.version)
    return NextResponse.json(
      {
        error:
          "İçerik başka bir oturumda değişti. Çalışmanızı yedekleyip güncel sürümü yükleyin.",
      },
      { status: 409 },
    );
  const now = new Date().toISOString();
  if (body.action === "save" || body.action === "publish") {
    const errors = validateContent(body.content);
    if (errors.length)
      return NextResponse.json({ error: errors.join("\n") }, { status: 400 });
    state.draft = body.content as Content;
    state.updatedAt = now;
    if (body.action === "publish") {
      state.history.unshift({
        id: randomUUID(),
        date: state.publishedAt || now,
        content: state.published,
      });
      state.history = state.history.slice(0, 10);
      state.published = structuredClone(state.draft);
      state.publishedAt = now;
    }
  } else if (body.action === "restore") {
    const revision = state.history.find((r) => r.id === body.id);
    if (!revision)
      return NextResponse.json({ error: "Sürüm bulunamadı." }, { status: 404 });
    state.draft = structuredClone(revision.content);
    state.updatedAt = now;
  } else
    return NextResponse.json({ error: "Geçersiz işlem." }, { status: 400 });
  state.version++;
  try {
    await saveState(state);
  } catch (error) {
    if ((error as Error).message === "VERSION_CONFLICT")
      return NextResponse.json(
        {
          error: "İçerik başka bir oturumda değişti. Güncel taslağı yükleyin.",
        },
        { status: 409 },
      );
    throw error;
  }
  return NextResponse.json(state, { headers: { "Cache-Control": "no-store" } });
}
