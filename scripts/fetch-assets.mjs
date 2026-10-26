// Eski sitedeki bilinen dosyaları doğrulayarak public/ altına aktarır.
import { mkdir, readFile, stat, writeFile, rename, rm } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
// [eski sitedeki adres, public/ altındaki hedef]
export const manifest = [
  [
    "/wp-content/uploads/2024/01/230814-Sariyer-Ayazaga-Mah-Hadim-Koroyolu-Cad-Geri-Donusum-Fabrika-Yangini-265-scaled.jpg",
    "images/hero.jpg",
  ],

  // Mevzuat
  [
    "/wp-content/uploads/2026/06/1-6331_is_sagligi_ve_guvenligi_kanunu.pdf",
    "docs/6331-is-sagligi-ve-guvenligi-kanunu.pdf",
  ],
  [
    "/wp-content/uploads/2026/06/2-KKD_YONETMELIGI.pdf",
    "docs/kkd-yonetmeligi.pdf",
  ],
  [
    "/wp-content/uploads/2026/06/3-KKD_is_yerinde_kullanilmasi_hakkinda_yonetmelik.pdf",
    "docs/kkd-isyerinde-kullanilmasi-hakkinda-yonetmelik.pdf",
  ],
  [
    "/wp-content/uploads/2026/06/4-belediye_itfaiye_yonetmeligi.pdf",
    "docs/belediye-itfaiye-yonetmeligi.pdf",
  ],
  [
    "/wp-content/uploads/2026/06/7223-Urun-Guvenligi-ve-Teknik-Duzenlemeler-Kanunu.pdf.pdf",
    "docs/7223-urun-guvenligi-ve-teknik-duzenlemeler-kanunu.pdf",
  ],

  // Broşürler
  [
    "/wp-content/uploads/2026/07/Kivanc-Group-Itfaiyeci-Elbiseleri-Karsilastirma-2026.pdf",
    "docs/Kivanc-Group-Itfaiyeci-Elbiseleri-Karsilastirma-2026.pdf",
  ],
  [
    "/wp-content/uploads/2021/10/KIVANC-GROUP-Firestar-Firefighting-Garments-Equipments-LR.pdf",
    "docs/KIVANC-GROUP-Firestar-Firefighting-Garments-Equipments-LR.pdf",
  ],
  [
    "/wp-content/uploads/2025/08/Yangin-Battaniyesi.pdf",
    "docs/Yangin-Battaniyesi.pdf",
  ],
  [
    "/wp-content/uploads/2025/06/Musselstone-2025.pdf",
    "docs/Musselstone-2025.pdf",
  ],
  ["/wp-content/uploads/2023/02/Industar-TR-LR.pdf", "docs/Industar-TR-LR.pdf"],
  ["/wp-content/uploads/2023/02/Arcstar-TR-LR.pdf", "docs/Arcstar-TR-LR.pdf"],
  [
    "/wp-content/uploads/2023/02/Metalstar-TR-LR.pdf",
    "docs/Metalstar-TR-LR.pdf",
  ],
  ["/wp-content/uploads/2023/02/Refstar-TR-LR.pdf", "docs/Refstar-TR-LR.pdf"],
  ["/wp-content/uploads/2023/02/Forestar-TR-LR.pdf", "docs/Forestar-TR-LR.pdf"],
  [
    "/wp-content/uploads/2022/04/2022-MILSTAR-Askeriye-ve-Polis-Urunleri-LR.pdf",
    "docs/2022-MILSTAR-Askeriye-ve-Polis-Urunleri-LR.pdf",
  ],
  [
    "/wp-content/uploads/2022/05/Opti-Syn-Multi-norm-Kumas-1.pdf",
    "docs/Opti-Syn-Multi-norm-Kumas-1.pdf",
  ],
  ["/wp-content/uploads/2019/10/YOU_INDUSTRY.pdf", "docs/YOU_INDUSTRY.pdf"],
  [
    "/wp-content/uploads/2026/06/Firestar-Layer-Options-LR.pdf",
    "docs/Firestar-Layer-Options-LR.pdf",
  ],
  [
    "/wp-content/uploads/2026/06/Firestar-Layer-Details-LR.pdf",
    "docs/Firestar-Layer-Details-LR.pdf",
  ],
  [
    "/wp-content/uploads/2026/06/Aluminized-Layer-Options-LR.pdf",
    "docs/Aluminized-Layer-Options-LR.pdf",
  ],
  [
    "/wp-content/uploads/2026/06/Aluminized-Layer-Details-LR.pdf",
    "docs/Aluminized-Layer-Details-LR.pdf",
  ],
];

export function fileValid(bytes, target) {
  if (target.toLowerCase().endsWith(".pdf"))
    return (
      /^%PDF-\d\.\d/.test(bytes.subarray(0, 8).toString("ascii")) &&
      bytes.subarray(-4096).includes(Buffer.from("%%EOF"))
    );
  if (/\.jpe?g$/i.test(target))
    return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (/\.png$/i.test(target))
    return bytes.subarray(0, 8).toString("hex") === "89504e470d0a1a0a";
  throw new Error("Desteklenmeyen dosya türü.");
}
function targetPath(root, target) {
  if (
    typeof target !== "string" ||
    target.includes("\\") ||
    path.isAbsolute(target)
  )
    throw new Error("Geçersiz hedef yolu.");
  const file = path.resolve(root, target);
  if (!file.startsWith(path.resolve(root) + path.sep))
    throw new Error("Hedef, public klasörü dışında olamaz.");
  return file;
}
function baseUrl(base) {
  const url = new URL(base);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error(
      "Kaynak adresi http(s) olmalı ve kimlik bilgisi içermemeli.",
    );
  return url;
}
export async function transferAssets({
  base = "https://kivancgroup.com",
  publicDir,
  entries = manifest,
  timeoutMs = 20000,
  maxBytes = 80_000_000,
  concurrency = 3,
}) {
  const baseURL = baseUrl(base);
  const seen = new Set();
  for (const [source, target] of entries) {
    targetPath(publicDir, target);
    if (!source.startsWith("/") || source.startsWith("//") || seen.has(target))
      throw new Error("Kaynak/hedef listesi geçersiz veya hedef tekrarlanmış.");
    seen.add(target);
  }
  const results = new Array(entries.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(concurrency, 8)) }, async () => {
      while (cursor < entries.length) {
        const index = cursor++;
        const [source, target] = entries[index];
        const dest = targetPath(publicDir, target);
        const url = new URL(source, baseURL).href;
        let tmp;
        try {
          let current;
          try {
            if ((await stat(dest)).isFile()) current = await readFile(dest);
          } catch (error) {
            if (error.code !== "ENOENT") throw error;
          }
          if (current && fileValid(current, target)) {
            results[index] = {
              source: url,
              target,
              status: "existing",
              bytes: current.length,
              sha256: createHash("sha256").update(current).digest("hex"),
            };
            continue;
          }
          const response = await fetch(url, {
            redirect: "follow",
            signal: AbortSignal.timeout(timeoutMs),
          });
          if (!response.ok) throw new Error("HTTP " + response.status);
          const type = response.headers.get("content-type") || "";
          if (/text\/html|application\/xhtml/i.test(type))
            throw new Error("Dosya yerine HTML sayfası geldi.");
          if (Number(response.headers.get("content-length") || 0) > maxBytes) {
            await response.body?.cancel();
            throw new Error("Dosya boyut sınırını aşıyor.");
          }
          const chunks = [];
          let size = 0;
          for await (const chunk of response.body || []) {
            size += chunk.length;
            if (size > maxBytes)
              throw new Error("Dosya boyut sınırını aşıyor.");
            chunks.push(chunk);
          }
          const bytes = Buffer.concat(chunks);
          if (!fileValid(bytes, target))
            throw new Error("Dosya imzası veya PDF sonlandırıcısı geçersiz.");
          await mkdir(path.dirname(dest), { recursive: true });
          tmp = dest + "." + randomUUID() + ".tmp";
          await writeFile(tmp, bytes, { flag: "wx" });
          await rename(tmp, dest);
          tmp = undefined;
          results[index] = {
            source: url,
            target,
            status: "downloaded",
            bytes: bytes.length,
            sha256: createHash("sha256").update(bytes).digest("hex"),
          };
        } catch (error) {
          results[index] = {
            source: url,
            target,
            status: "failed",
            error: String(error.message).replace(
              /(https?:\/\/)[^/\s@]+@/g,
              "$1[redacted]@",
            ),
          };
        } finally {
          if (tmp) await rm(tmp, { force: true });
        }
      }
    }),
  );
  return {
    source: baseURL.origin,
    downloaded: results.filter((r) => r.status === "downloaded").length,
    existing: results.filter((r) => r.status === "existing").length,
    failed: results.filter((r) => r.status === "failed").length,
    results,
  };
}
export async function inventoryAssets({
  publicDir,
  entries = manifest,
  base = "https://kivancgroup.com",
}) {
  const results = [];
  for (const [source, target] of entries) {
    let bytes;
    try {
      bytes = await readFile(targetPath(publicDir, target));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    results.push({
      source: new URL(source, baseUrl(base)).href,
      target,
      status: bytes && fileValid(bytes, target) ? "available" : "missing",
      bytes: bytes?.length || 0,
    });
  }
  return results;
}
async function main() {
  const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
  const args = process.argv.slice(2);
  const publicDir = process.env.ASSET_PUBLIC_DIR
    ? path.resolve(process.env.ASSET_PUBLIC_DIR)
    : path.join(root, "public");
  const entries = args.includes("--documents")
    ? manifest.filter(([, target]) => target.endsWith(".pdf"))
    : manifest;
  const base = process.env.ASSET_BASE || "https://kivancgroup.com";
  const report = args.includes("--inventory")
    ? {
        source: base,
        results: await inventoryAssets({ base, publicDir, entries }),
      }
    : await transferAssets({ base, publicDir, entries });
  const reportFile = path.join(root, ".migration", "asset-report.json");
  await mkdir(path.dirname(reportFile), { recursive: true });
  await writeFile(reportFile, JSON.stringify(report, null, 2) + "\n");
  for (const item of report.results)
    console.log(
      `${item.status.padEnd(10)} ${item.target}${item.error ? " · " + item.error : ""}`,
    );
  console.log("Rapor: .migration/asset-report.json");
  if (report.failed) process.exitCode = 1;
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await main();
