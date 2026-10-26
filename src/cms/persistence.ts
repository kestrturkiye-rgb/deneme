import "server-only";
import { isServerlessDeployment } from "@/lib/deployment";
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, readdirSync, unlinkSync } from "node:fs";
import path from "node:path";
import { dataDir, atomicWrite } from "./paths";
export function backend(): "supabase" | "file" | "unconfigured" {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
    return "supabase";
  return isServerlessDeployment() ? "unconfigured" : "file";
}
export function database() {
  if (backend() !== "supabase")
    throw new Error("Kalıcı veri deposu yapılandırılmamış.");
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }),
      },
    },
  );
}
export const mediaBucket = () =>
  process.env.SUPABASE_STORAGE_BUCKET || "site-media";
function filename(key: string) {
  if (key === "content" || key === "admin")
    return path.join(dataDir(), key + ".json");
  if (/^inquiry:[a-f0-9-]{36}$/.test(key))
    return path.join(dataDir(), "inquiries", key.slice(8) + ".json");
  throw new Error("Geçersiz kayıt.");
}
export async function readDocument<T>(key: string): Promise<T | null> {
  if (backend() === "unconfigured") return null;
  if (backend() === "file") {
    const file = filename(key);
    return existsSync(/* turbopackIgnore:true */ file)
      ? (JSON.parse(readFileSync(/* turbopackIgnore:true */ file, "utf8")) as T)
      : null;
  }
  const { data, error } = await database()
    .from("cms_records")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error)
    throw new Error(
      "Kalıcı veri deposu okunamadı. Sunucu bağlantısını kontrol edin.",
    );
  return (data?.value as T) || null;
}
export async function writeDocument(
  key: string,
  value: unknown,
  expectedVersion?: number,
) {
  const mode = backend();
  if (mode === "unconfigured")
    throw new Error("Yayın ortamı için kalıcı veri deposunu yapılandırın.");
  if (mode === "file") {
    if (expectedVersion !== undefined) {
      const file = filename(key);
      const current = existsSync(/* turbopackIgnore:true */ file)
        ? JSON.parse(readFileSync(/* turbopackIgnore:true */ file, "utf8"))
        : { version: 0 };
      if ((current.version || 0) !== expectedVersion)
        throw new Error("VERSION_CONFLICT");
    }
    atomicWrite(filename(key), value);
    return;
  }
  const db = database();
  const record = {
    key,
    value,
    version: (value as { version?: number })?.version || 0,
    updated_at: new Date().toISOString(),
  };
  if (expectedVersion === undefined) {
    const { error } = await db.from("cms_records").upsert(record);
    if (error) throw new Error("Kalıcı kayıt yazılamadı.");
    return;
  }
  const { data, error } = await db
    .from("cms_records")
    .update(record)
    .eq("key", key)
    .eq("version", expectedVersion)
    .select("key");
  if (error) throw new Error("Kalıcı kayıt yazılamadı.");
  if (data?.length) return;
  if (expectedVersion === 0) {
    const { data: inserted, error: insertError } = await db
      .from("cms_records")
      .upsert(record, { onConflict: "key", ignoreDuplicates: true })
      .select("key");
    if (insertError) throw new Error("Kalıcı kayıt yazılamadı.");
    if (inserted?.length) return;
  }
  throw new Error("VERSION_CONFLICT");
}
export async function listDocuments<T>(
  prefix: "inquiry:" | "media:",
): Promise<T[]> {
  if (backend() === "unconfigured") return [];
  if (backend() === "file") {
    if (prefix !== "inquiry:") return [];
    const dir = path.join(dataDir(), "inquiries");
    if (!existsSync(/* turbopackIgnore:true */ dir)) return [];
    return readdirSync(/* turbopackIgnore:true */ dir)
      .filter((n) => /^[a-f0-9-]{36}\.json$/.test(n))
      .map(
        (n) =>
          JSON.parse(
            readFileSync(/* turbopackIgnore:true */ path.join(dir, n), "utf8"),
          ) as T,
      );
  }
  const result: T[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await database()
      .from("cms_records")
      .select("value")
      .like("key", prefix + "%")
      .order("updated_at", { ascending: false })
      .range(offset, offset + 499);
    if (error) throw new Error("Kayıtlar yüklenemedi.");
    result.push(...data.map((d) => d.value as T));
    if (data.length < 500) break;
    offset += 500;
  }
  return result;
}
export async function patchDocument(
  key: string,
  patch: Record<string, unknown>,
) {
  if (backend() === "file") {
    const file = filename(key);
    if (!existsSync(/* turbopackIgnore:true */ file)) return false;
    const current = JSON.parse(
      readFileSync(/* turbopackIgnore:true */ file, "utf8"),
    );
    atomicWrite(file, { ...current, ...patch });
    return true;
  }
  if (backend() === "unconfigured") return false;
  const { data, error } = await database().rpc("cms_patch_record", {
    record_key: key,
    patch,
  });
  if (error) throw new Error("Kayıt güncellenemedi.");
  return Boolean(data);
}
export async function removeDocument(key: string) {
  if (backend() === "file") {
    const file = filename(key);
    if (!existsSync(/* turbopackIgnore:true */ file)) return false;
    unlinkSync(file);
    return true;
  }
  if (backend() === "unconfigured") return false;
  const { data, error } = await database()
    .from("cms_records")
    .delete()
    .eq("key", key)
    .select("key");
  if (error) throw new Error("Kayıt silinemedi.");
  return Boolean(data?.length);
}
