// Eski siteden (kivancgroup.com) PDF ve görselleri public/ altına indirir.
// Kullanım: npm run assets
// Var olan dosyalar atlanır. Test için ASSET_BASE ile başka bir adres verilebilir.

import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = (process.env.ASSET_BASE ?? "https://kivancgroup.com").replace(
  /\/$/,
  "",
);
const PUBLIC_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "public",
);

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

async function exists(file) {
  try {
    return (await stat(file)).size > 0;
  } catch {
    return false;
  }
}

async function download([source, target]) {
  const dest = path.join(PUBLIC_DIR, target);
  if (await exists(dest)) return "skipped";

  const res = await fetch(BASE + source, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  // Bazı sunucular bulunamayan dosya için HTML hata sayfası döndürür
  const type = res.headers.get("content-type") ?? "";
  if (type.includes("text/html"))
    throw new Error("dosya yerine HTML sayfası geldi");

  const data = Buffer.from(await res.arrayBuffer());
  if (data.length === 0) throw new Error("boş dosya");

  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, data);
  return "downloaded";
}

const counts = { downloaded: 0, skipped: 0, failed: 0 };

for (const entry of manifest) {
  try {
    const result = await download(entry);
    counts[result] += 1;
    console.log(
      `${result === "downloaded" ? "indirildi" : "atlandı  "} ${entry[1]}`,
    );
  } catch (err) {
    counts.failed += 1;
    console.error(`HATA      ${entry[1]}: ${err.message}`);
  }
}

console.log(
  `\nBitti: ${counts.downloaded} indirildi, ${counts.skipped} atlandı, ${counts.failed} hata.`,
);
process.exitCode = counts.failed > 0 ? 1 : 0;
