// Writes src/lib/product-media.manifest.json: the image files in public/products/<slug>/
// and public/products/360/<slug>/, sorted the same way as src/lib/product-media.ts.
// Hosts without a readable disk at runtime (Cloudflare Workers) use this list instead
// of reading the folders. Run again after adding or removing product photos.
import { readdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const root = path.join(process.cwd(), "public", "products");
const IMAGE_EXT = /\.(jpe?g|png|webp|avif|svg)$/i;
const naturalCompare = (a, b) => a.localeCompare(b, "tr", { numeric: true, sensitivity: "base" });

const images = (dir) =>
  readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && IMAGE_EXT.test(e.name))
    .map((e) => e.name)
    .sort(naturalCompare);

const manifest = {};
if (existsSync(root)) {
  for (const e of readdirSync(root, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    if (e.name === "360") {
      for (const s of readdirSync(path.join(root, "360"), { withFileTypes: true }))
        if (s.isDirectory()) {
          const list = images(path.join(root, "360", s.name));
          if (list.length) manifest[`360/${s.name}`] = list;
        }
    } else {
      const list = images(path.join(root, e.name));
      if (list.length) manifest[e.name] = list;
    }
  }
}
const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(path.join(process.cwd(), "src/lib/product-media.manifest.json"), JSON.stringify(sorted, null, 2) + "\n");
console.log(`product-media manifest: ${Object.keys(sorted).length} folders`);
