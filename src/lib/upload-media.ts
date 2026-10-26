import { mediaExtension, mediaTypes } from "@/cms/media-format";
async function result(response: Response) {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Dosya yüklenemedi.");
  return data;
}
export async function uploadMedia(file: File) {
  if (!file.size || file.size > 10_000_000)
    throw new Error("Dosya 1 bayt–10 MB arasında olmalı.");
  const extension = mediaExtension(
    new Uint8Array(await file.slice(0, 512).arrayBuffer()),
  );
  if (!extension)
    throw new Error("JPG, PNG, GIF, WebP, AVIF, PDF, MP4 veya WebM seçin.");
  const prepared = await result(
    await fetch("/api/admin/media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "prepare",
        size: file.size,
        type: mediaTypes[extension],
      }),
    }),
  );
  if (prepared.mode === "local") {
    const body = new FormData();
    body.set("file", file);
    return result(await fetch("/api/admin/media", { method: "POST", body }));
  }
  // The signed upload bypasses Vercel's function body limit. No service key reaches the browser.
  const body = new FormData();
  body.append("cacheControl", "31536000");
  body.append(
    "",
    new File([file], file.name, { type: mediaTypes[extension] }),
    file.name,
  );
  const uploaded = await fetch(prepared.signedUrl, {
    method: "PUT",
    headers: { "x-upsert": "false" },
    body,
  });
  if (!uploaded.ok) throw new Error("Dosya deposuna yükleme tamamlanamadı.");
  return result(
    await fetch("/api/admin/media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete", path: prepared.path }),
    }),
  );
}
