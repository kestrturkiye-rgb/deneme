import "server-only";
import { statSync } from "node:fs";
import path from "node:path";
import { dataDir } from "@/cms/store";
import bundled from "@/cms/bundled-documents.json";
const bundledPaths = new Set(
  (bundled.documents as Array<{ href: string }>).map((d) =>
    decodeURIComponent(d.href),
  ),
);

export function documentAvailable(href: string) {
  try {
    const pathname = decodeURIComponent(
      new URL(href, "https://local.invalid").pathname,
    );
    let file: string;
    if (href.startsWith("/media/")) {
      const name = pathname.slice("/media/".length);
      if (!/^[a-f0-9-]+\.(jpg|png|gif|webp|avif|pdf)$/.test(name)) return false;
      file = path.join(dataDir(), "uploads", name);
    } else if (href.startsWith("/docs/")) {
      // Vercel serves public assets separately from the function filesystem.
      if (process.env.VERCEL) return bundledPaths.has(pathname);
      const root = path.join(process.cwd(), "public", "docs");
      file = path.resolve(process.cwd(), "public", "." + pathname);
      if (!file.startsWith(root + path.sep)) return false;
    } else {
      return true;
    }
    return statSync(/* turbopackIgnore: true */ file).isFile();
  } catch {
    return false;
  }
}
