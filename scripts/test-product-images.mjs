// Checks actual displayed photos against the source pixels, not just HTTP status.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
const origin = (
  process.env.SITE_TEST_ORIGIN || "http://localhost:3000"
).replace(/\/$/, "");
const content = JSON.parse(await readFile("src/cms/defaults.json", "utf8"));
const details = content["data-details"].details;
const products = content["data-divisions"].divisions.flatMap((division) =>
  division.groups.flatMap((group) =>
    group.items.map((item) => ({ ...item, division: division.slug })),
  ),
);
const bySlug = (slug) => products.find((item) => item.slug === slug);
const samples = [
  bySlug("maximus-2-0-832551"),
  bySlug("paulson-gozluk-510-arc-sn-12"),
  bySlug("yangin-battaniyesi"),
  ...[
    "itfaiyeci-cizmesi",
    "itfaiyeci-bareti",
    "itfaiyeci-eldiveni",
    "solunum-seti",
  ].map((parent) =>
    products.find(
      (item) =>
        item.parentSlug === parent && details[item.slug]?.images?.length,
    ),
  ),
].filter(
  (item, index, all) =>
    item && all.findIndex((other) => other?.slug === item.slug) === index,
);
assert(
  samples.length >= 5,
  "Expected representative clothing and equipment photos",
);
const pixels = (bytes) =>
  sharp(bytes)
    .rotate()
    .resize(64, 64, { fit: "fill" })
    .flatten({ background: "#ffffff" })
    .toColourspace("srgb")
    .raw()
    .toBuffer();
let checks = 0;
for (const product of samples) {
  const source = details[product.slug].images[0].src;
  const original = await readFile("public" + decodeURIComponent(source));
  const page = await fetch(
    origin + "/" + product.division + "/" + product.slug,
    { signal: AbortSignal.timeout(30000) },
  );
  assert.equal(page.status, 200, product.name);
  const html = await page.text();
  const image = [...html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)]
    .map((match) => new URL(match[1].replaceAll("&amp;", "&"), origin))
    .find(
      (url) =>
        url.pathname === source || url.searchParams.get("url") === source,
    );
  assert(
    image,
    product.name + ": source photo is missing from the rendered gallery",
  );
  const response = await fetch(image, {
    headers: { Accept: "image/avif,image/webp,image/*" },
    signal: AbortSignal.timeout(30000),
  });
  assert.equal(response.status, 200, product.name + ": image delivery failed");
  const actual = Buffer.from(await response.arrayBuffer());
  const expectedMetadata = await sharp(original).metadata();
  const actualMetadata = await sharp(actual).metadata();
  const expectedRatio = expectedMetadata.width / expectedMetadata.height;
  const actualRatio = actualMetadata.width / actualMetadata.height;
  assert(
    Math.abs(actualRatio / expectedRatio - 1) < 0.02,
    product.name + ": displayed image has another photograph's aspect ratio",
  );
  const [expectedPixels, actualPixels] = await Promise.all([
    pixels(original),
    pixels(actual),
  ]);
  assert.equal(actualPixels.length, expectedPixels.length);
  const error =
    actualPixels.reduce(
      (sum, value, index) => sum + Math.abs(value - expectedPixels[index]),
      0,
    ) / actualPixels.length;
  assert(
    error < 18,
    product.name +
      ": displayed image does not match the source photograph; mean pixel difference " +
      error.toFixed(2),
  );
  checks++;
  console.log(
    "PASS " +
      product.name +
      " · " +
      actualMetadata.width +
      "×" +
      actualMetadata.height +
      " · mean pixel difference " +
      error.toFixed(2),
  );
}
console.log(`\n${checks} product photographs match their source images.`);
