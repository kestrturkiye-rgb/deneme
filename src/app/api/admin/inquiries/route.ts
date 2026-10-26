import { NextResponse } from "next/server";
import { authenticated, sameOrigin } from "@/cms/auth";
import { inquiries, updateInquiry, deleteInquiry } from "@/cms/inquiries";
export const runtime = "nodejs";
export async function GET(request: Request) {
  if (!(await authenticated()))
    return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const page = Math.max(
    0,
    Math.min(10000, Number(new URL(request.url).searchParams.get("page")) || 0),
  );
  const items = await inquiries();
  return NextResponse.json(
    {
      items: items.slice(page * 25, (page + 1) * 25),
      total: items.length,
      unread: items.filter((i) => !i.read).length,
      page,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
async function mutate(request: Request, remove = false) {
  if (!sameOrigin(request) || !(await authenticated()))
    return NextResponse.json({ error: "Yetkisiz istek." }, { status: 403 });
  let body;
  try {
    const raw = await request.text();
    if (raw.length > 1024) throw new Error();
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }
  if (
    !body ||
    !/^[-a-f0-9]{36}$/.test(body.id) ||
    (!remove && typeof body.read !== "boolean")
  )
    return NextResponse.json({ error: "Geçersiz kayıt." }, { status: 400 });
  const changed = remove
    ? await deleteInquiry(body.id)
    : await updateInquiry(body.id, { read: body.read });
  return NextResponse.json(
    changed ? { ok: true } : { error: "Kayıt bulunamadı." },
    { status: changed ? 200 : 404 },
  );
}
export const PATCH = (request: Request) => mutate(request);
export const DELETE = (request: Request) => mutate(request, true);
