// Runs after `opennextjs-cloudflare build`.
// Cloudflare Workers static assets are limited to 25 MiB per file. The documents in
// cloudflare/large-documents.json are excluded from the upload (.assetsignore) and are
// redirected to kivancgroup.com by next.config.mjs. Any other oversized file fails the build.
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";

const LIMIT = 25 * 1024 * 1024;
const assets = path.join(process.cwd(), ".open-next", "assets");
if (!existsSync(assets)) throw new Error("Run `opennextjs-cloudflare build` first: .open-next/assets is missing.");

const { documents } = JSON.parse(readFileSync("cloudflare/large-documents.json", "utf8"));
const ignored = new Set(documents.map((d) => d.path));

const tooBig = [];
let count = 0;
(function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { walk(full); continue; }
    const rel = "/" + path.relative(assets, full).split(path.sep).join("/");
    if (ignored.has(rel)) continue;
    count++;
    if (statSync(full).size > LIMIT) tooBig.push(rel);
  }
})(assets);

writeFileSync(path.join(assets, ".assetsignore"), [".assetsignore", ...ignored].join("\n") + "\n");
console.log(`assets: ${count} files to upload, ${ignored.size} large documents redirected to kivancgroup.com`);
if (count > 20000) throw new Error(`Too many asset files for the Workers free plan: ${count} (limit 20000).`);
if (tooBig.length) throw new Error("Files over 25 MiB: add them to cloudflare/large-documents.json\n" + tooBig.join("\n"));
