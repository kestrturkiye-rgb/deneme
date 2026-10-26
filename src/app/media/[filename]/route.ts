import { readFileSync } from "node:fs";
import path from "node:path";
import { dataDir } from "@/cms/store";
import { mediaTypes } from "@/cms/media-format";
export const runtime = "nodejs";
type Context = { params: Promise<{ filename: string }> };

async function serve(request: Request, { params }: Context, head = false) {
  const { filename } = await params;
  if (!/^[a-f0-9-]+\.(jpg|png|gif|webp|avif|pdf|mp4|webm)$/.test(filename))
    return new Response("Bulunamadı", { status: 404 });
  try {
    const data = readFileSync(
      /* turbopackIgnore: true */ path.join(dataDir(), "uploads", filename),
    );
    const headers = new Headers({
      "Content-Type": mediaTypes[filename.split(".").pop()!],
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Accept-Ranges": "bytes",
      "Content-Length": String(data.length),
      ...(filename.endsWith(".pdf")
        ? { "Content-Disposition": `attachment; filename="${filename}"` }
        : {}),
    });
    // HEAD describes the complete representation; ranges apply to GET only.
    if (head) return new Response(null, { headers });
    const range = request.headers.get("range");
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      let start = 0,
        end = data.length - 1;
      if (match && (match[1] || match[2])) {
        if (!match[1]) start = Math.max(0, data.length - Number(match[2]));
        else {
          start = Number(match[1]);
          if (match[2]) end = Math.min(end, Number(match[2]));
        }
      } else start = data.length;
      if (
        !Number.isSafeInteger(start) ||
        !Number.isSafeInteger(end) ||
        start > end ||
        start >= data.length
      ) {
        return new Response(null, {
          status: 416,
          headers: {
            "Content-Range": `bytes */${data.length}`,
            "Accept-Ranges": "bytes",
          },
        });
      }
      headers.set("Content-Range", `bytes ${start}-${end}/${data.length}`);
      headers.set("Content-Length", String(end - start + 1));
      return new Response(data.subarray(start, end + 1), {
        status: 206,
        headers,
      });
    }
    return new Response(data, { headers });
  } catch {
    return new Response("Bulunamadı", { status: 404 });
  }
}
export async function GET(request: Request, context: Context) {
  return serve(request, context);
}
export async function HEAD(request: Request, context: Context) {
  return serve(request, context, true);
}
