import { mkdir } from "node:fs/promises";
if (!process.env.CMS_BROWSER_MODULE)
  throw new Error(
    "CMS_BROWSER_MODULE must point to Playwright. Start the site first; see README.md.",
  );
const { chromium } = await import(process.env.CMS_BROWSER_MODULE);
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
const root = process.env.SITE_TEST_ORIGIN || "http://127.0.0.1:3000";
await mkdir(".migration/verification", { recursive: true });
const redirects = JSON.parse(
  await readFile("src/cms/legacy-paths.json", "utf8"),
);
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const errors = [];
const checks = [];
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
});
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(root, { waitUntil: "networkidle" });
  const nav = page.locator(".kg-desktop-nav");
  assert.equal(await nav.locator(":scope > a,:scope > button").count(), 8);
  await nav.getByRole("button", { name: "Ürünlerimiz", exact: true }).click();
  await nav
    .getByRole("link", { name: "İtfaiyeci Elbisesi", exact: true })
    .waitFor();
  await nav.getByRole("button", { name: "Mühendislik", exact: true }).click();
  await nav
    .getByRole("link", { name: "Dikiş İplikleri", exact: true })
    .waitFor();
  await nav.getByRole("button", { name: "Madencilik", exact: true }).click();
  await nav
    .getByRole("link", { name: "Silis Kumu Nedir?", exact: true })
    .waitFor();
  await page.keyboard.press("Escape");
  assert.equal(
    await nav
      .getByRole("button", { name: "Ürünlerimiz", exact: true })
      .getAttribute("aria-expanded"),
    "false",
  );
  checks.push(
    "Eight original main tabs, all three mega-menu sectors, keyboard close",
  );
  await nav.getByRole("button", { name: "Hakkımızda", exact: true }).click();
  await nav.getByRole("link", { name: "Tarihçe", exact: true }).click();
  await page.waitForURL("**/tarihce");
  checks.push("Corporate submenu and history destination");
  await page.goto(root + "/is-guvenligi/itfaiyeci-elbisesi", {
    waitUntil: "networkidle",
  });
  await page
    .locator("#modeller")
    .getByRole("link", { name: /Maximus 2.0/ })
    .click();
  await page.waitForURL("**/maximus-2-0-832551");
  const first = await page.locator(".product-photo img").getAttribute("src");
  await page.locator(".product-thumbnails button").nth(1).click();
  assert.notEqual(
    await page.locator(".product-photo img").getAttribute("src"),
    first,
  );
  assert.equal(await page.locator(".p360-stage").count(), 0);
  checks.push(
    "Real model cards, separate detail page, front/back gallery, no invented 360 frames",
  );
  await page.goto(root + "/dokumanlar", { waitUntil: "networkidle" });
  const search = page.getByRole("searchbox", { name: "Belge ara" });
  await search.fill("Maximus");
  assert.equal(
    await page.locator(".document-library-search + ul > li").count(),
    1,
  );
  assert.match(
    await page.locator(".document-library-search + ul a").getAttribute("href"),
    /Maximus/,
  );
  await search.fill("xxxx-olmayan");
  await page.getByText("Aramanızla eşleşen belge bulunamadı.").waitFor();
  checks.push(
    "Document title search, downloadable result and accessible empty state",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(root, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Menüyü aç", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("link", { name: "Mühendislik", exact: true }).click();
  await page.waitForURL("**/muhendislik");
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  checks.push("Mobile section links and layout");
  const bad = [];
  let cursor = 0;
  await Promise.all(
    Array.from({ length: 5 }, async () => {
      while (cursor < redirects.length) {
        const entry = redirects[cursor++];
        const response = await fetch(root + entry.source, {
          method: "HEAD",
          redirect: "manual",
        });
        const expected = new URL(entry.destination, root);
        const actual = response.headers.get("location");
        if (
          response.status !== 308 ||
          new URL(actual, root).href !== expected.href
        )
          bad.push({ entry, status: response.status, actual });
      }
    }),
  );
  console.log(
    JSON.stringify(
      { checks, redirects: redirects.length, bad, errors },
      null,
      2,
    ),
  );
  await writeFile(
    ".migration/verification/menu-ve-yonlendirmeler.json",
    JSON.stringify(
      { checks, redirects: redirects.length, bad, errors },
      null,
      2,
    ),
  );
  assert.deepEqual(bad, []);
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
