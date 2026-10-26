import { readFileSync } from "node:fs";
import path from "node:path";
import { dataDir } from "@/cms/store";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  if (!/^[a-f0-9-]+\.(jpg|png|gif|webp|avif|pdf)$/.test(filename))
    return new Response("Bulunamadı", { status: 404 });
  const types: Record<string, string> = {
    jpg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    avif: "image/avif",
    pdf: "application/pdf",
  };
  try {
    const data = readFileSync(
      /* turbopackIgnore: true */ path.join(dataDir(), "uploads", filename),
    );
    return new Response(data, {
      headers: {
        "Content-Type": types[filename.split(".").pop()!],
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        ...(filename.endsWith(".pdf")
          ? { "Content-Disposition": `attachment; filename="${filename}"` }
          : {}),
      },
    });
  } catch {
    return new Response("Bulunamadı", { status: 404 });
  }
}
