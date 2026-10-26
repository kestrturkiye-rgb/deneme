import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { fileValid } from "./fetch-assets.mjs";

export async function indexDocuments(publicDir) {
  const root = path.join(publicDir, "docs");
  const documents = [];
  async function scan(dir) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (error) {
      if (error.code === "ENOENT") return;
      throw error;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await scan(full);
      else if (entry.isFile() && /\.pdf$/i.test(entry.name)) {
        const bytes = await readFile(full);
        if (!fileValid(bytes, entry.name))
          throw new Error("Geçersiz PDF: " + path.relative(publicDir, full));
        const href =
          "/" +
          path
            .relative(publicDir, full)
            .split(path.sep)
            .map(encodeURIComponent)
            .join("/");
        documents.push({
          href,
          bytes: bytes.length,
          sha256: createHash("sha256").update(bytes).digest("hex"),
        });
      }
    }
  }
  await scan(root);
  return {
    version: 1,
    documents: documents.sort((a, b) => a.href.localeCompare(b.href)),
  };
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
  const manifest = await indexDocuments(path.join(root, "public"));
  const dest = path.join(root, "src/cms/bundled-documents.json");
  const json = JSON.stringify(manifest, null, 2) + "\n";
  let current = "";
  try {
    current = await readFile(dest, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (current !== json) {
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, json);
  }
  console.log(
    `${manifest.documents.length} statik PDF derleme için doğrulandı.`,
  );
}
