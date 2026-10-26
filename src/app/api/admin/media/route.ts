import { NextResponse } from "next/server";
import { mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { authenticated, sameOrigin } from "@/cms/auth";
import { dataDir } from "@/cms/store";
import {
  backend,
  database,
  mediaBucket,
  listDocuments,
  writeDocument,
  readDocument,
} from "@/cms/persistence";
import { mediaExtension, mediaTypes } from "@/cms/media-format";
export const runtime = "nodejs";
export async function GET(request: Request) {
  if (!(await authenticated()))
    return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  if (backend() === "unconfigured")
    return NextResponse.json(
      { error: "Dosya deposu yapılandırılmamış." },
      { status: 503 },
    );
  const query = new URL(request.url).searchParams;
  const paginated = query.has("page");
  const page = Math.max(
    0,
    Math.min(100000, Math.floor(Number(query.get("page")) || 0)),
  );
  if (backend() === "supabase" && paginated) {
    const { data, error } = await database()
      .from("cms_records")
      .select("value")
      .like("key", "media:%")
      .order("updated_at", { ascending: false })
      .range(page * 48, page * 48 + 48);
    if (error)
      return NextResponse.json(
        { error: "Medya kütüphanesi yüklenemedi." },
        { status: 503 },
      );
    return NextResponse.json(
      {
        items: data.slice(0, 48).map((r) => r.value),
        hasMore: data.length > 48,
        page,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }
  if (backend() === "supabase")
    return NextResponse.json(
      (await listDocuments<{ date: string }>("media:")).sort((a, b) =>
        b.date.localeCompare(a.date),
      ),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  const dir = path.join(dataDir(), "uploads");
  mkdirSync(dir, { recursive: true });
  const files = readdirSync(/* turbopackIgnore: true */ dir)
    .filter((n) => /^[a-f0-9-]+\.(jpg|png|gif|webp|avif|pdf)$/.test(n))
    .map((name) => ({
      name,
      url: "/media/" + name,
      size: statSync(/* turbopackIgnore: true */ path.join(dir, name)).size,
      date: statSync(
        /* turbopackIgnore: true */ path.join(dir, name),
      ).mtime.toISOString(),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
  return NextResponse.json(
    paginated
      ? {
          items: files.slice(page * 48, (page + 1) * 48),
          hasMore: files.length > (page + 1) * 48,
          page,
        }
      : files,
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(request: Request) {
  if (!sameOrigin(request) || !(await authenticated()))
    return NextResponse.json({ error: "Yetkisiz istek." }, { status: 403 });
  if (backend() === "unconfigured")
    return NextResponse.json(
      { error: "Dosya deposu yapılandırılmamış." },
      { status: 503 },
    );
  if (request.headers.get("content-type")?.includes("application/json")) {
    let body;
    try {
      const raw = await request.text();
      if (raw.length > 2048) throw new Error();
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
    }
    if (backend() === "file") return NextResponse.json({ mode: "local" });
    const storage = database().storage.from(mediaBucket());
    if (body?.action === "prepare") {
      const ext = Object.keys(mediaTypes).find(
        (key) => mediaTypes[key] === body.type,
      );
      if (
        !ext ||
        !Number.isInteger(body.size) ||
        body.size < 1 ||
        body.size > 10_000_000
      )
        return NextResponse.json(
          { error: "Geçersiz dosya türü veya boyutu." },
          { status: 400 },
        );
      const name = randomUUID() + "." + ext;
      const objectPath = "media/" + name;
      const { data, error } = await storage.createSignedUploadUrl(objectPath, {
        upsert: false,
      });
      if (error)
        return NextResponse.json(
          { error: "Dosya yükleme bağlantısı oluşturulamadı." },
          { status: 503 },
        );
      return NextResponse.json({
        mode: "signed",
        signedUrl: data.signedUrl,
        path: objectPath,
      });
    }
    if (
      body?.action === "complete" &&
      /^media\/[a-f0-9-]{36}\.(jpg|png|gif|webp|avif|pdf)$/.test(body.path)
    ) {
      const name = body.path.slice(6);
      const id = name.slice(0, 36);
      const existing = await readDocument<Record<string, unknown>>(
        "media:" + id,
      );
      if (existing) return NextResponse.json(existing);
      const url = storage.getPublicUrl(body.path).data.publicUrl;
      const { data: info, error: infoError } = await storage.info(body.path);
      if (infoError || !info)
        return NextResponse.json(
          { error: "Yüklenen dosya bulunamadı." },
          { status: 400 },
        );
      const bytes = await fetch(url, {
        headers: { Range: "bytes=0-15" },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      const ext = mediaExtension(
        new Uint8Array(await bytes.arrayBuffer()).subarray(0, 16),
      );
      if (
        !bytes.ok ||
        !ext ||
        !name.endsWith("." + ext) ||
        (info.size ?? info.metadata?.size ?? 0) < 1 ||
        (info.size ?? info.metadata?.size ?? 0) > 10_000_000
      ) {
        await storage.remove([body.path]);
        return NextResponse.json(
          { error: "Dosyanın içeriği veya boyutu geçersiz." },
          { status: 400 },
        );
      }
      const record = {
        name,
        url,
        size: info.size ?? info.metadata?.size ?? 0,
        date: new Date().toISOString(),
      };
      await writeDocument("media:" + id, record);
      return NextResponse.json(record);
    }
    return NextResponse.json(
      { error: "Geçersiz dosya işlemi." },
      { status: 400 },
    );
  }
  if (backend() === "supabase")
    return NextResponse.json(
      { error: "Doğrudan yükleme akışını kullanın." },
      { status: 400 },
    );
  if (
    !request.headers.get("content-length") ||
    Number(request.headers.get("content-length")) > 11_000_000
  )
    return NextResponse.json(
      { error: "Dosya en fazla 10 MB olabilir." },
      { status: 413 },
    );
  let form;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Dosya okunamadı." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > 10_000_000)
    return NextResponse.json(
      { error: "1 bayt–10 MB boyutunda bir dosya seçin." },
      { status: 400 },
    );
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = mediaExtension(buffer);
  if (!ext)
    return NextResponse.json(
      {
        error:
          "Yalnızca JPG, PNG, GIF, WebP, AVIF ve PDF yüklenebilir. SVG ve çalıştırılabilir dosyalar kabul edilmez.",
      },
      { status: 400 },
    );
  const name = randomUUID() + "." + ext;
  const dir = path.join(dataDir(), "uploads");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, name), buffer, { mode: 0o600, flag: "wx" });
  return NextResponse.json({
    name,
    url: "/media/" + name,
    size: buffer.length,
    date: new Date().toISOString(),
  });
}
