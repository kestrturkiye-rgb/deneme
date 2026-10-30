import { translateText } from "@/i18n/content";
import { isLocale } from "@/i18n/locales";
import { NextResponse } from "next/server";
import { receiveInquiry, updateInquiry } from "@/cms/inquiries";
import { backend, database } from "@/cms/persistence";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Basit hız sınırı: aynı IP'den 10 dakikada en fazla 5 mesaj.
// Sunucusuz ortamda her örnek kendi sayacını tutar, bu yüzden ek bir koruma katmanıdır.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

async function rateLimited(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (backend() === "supabase") {
    const keys = ["contact:" + (ip || "shared"), "contact:global"];
    for (const [index, key] of keys.entries()) {
      const { data, error } = await database().rpc("cms_rate_limit", {
        rate_key: key,
        max_hits: index ? 500 : 5,
        window_seconds: 600,
        consume: true,
      });
      if (error) throw new Error("Talep sınırı kontrol edilemedi.");
      if (!data) return true;
    }
    return false;
  }
  if (!ip) return false;

  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);

  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(key);
    }
  }

  return recent.length > MAX_PER_WINDOW;
}

function oneLine(value: unknown, max: number) {
  return typeof value === "string"
    ? value
        .replace(/[\r\n\t]+/g, " ")
        .trim()
        .slice(0, max)
    : "";
}

function multiLine(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  const selectedLanguage = request.headers.get("x-site-language") || "tr";
  const language = isLocale(selectedLanguage) ? selectedLanguage : "tr";
  const json = (body: { error?: string; ok?: boolean }, init?: ResponseInit) =>
    NextResponse.json(
      body.error
        ? { ...body, error: translateText(body.error, language) }
        : body,
      init,
    );

  if (await rateLimited(request)) {
    return json(
      {
        error:
          "Çok fazla deneme yaptınız. Lütfen birkaç dakika sonra tekrar deneyin.",
      },
      { status: 429 },
    );
  }

  let body: Record<string, unknown>;
  try {
    if (Number(request.headers.get("content-length") || 0) > 64_000)
      return json({ error: "İstek çok büyük." }, { status: 413 });
    const raw = await request.text();
    if (raw.length > 64_000)
      return json({ error: "İstek çok büyük." }, { status: 413 });
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      throw new Error("Invalid body");
    body = parsed;
  } catch {
    return json({ error: "Geçersiz istek." }, { status: 400 });
  }

  // Bot tuzağı doluysa sessizce başarılı say
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return json({ ok: true });
  }

  const kind =
    body.kind === "quote"
      ? "quote"
      : body.kind === "inquiry"
        ? "inquiry"
        : "contact";
  const name = oneLine(body.name, 120);
  const company = oneLine(body.company, 160);
  const email = oneLine(body.email, 160);
  const phone = oneLine(body.phone, 40);
  const message = multiLine(body.message, 4000);

  if (!name) {
    return json({ error: "Lütfen adınızı yazın." }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return json(
      { error: "Lütfen geçerli bir e-posta adresi girin." },
      { status: 400 },
    );
  }
  if (kind !== "quote" && !message) {
    return json({ error: "Lütfen mesajınızı yazın." }, { status: 400 });
  }

  const rawItems = Array.isArray(body.items) ? body.items.slice(0, 50) : [];
  const items = rawItems
    .map((item) => {
      const i = (item ?? {}) as Record<string, unknown>;
      const qty = Number(i.qty);
      return {
        name: oneLine(i.name, 200),
        qty: Number.isFinite(qty)
          ? Math.max(1, Math.min(9999, Math.floor(qty)))
          : 1,
        href: oneLine(i.href, 200),
      };
    })
    .filter((i) => i.name);

  if (kind === "quote" && items.length === 0) {
    return json({ error: "Teklif sepetiniz boş." }, { status: 400 });
  }

  if (body.consent !== true)
    return json(
      { error: "Lütfen gizlilik bilgilendirmesini okuyup onaylayın." },
      { status: 400 },
    );
  let inquiry;
  try {
    inquiry = await receiveInquiry({
      kind,
      name,
      company,
      email,
      phone,
      message,
      items,
      consent: true,
    });
  } catch {
    return json(
      {
        error:
          "Talebiniz kaydedilemedi. Lütfen e-posta veya telefonla bize ulaşın.",
      },
      { status: 503 },
    );
  }
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM;
  const to = process.env.CONTACT_TO || "info@kivancgroup.com";
  if (!apiKey || !from) return json({ ok: true });
  const lines = [
    kind !== "contact" ? "Yeni teklif talebi" : "Yeni iletişim mesajı",
    "",
    `Ad soyad: ${name}`,
    `Firma: ${company || "-"}`,
    `E-posta: ${email}`,
    `Telefon: ${phone || "-"}`,
  ];

  if (items.length > 0) {
    lines.push("", "Ürünler:");
    for (const i of items) lines.push(`- ${i.name} x ${i.qty}`);
  }

  if (message) lines.push("", "Not:", message);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject:
          kind !== "contact"
            ? `Teklif talebi: ${name}`
            : `Web sitesi mesajı: ${name}`,
        text: lines.join("\n"),
      }),
      signal: AbortSignal.timeout(8000),
    });

    await updateInquiry(inquiry.id, { delivery: res.ok ? "sent" : "failed" });
  } catch {
    // The durable inbox already contains the request; notification can fail independently.
    try {
      await updateInquiry(inquiry.id, { delivery: "failed" });
    } catch {}
  }
  return json({ ok: true });
}
