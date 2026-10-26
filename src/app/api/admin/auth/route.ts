import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  account,
  authenticated,
  changePassword,
  checkPassword,
  makeSession,
  sameOrigin,
} from "@/cms/auth";
import { backend } from "@/cms/persistence";
import { passwordAttempts } from "@/cms/login-limits";
export const runtime = "nodejs";
async function setSession(
  snapshot?: NonNullable<Awaited<ReturnType<typeof account>>>,
) {
  (await cookies()).set("cms_session", await makeSession(snapshot), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 8 * 60 * 60,
  });
}
export async function GET() {
  try {
    const isAuthenticated = await authenticated({ allowPasswordChange: true });
    const a = isAuthenticated ? await account() : null;
    return NextResponse.json(
      {
        configured: Boolean(await account()),
        backend: backend(),
        authenticated: isAuthenticated,
        passwordChangeRequired: Boolean(a?.mustChangePassword),
        username: a?.username,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "Yönetim veri deposuna ulaşılamadı. Supabase bağlantısını ve supabase/setup.sql kurulumunu kontrol edin.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json(
      { error: "İstek kaynağı doğrulanamadı." },
      { status: 403 },
    );
  if (Number(request.headers.get("content-length") || 0) > 2048)
    return NextResponse.json({ error: "İstek çok büyük." }, { status: 413 });
  const attempts = await passwordAttempts(request, "login");
  if (attempts.limited)
    return NextResponse.json(
      { error: "Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin." },
      { status: 429 },
    );
  let body;
  try {
    const raw = await request.text();
    if (raw.length > 2048) throw new Error();
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }
  const snapshot = await account();
  if (
    !body ||
    typeof body.username !== "string" ||
    typeof body.password !== "string" ||
    body.password.length > 256 ||
    !(await checkPassword(body.username, body.password, snapshot))
  ) {
    await attempts.failed();
    return NextResponse.json(
      { error: "Kullanıcı adı veya parola yanlış." },
      { status: 401 },
    );
  }
  await attempts.succeeded();
  await setSession(snapshot!);
  return NextResponse.json({
    ok: true,
    username: snapshot!.username,
    passwordChangeRequired: Boolean(snapshot!.mustChangePassword),
  });
}
export async function PATCH(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json({ error: "Geçersiz kaynak." }, { status: 403 });
  if (!(await authenticated({ allowPasswordChange: true })))
    return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  if (Number(request.headers.get("content-length") || 0) > 4096)
    return NextResponse.json({ error: "İstek çok büyük." }, { status: 413 });
  const attempts = await passwordAttempts(request, "password");
  if (attempts.limited)
    return NextResponse.json(
      { error: "Çok fazla deneme. 15 dakika sonra tekrar deneyin." },
      { status: 429 },
    );
  let body;
  try {
    const raw = await request.text();
    if (raw.length > 4096) throw new Error();
    body = JSON.parse(raw);
    if (
      !body ||
      typeof body.currentPassword !== "string" ||
      typeof body.newPassword !== "string" ||
      body.currentPassword.length > 256 ||
      body.newPassword.length < 12 ||
      body.newPassword.length > 256
    )
      throw new Error();
  } catch {
    return NextResponse.json(
      {
        error: "Mevcut parolanızı ve 12–256 karakterlik yeni parolanızı girin.",
      },
      { status: 400 },
    );
  }
  const snapshot = await account();
  if (
    !snapshot ||
    !(await checkPassword(snapshot.username, body.currentPassword, snapshot))
  ) {
    await attempts.failed();
    return NextResponse.json(
      { error: "Mevcut parola yanlış." },
      { status: 400 },
    );
  }
  if (body.currentPassword === body.newPassword)
    return NextResponse.json(
      { error: "Yeni parola mevcut paroladan farklı olmalı." },
      { status: 400 },
    );
  let next;
  try {
    next = await changePassword(body.newPassword, snapshot);
  } catch (error) {
    if ((error as Error).message === "VERSION_CONFLICT")
      return NextResponse.json(
        { error: "Parola başka bir oturumda değişti. Yeniden giriş yapın." },
        { status: 409 },
      );
    throw error;
  }
  await attempts.succeeded();
  await setSession(next);
  return NextResponse.json({ ok: true });
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json({ error: "Geçersiz kaynak." }, { status: 403 });
  const jar = await cookies();
  jar.delete("cms_session");
  jar.delete("cms_preview");
  return NextResponse.json({ ok: true });
}
