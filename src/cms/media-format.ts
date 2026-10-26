export const mediaTypes: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  pdf: "application/pdf",
  mp4: "video/mp4",
  webm: "video/webm",
};
export function mediaExtension(bytes: Uint8Array) {
  const s = (start: number, end: number) =>
    String.fromCharCode(...bytes.slice(start, end));
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "jpg";
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v))
    return "png";
  if (["GIF87a", "GIF89a"].includes(s(0, 6))) return "gif";
  if (s(0, 4) === "RIFF" && s(8, 12) === "WEBP") return "webp";
  if (s(4, 8) === "ftyp" && ["avif", "avis"].includes(s(8, 12))) return "avif";
  if (
    s(4, 8) === "ftyp" &&
    [
      "isom",
      "iso2",
      "iso5",
      "iso6",
      "mp41",
      "mp42",
      "avc1",
      "M4V ",
      "MSNV",
      "dash",
    ].includes(s(8, 12))
  )
    return "mp4";
  if (
    [0x1a, 0x45, 0xdf, 0xa3].every((v, i) => bytes[i] === v) &&
    // EBML DocType must be WebM, not another EBML container such as Matroska.
    /\x42\x82\x84webm/.test(s(0, 512))
  )
    return "webm";
  if (s(0, 5) === "%PDF-") return "pdf";
  return "";
}
