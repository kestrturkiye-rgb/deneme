import "server-only";
import { backend, database } from "./persistence";

const failures = new Map<string, { count: number; until: number }>();
const windowMs = 15 * 60 * 1000;

export async function passwordAttempts(request: Request, operation: string) {
  const now = Date.now();
  for (const [key, value] of failures)
    if (value.until <= now) failures.delete(key);
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "shared";
  const keys = [operation + ":" + ip, operation + ":__global__"];
  if (backend() === "supabase") {
    const results = await Promise.all(
      keys.map((key, index) =>
        database().rpc("cms_rate_limit", {
          rate_key: key,
          max_hits: index ? 60 : 8,
          window_seconds: 900,
          consume: false,
        }),
      ),
    );
    if (results.some((r) => r.error))
      throw new Error("Giriş sınırı kontrol edilemedi.");
    return {
      limited: results.some((r) => !r.data),
      async failed() {
        for (const [index, key] of keys.entries()) {
          const { error } = await database().rpc("cms_rate_limit", {
            rate_key: key,
            max_hits: index ? 60 : 8,
            window_seconds: 900,
            consume: true,
          });
          if (error) throw new Error("Giriş denemesi kaydedilemedi.");
        }
      },
      async succeeded() {
        const { error } = await database()
          .from("cms_rate_limits")
          .delete()
          .eq("key", keys[0]);
        if (error) throw new Error("Giriş kontrolü tamamlanamadı.");
      },
    };
  }
  return {
    limited: keys.some(
      (key, index) => (failures.get(key)?.count || 0) >= (index ? 60 : 8),
    ),
    failed() {
      for (const key of keys) {
        const previous = failures.get(key);
        failures.set(key, {
          count: (previous?.count || 0) + 1,
          until: previous?.until || now + windowMs,
        });
      }
    },
    succeeded() {
      failures.delete(keys[0]);
    },
  };
}
