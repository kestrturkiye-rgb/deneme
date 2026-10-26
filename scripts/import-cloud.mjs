import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { readFile, readdir, access } from "node:fs/promises";
import path from "node:path";
loadEnvConfig(process.cwd());
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)
  throw new Error(
    "Önce .env.local içine Supabase sunucu bağlantısını ekleyin.",
  );
const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const dir = path.resolve(process.env.CMS_DATA_DIR || ".cms");
const { error: check } = await db.from("cms_records").select("key").limit(1);
if (check)
  throw new Error(
    "Önce supabase/setup.sql dosyasını projenizin SQL editöründe çalıştırın.",
  );
const rows = [];
const urls = {};
try {
  for (const name of await readdir(path.join(dir, "uploads"))) {
    if (!/^[a-f0-9-]{36}\.(jpg|png|gif|webp|avif|pdf)$/.test(name)) continue;
    const bucket = db.storage.from(
      process.env.SUPABASE_STORAGE_BUCKET || "site-media",
    );
    const mime = {
      jpg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      avif: "image/avif",
      pdf: "application/pdf",
    }[name.split(".").pop()];
    const bytes = await readFile(path.join(dir, "uploads", name));
    const { error } = await bucket.upload("media/" + name, bytes, {
      contentType: mime,
      cacheControl: "31536000",
      upsert: false,
    });
    if (error && String(error.statusCode) !== "409")
      throw new Error("Bir medya dosyası aktarılamadı.");
    const url = bucket.getPublicUrl("media/" + name).data.publicUrl;
    urls["/media/" + name] = url;
    rows.push({
      key: "media:" + name.slice(0, 36),
      value: { name, url, size: bytes.length, date: new Date().toISOString() },
      version: 0,
    });
  }
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
function replace(value) {
  if (typeof value === "string") return urls[value] || value;
  if (Array.isArray(value)) return value.map(replace);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, replace(v)]),
    );
  return value;
}
for (const key of ["admin", "content"]) {
  try {
    const value = replace(
      JSON.parse(await readFile(path.join(dir, key + ".json"), "utf8")),
    );
    rows.push({ key, value, version: value.version || 0 });
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
}
try {
  for (const name of await readdir(path.join(dir, "inquiries"))) {
    if (/^[a-f0-9-]{36}\.json$/.test(name))
      rows.push({
        key: "inquiry:" + name.slice(0, 36),
        value: JSON.parse(
          await readFile(path.join(dir, "inquiries", name), "utf8"),
        ),
        version: 0,
      });
  }
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
if (!rows.some((r) => r.key === "admin"))
  throw new Error(
    "Aktarılacak yerel yönetici hesabı yok. Önce admin:setup kullanın.",
  );
const { error } = await db.from("cms_records").upsert(rows, {
  onConflict: "key",
  ignoreDuplicates: !process.argv.includes("--replace"),
});
if (error) throw new Error("Bulut aktarımı tamamlanamadı.");
console.log(
  `Aktarım tamamlandı: ${rows.length} kayıt, ${Object.keys(urls).length} dosya. Mevcut bulut kayıtları ${process.argv.includes("--replace") ? "değiştirildi" : "korundu"}. Kimlik bilgileri çıktıya yazılmadı.`,
);
