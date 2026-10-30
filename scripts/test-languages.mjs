import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import net from "node:net";
import { spawn } from "node:child_process";
import { randomBytes, scryptSync } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
if (!process.env.CMS_BROWSER_MODULE)
  throw Error("Set CMS_BROWSER_MODULE to a Playwright module path.");
const { chromium } = await import(process.env.CMS_BROWSER_MODULE),
  dataDir = await mkdtemp(path.join(tmpdir(), "kivanc-languages-test-"));
let server,
  browser,
  output = "",
  passed = 0;
const ok = (message) => {
  passed++;
  console.log("PASS " + message);
};
try {
  const username = "language-test",
    password = randomBytes(24).toString("hex"),
    salt = randomBytes(24).toString("hex");
  await writeFile(
    path.join(dataDir, "admin.json"),
    JSON.stringify({
      username,
      salt,
      hash: scryptSync(password, salt, 64).toString("hex"),
      secret: randomBytes(48).toString("hex"),
      mustChangePassword: false,
    }),
    { mode: 0o600 },
  );
  const fixture = JSON.parse(await readFile("src/cms/defaults.json", "utf8"));
  fixture["data-details"].details["maximus-2-0-832551"].spin = {
    frames: ["/logo.png", "/images/brand/kivanc-group-header.webp"],
    angles: [0, 180],
    alt: "Test dönüş görselleri",
  };
  await writeFile(
    path.join(dataDir, "content.json"),
    JSON.stringify({
      version: 0,
      draft: fixture,
      published: fixture,
      updatedAt: null,
      publishedAt: null,
      history: [],
    }),
    { mode: 0o600 },
  );
  const listener = net.createServer();
  await new Promise((r) => listener.listen(0, "127.0.0.1", r));
  const port = listener.address().port;
  await new Promise((r) => listener.close(r));
  const origin = "http://localhost:" + port;
  server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "-H",
      "127.0.0.1",
      "-p",
      String(port),
    ],
    {
      env: {
        ...process.env,
        CMS_DATA_DIR: dataDir,
        SITE_ORIGIN: origin,
        SITE_NOINDEX: "true",
        VERCEL: "",
        NETLIFY: "",
        SUPABASE_URL: "",
        SUPABASE_SERVICE_ROLE_KEY: "",
        RESEND_API_KEY: "",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  server.stdout.on("data", (b) => (output += b));
  server.stderr.on("data", (b) => (output += b));
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch(origin + "/api/admin/auth")).ok) break;
    } catch {}
    if (i === 79) throw Error("Server did not start");
    await delay(100);
  }
  const login = await fetch(origin + "/api/admin/auth", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie").split(";")[0];
  const api = async (body) =>
    fetch(origin + "/api/admin/content", {
      method: body ? "POST" : "GET",
      headers: {
        Cookie: cookie,
        Origin: origin,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  let state = await (await api()).json();
  browser = await chromium.launch({
    executablePath: process.env.CMS_BROWSER_EXECUTABLE || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const ctx = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    }),
    page = await ctx.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const strings = {
    tr: ["Isıya ve aleve karşı", "Teklif sepetine ekle", "İtfaiyeci Elbisesi"],
    en: [
      "Against heat and flame,",
      "Add to quote basket",
      "Firefighting suits",
    ],
    es: [
      "Contra el calor y las llamas,",
      "Añadir al presupuesto",
      "Trajes de bombero",
    ],
    ar: [
      "في مواجهة الحرارة واللهب،",
      "أضف إلى سلة عروض الأسعار",
      "بدلات رجال الإطفاء",
    ],
    de: [
      "Gegen Hitze und Flammen:",
      "Zum Angebotskorb hinzufügen",
      "Feuerwehrschutzanzüge",
    ],
  };
  for (const lang of ["tr", "en", "es", "ar", "de"]) {
    const prefix = lang === "tr" ? "" : "/" + lang,
      response = await page.goto(origin + prefix + "/", {
        waitUntil: "networkidle",
      });
    assert.equal(response.status(), 200);
    assert.equal(await page.locator("html").getAttribute("lang"), lang);
    assert.equal(
      await page.locator("html").getAttribute("dir"),
      lang === "ar" ? "rtl" : "ltr",
    );
    assert(
      (await page.locator("#hero-heading").innerText()).includes(
        strings[lang][0],
      ),
    );
    assert.equal(
      await page.locator(".kg-hero-actions a").first().getAttribute("href"),
      prefix + "/is-guvenligi",
    );
    assert.equal(
      await page.locator("link[rel=canonical]").getAttribute("href"),
      origin + prefix,
    );
    assert.equal(
      await page.locator("link[rel=alternate][hreflang]").count(),
      6,
    );
    await page.locator(".kg-language summary").click();
    assert.equal(await page.locator(".kg-language nav a").count(), 5);
    await page.keyboard.press("Escape");
    await page.locator(".kg-hero-actions a").first().click();
    await page.waitForURL("**" + prefix + "/is-guvenligi");
    assert.equal(await page.locator("html").getAttribute("lang"), lang);
    assert(
      (
        (await page
          .locator(".catalog-group-nav a")
          .first()
          .getAttribute("href")) || ""
      ).startsWith("#"),
    );
    const family = prefix + "/is-guvenligi/itfaiyeci-elbisesi";
    await page.goto(origin + family, { waitUntil: "networkidle" });
    assert.equal(
      await page.locator(".family-heading h1").innerText(),
      strings[lang][2],
    );
    assert.equal(
      await page.locator(".family-model-grid .kg-product-card").count(),
      8,
    );
    assert.equal(
      await page.locator(".family-model-grid a").first().getAttribute("href"),
      prefix + "/is-guvenligi/maximus-2-0-832551",
    );
    await page.locator(".family-model-grid a").first().click();
    await page.waitForURL("**" + prefix + "/is-guvenligi/maximus-2-0-832551");
    await page.locator(".p360[data-ready=true]").waitFor();
    await page.locator(".p360-orbit button").nth(1).click();
    assert.equal(
      await page.locator(".p360-image").getAttribute("src"),
      "/images/brand/kivanc-group-header.webp",
    );
    await page
      .locator(".product-quote")
      .getByRole("button", { name: strings[lang][1], exact: true })
      .click();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      lang,
    );
    ok(
      lang +
        ": localized HTML, home/navigation, stable category/model links and working 360/quote controls",
    );
  }
  await page.goto(origin + "/en/teklif-sepeti", { waitUntil: "networkidle" });
  assert.equal(await page.locator("input[type=number]").count(), 1);
  assert.equal(await page.locator("input[type=number]").inputValue(), "5");
  ok("changing language preserves a single quote item and its quantity");
  await page.goto(
    origin + "/es/is-guvenligi/maximus-2-0-832551?test=kept#urun-detaylari",
    { waitUntil: "networkidle" },
  );
  await page.locator(".kg-language summary").click();
  assert.equal(
    await page.locator(".kg-language a[lang=de]").getAttribute("href"),
    "/de/is-guvenligi/maximus-2-0-832551?test=kept#urun-detaylari",
  );
  await page.locator(".kg-language a[lang=de]").click();
  await page.waitForURL(
    "**/de/is-guvenligi/maximus-2-0-832551?test=kept#urun-detaylari",
  );
  assert.equal(await page.locator("html").getAttribute("lang"), "de");
  ok(
    "language switch preserves the exact product, query string and section anchor",
  );
  await page.goto(origin + "/ar", { waitUntil: "networkidle" });
  await page.locator(".kg-sector-solutions a").first().click();
  await page.waitForURL("**/ar/is-guvenligi#itfaiye-urunleri");
  assert.equal(await page.locator("#itfaiye-urunleri").count(), 1);
  ok("Arabic activity links use stable nonempty category anchors");
  for (const lang of ["en", "es", "ar", "de"]) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(origin + "/" + lang, { waitUntil: "networkidle" });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      lang + " phone overflow",
    );
    const header = await page.locator(".kg-header-main").boundingBox();
    assert(header.width <= 390);
    await page.locator(".kg-language summary").click();
    for (const link of await page.locator(".kg-language nav a").all()) {
      const b = await link.boundingBox();
      assert(b.x >= 0 && b.x + b.width <= 390);
      assert(b.height >= 44);
    }
    await page.keyboard.press("Escape");
    const [hero, heading, selector] = await Promise.all(
      [".kg-story-hero", "#hero-heading", ".kg-story-selector"].map((s) =>
        page.locator(s).boundingBox(),
      ),
    );
    assert(
      heading.y >= hero.y && heading.y + heading.height < selector.y,
      lang + " hero heading covers selector",
    );
    await page.goto(origin + "/" + lang + "/iletisim", {
      waitUntil: "networkidle",
    });
    await page.locator("input[name=name]").fill("Language test");
    await page.locator("input[name=email]").fill("language@example.com");
    await page.locator("textarea[name=message]").fill("Local fixture only");
    await page.locator("input[name=consent]").check();
    const submit = page.waitForResponse(
      (r) =>
        r.url() === origin + "/api/mesaj" && r.request().method() === "POST",
    );
    await page.locator("main form button[type=submit]").click();
    assert.equal((await submit).status(), 200);
    await page.locator("main [role=status]").waitFor();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    ok(
      lang +
        ": phone language menu, banner fit and real isolated contact submission",
    );
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(origin + "/admin", { waitUntil: "networkidle" });
  await page.getByLabel("Kullanıcı adı", { exact: true }).fill(username);
  await page.getByLabel("Parola", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Güvenli giriş →", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Diller ve çeviriler", exact: true })
    .click();
  await page.getByLabel("Çeviri dili", { exact: true }).selectOption("de");
  await page
    .getByLabel("Isıya ve aleve karşı çevirisi", { exact: true })
    .fill("Schutz für jeden Einsatz");
  const saved = page.waitForResponse(
    (r) =>
      r.url() === origin + "/api/admin/content" &&
      r.request().method() === "POST",
  );
  await page
    .locator(".adm-savebar")
    .getByRole("button", { name: "Taslağı kaydet", exact: true })
    .click();
  assert.equal((await saved).status(), 200);
  state = await (await api()).json();
  const source = state.draft["components-Hero"].metin02;
  assert.equal(source, "Isıya ve aleve karşı");
  assert.equal(
    await (await fetch(origin + "/de"))
      .text()
      .then((t) => t.includes("Schutz für jeden Einsatz")),
    false,
  );
  await page
    .getByRole("button", { name: "Bu dilde taslağı önizle ↗", exact: true })
    .click();
  await page.waitForURL("**/de");
  await page
    .getByRole("heading", { name: /Schutz für jeden Einsatz/ })
    .waitFor();
  ok(
    "admin translation save affects only the chosen language and its actual draft preview",
  );
  state = await (await api()).json();
  const published = await api({
    action: "publish",
    version: state.version,
    content: state.draft,
  });
  assert.equal(published.status, 200);
  state = await published.json();
  assert(
    (await (await fetch(origin + "/de")).text()).includes(
      "Schutz für jeden Einsatz",
    ),
  );
  assert(
    !(await (await fetch(origin + "/")).text()).includes(
      "Schutz für jeden Einsatz",
    ),
  );
  const bad = structuredClone(state.draft),
    key = Object.keys(bad.localization.translations.de)[0];
  bad.localization.translations.de[key].source = "{count} objects";
  const rejected = await api({
    action: "save",
    version: state.version,
    content: bad,
  });
  assert.equal(rejected.status, 400);
  ok(
    "published language overrides persist, Turkish stays intact and mismatched translation keys are rejected",
  );
  const sitemap = await (await fetch(origin + "/sitemap.xml")).text();
  for (const lang of ["en", "es", "ar", "de"])
    assert(
      sitemap.includes(
        origin + "/" + lang + "/is-guvenligi/maximus-2-0-832551",
      ),
    );
  for (const path of [
    "/en/admin",
    "/ar/api/admin/content",
    "/de/media/test.png",
  ])
    assert.equal((await fetch(origin + path)).status, 404);
  const spoof = await (
    await fetch(origin + "/", { headers: { "x-kivanc-locale": "de" } })
  ).text();
  assert(spoof.includes('<html lang="tr"'));
  const apiError = await fetch(origin + "/api/mesaj", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-site-language": "es" },
    body: "{}",
  });
  assert.equal((await apiError.json()).error, "Introduce tu nombre.");
  assert.deepEqual(errors, []);
  ok(
    "localized sitemap, protected routes, unspoofable locale and translated form errors",
  );
  console.log(
    `\n${passed} language checks passed. Temporary account and data removed.`,
  );
} catch (error) {
  console.error(output.slice(-4500));
  throw error;
} finally {
  await browser?.close();
  if (server) {
    server.kill("SIGTERM");
    await new Promise((r) => server.once("exit", r));
  }
  await rm(dataDir, { recursive: true, force: true });
}
