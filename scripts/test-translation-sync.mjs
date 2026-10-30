import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import net from "node:net";
import { spawn } from "node:child_process";
import { randomBytes, scryptSync } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { translationFixtureOptions } from "./translation-test-helpers.mjs";

// The external provider is explicitly simulated. The real app's authenticated
// HTTP endpoints, persistence, CAS, HTML rendering and browser flow are not.
const dir = await mkdtemp(path.join(tmpdir(), "kivanc-translation-sync-")),
  control = path.join(dir, "provider.json"),
  log = path.join(dir, "requests.jsonl"),
  languages = ["en", "es", "ar", "de"];
let server,
  browser,
  output = "",
  checks = 0;
const ok = (message) => {
  checks++;
  console.log("PASS " + message);
};
try {
  const username = "sync-test",
    password = randomBytes(24).toString("hex"),
    salt = randomBytes(24).toString("hex");
  await writeFile(
    path.join(dir, "admin.json"),
    JSON.stringify({
      username,
      salt,
      hash: scryptSync(password, salt, 64).toString("hex"),
      secret: randomBytes(48).toString("hex"),
      mustChangePassword: false,
    }),
    { mode: 0o600 },
  );
  await writeFile(control, "{}");
  await writeFile(log, "");
  const setProvider = async (settings = {}) =>
      writeFile(control, JSON.stringify(settings)),
    requests = async () =>
      (await readFile(log, "utf8"))
        .trim()
        .split("\n")
        .filter(Boolean)
        .map(JSON.parse);
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
        CMS_DATA_DIR: dir,
        SITE_ORIGIN: origin,
        SITE_NOINDEX: "true",
        SUPABASE_URL: "",
        SUPABASE_SERVICE_ROLE_KEY: "",
        RESEND_API_KEY: "",
        NETLIFY: "",
        VERCEL: "",
        NODE_OPTIONS: translationFixtureOptions,
        CMS_TRANSLATION_TEST_CONTROL: control,
        CMS_TRANSLATION_TEST_LOG: log,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  server.stdout.on("data", (b) => (output += b));
  server.stderr.on("data", (b) => (output += b));
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(origin + "/api/admin/auth")).ok) break;
    } catch {}
    if (i === 99) throw Error("Server did not start");
    await delay(100);
  }
  const login = await fetch(origin + "/api/admin/auth", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie").split(";")[0];
  const api = (url, body, customHeaders = {}) =>
    fetch(origin + url, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        Cookie: cookie,
        Origin: origin,
        "Content-Type": "application/json",
        ...customHeaders,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  const getState = async () => (await api("/api/admin/content")).json();
  const save = async (content, version) => {
    const r = await api("/api/admin/content", {
      action: "save",
      version: version ?? (await getState()).version,
      content,
    });
    assert.equal(r.status, 200, await r.clone().text());
    return r.json();
  };
  const batch = async (state, scope = "changes") => {
    const r = await api("/api/admin/translations", {
      version: state.version,
      scope,
    });
    assert.equal(r.status, 200, await r.clone().text());
    return r.json();
  };
  const sync = async (state) => {
    for (let i = 0; i < 500; i++) {
      const result = await batch(state);
      assert.equal(result.sync.error, null);
      state = result.state;
      if (!result.sync.remaining) return state;
    }
    throw Error("Translation did not finish");
  };
  const publish = async (state) => {
    const r = await api("/api/admin/content", {
      action: "publish",
      version: state.version,
      content: state.draft,
    });
    assert.equal(r.status, 200, await r.clone().text());
    return r.json();
  };
  assert.equal(
    (
      await fetch(origin + "/api/admin/translations", {
        method: "POST",
        body: "{}",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await api(
        "/api/admin/translations",
        { version: 0, scope: "all" },
        { Origin: "https://invalid.test" },
      )
    ).status,
    403,
  );
  assert.equal(
    (await api("/api/admin/translations", { version: 0, scope: "unknown" }))
      .status,
    400,
  );
  assert.equal(
    (
      await api("/api/admin/translations", {
        version: 0,
        scope: "changes",
        url: "http://invalid.test",
      })
    ).status,
    400,
  );
  assert.equal(
    (await api("/api/admin/translations", { version: -1, scope: "changes" }))
      .status,
    409,
  );
  assert.equal((await requests()).length, 0);
  ok(
    "translation writes require an administrator, same origin, valid scope/version and accept no external destination",
  );
  let state = await getState(),
    initial = structuredClone(state.published);
  let result = await batch(state);
  assert.equal(result.sync.remaining, 0);
  assert.equal(result.state.version, state.version);
  assert.equal((await requests()).length, 0);
  ok(
    "untouched existing content makes no translation request or version write",
  );
  const first = "Zorlu görevlerde güvenli hareket";
  state.draft["components-Hero"].metin02 = first;
  state = await save(state.draft);
  let r = await api("/api/admin/content", {
    action: "publish",
    content: state.draft,
    version: state.version,
  });
  assert.equal(r.status, 422);
  assert.equal((await r.json()).code, "TRANSLATIONS_REQUIRED");
  assert.deepEqual((await getState()).published, initial);
  ok(
    "direct publication cannot bypass four-language preparation; Turkish draft and prior live content stay intact",
  );
  state = await sync(state);
  for (const lang of languages) {
    const entry = Object.values(
      state.draft.localization.translations[lang],
    ).find((e) => e.source === first);
    assert.equal(entry.text, `[${lang}] ${first}`);
    assert.equal(entry.automatic, true);
  }
  state = await publish(state);
  for (const lang of ["tr", ...languages]) {
    const html = await (
      await fetch(origin + (lang === "tr" ? "/" : "/" + lang))
    ).text();
    assert(html.includes(`lang="${lang}"`));
    assert(html.includes(lang === "tr" ? first : `[${lang}] ${first}`));
  }
  assert(state.history.length);
  assert(!Object.hasOwn(state.history[0], "content"));
  ok(
    "one Turkish edit becomes four persisted translations and five real public pages, without transferring revision bodies",
  );
  const liveVersion = structuredClone(state.published),
    second = "Her koşulda gelişmiş koruma";
  state.draft["components-Hero"].metin02 = second;
  state = await save(state.draft);
  await setProvider({ mode: "partial" });
  result = await batch(state);
  assert.equal(result.sync.completed, 3);
  assert.equal(result.sync.remaining, 1);
  assert(result.sync.error);
  state = result.state;
  assert.deepEqual(state.published, liveVersion);
  const callsBeforeRetry = (await requests()).length;
  await setProvider();
  state = await sync(await getState());
  assert.equal((await requests()).length - callsBeforeRetry, 1);
  state = await publish(state);
  ok(
    "partial service failure preserves completed languages and retries only the missing one before atomic publication",
  );
  const third = "Yeni nesil saha koruması";
  state.draft["components-Hero"].metin02 = third;
  state = await save(state.draft);
  for (const mode of ["fail", "malformed"]) {
    await setProvider({ mode });
    result = await batch(state);
    assert.equal(result.sync.completed, 0);
    assert.equal(result.sync.remaining, 4);
    assert(result.sync.error);
    assert.equal(result.state.version, state.version);
    assert.equal((await getState()).draft["components-Hero"].metin02, third);
    assert.equal(
      (await getState()).published["components-Hero"].metin02,
      second,
    );
  }
  await setProvider();
  state = await sync(state);
  state = await publish(state);
  ok(
    "rate limits and malformed provider replies never clear drafts, overwrite good translations or partially publish",
  );
  const protectedSource =
    "Maximus 2.0 (832551), EN 469:2020 için {count} ürün. Ayrıntılar: https://example.com/docs?id=1#bolum\n\nİkinci paragrafta güvenilir koruma ve %s bilgisi.";
  state.draft["data-details"].details["maximus-2-0-832551"].description = [
    protectedSource,
  ];
  state = await save(state.draft);
  await setProvider({ mode: "tokens" });
  result = await batch(state);
  assert.equal(result.sync.completed, 0);
  assert(result.sync.error);
  await setProvider();
  state = await sync(state);
  for (const lang of languages) {
    const text = Object.values(
      state.draft.localization.translations[lang],
    ).find((e) => e.source === protectedSource).text;
    for (const preserved of [
      "Maximus 2.0",
      "832551",
      "EN 469:2020",
      "{count}",
      "%s",
      "https://example.com/docs?id=1#bolum",
      "\n\n",
    ])
      assert(text.includes(preserved), preserved);
    assert(!text.includes("KIVANCPRESERVE"));
  }
  state = await publish(state);
  ok(
    "models, standards, article codes, URLs, formatting placeholders and paragraph breaks survive; damaged tokens are rejected",
  );
  const key = Object.keys(state.draft.localization.translations.en).find(
    (id) => state.draft.localization.translations.en[id].source === third,
  );
  state.draft.localization.translations.en[key] = {
    source: third,
    text: "Professionally reviewed field protection",
  };
  state = await save(state.draft);
  const beforeManual = (await requests()).length;
  state = await sync(state);
  state = await publish(state);
  assert.equal((await requests()).length, beforeManual);
  assert.equal(
    state.published.localization.translations.en[key].text,
    "Professionally reviewed field protection",
  );
  delete state.draft.localization.translations.de[key];
  state = await save(state.draft);
  result = await batch(state);
  assert.equal(result.sync.completed, 1);
  state = result.state;
  state = await publish(state);
  assert.equal(
    state.published.localization.translations.en[key].text,
    "Professionally reviewed field protection",
  );
  ok(
    "manual corrections survive unchanged Turkish text; removing a generated translation regenerates only that language",
  );
  const fourth = "Sahada sürdürülebilir performans";
  state.draft["components-Hero"].metin02 = fourth;
  state = await save(state.draft);
  await setProvider({ delay: 500 });
  const inFlight = api("/api/admin/translations", {
    version: state.version,
    scope: "changes",
  });
  const count = (await requests()).length;
  for (let i = 0; i < 100 && (await requests()).length === count; i++)
    await delay(10);
  const concurrent = structuredClone(state.draft);
  concurrent["components-Hero"].metin02 = "Diğer oturumun güncel başlığı";
  state = await save(concurrent, state.version);
  assert.equal((await inFlight).status, 409);
  assert.equal(
    (await getState()).draft["components-Hero"].metin02,
    concurrent["components-Hero"].metin02,
  );
  await setProvider();
  state = await sync(state);
  state = await publish(state);
  ok(
    "an in-flight translation cannot overwrite a newer edit from another administrator session",
  );
  const slug = "tek-kaynaktan-test-urunu",
    name = "Türkçe panelden yeni kıyafet";
  state.draft["data-divisions"].divisions[0].groups[0].items.push({
    slug,
    name,
  });
  const detail = structuredClone(
    state.draft["data-details"].details["maximus-2-0-832551"],
  );
  detail.description = ["Yeni ürün için ortak açıklama ve koruma."];
  detail.images = [{ src: "/logo.png", alt: "Yeni test kıyafeti" }];
  detail.spin = {
    frames: ["/logo.png", "/images/brand/kivanc-group-header.webp"],
    angles: [0, 180],
    alt: "Dönen test kıyafeti",
  };
  delete detail.parentSlug;
  state.draft["data-details"].details[slug] = detail;
  state = await save(state.draft);
  state = await sync(state);
  state = await publish(state);
  for (const lang of ["tr", ...languages]) {
    const response = await fetch(
      origin + (lang === "tr" ? "" : "/" + lang) + "/is-guvenligi/" + slug,
    );
    assert.equal(response.status, 200);
    const html = await response.text();
    assert(html.includes(lang === "tr" ? name : `[${lang}] ${name}`));
    assert(html.includes("/logo.png"));
  }
  const sitemap = await (await fetch(origin + "/sitemap.xml")).text();
  for (const lang of languages)
    assert(sitemap.includes(`/${lang}/is-guvenligi/${slug}`));
  ok(
    "adding one product creates its images, 360 data, translated content and sitemap routes in all five languages",
  );
  const beforeMedia = (await requests()).length;
  state.draft["components-Hero"].heroImage = "/logo.png";
  state.draft.home.sections[1].visible = false;
  state.draft["data-divisions"].divisions[0].groups[0].items.reverse();
  const max = state.draft["data-details"].details["maximus-2-0-832551"];
  max.images[0].src = "/logo.png";
  max.spin = {
    frames: ["/logo.png", "/images/brand/kivanc-group-header.webp"],
    angles: [20, 200],
    alt: "Ürün görselleri",
  };
  state = await save(state.draft);
  result = await batch(state);
  assert.equal(result.sync.completed, 0);
  assert.equal(result.sync.remaining, 0);
  state = await publish(result.state);
  assert.equal((await requests()).length, beforeMedia);
  ok(
    "image/frame/angle/visibility changes and product reordering publish without any translation request",
  );
  state.draft["data-divisions"].divisions[0].groups[0].items = state.draft[
    "data-divisions"
  ].divisions[0].groups[0].items.filter((p) => p.slug !== slug);
  delete state.draft["data-details"].details[slug];
  state = await save(state.draft);
  state = await publish(state);
  for (const lang of ["tr", ...languages])
    assert.equal(
      (
        await fetch(
          origin + (lang === "tr" ? "" : "/" + lang) + "/is-guvenligi/" + slug,
        )
      ).status,
      404,
    );
  assert(!(await (await fetch(origin + "/sitemap.xml")).text()).includes(slug));
  assert.equal((await requests()).length, beforeMedia);
  ok(
    "deleting a Turkish product removes all five routes and sitemap entries without separate language edits",
  );
  const long =
    "Gelişmiş hareket kabiliyeti ve uzun süreli kullanım konforu. ".repeat(
      170,
    ) + "\n\nEN 469 standardı ve {count} seçenek.";
  state.draft["data-details"].details["maximus-2-0-832551"].description = [
    long,
  ];
  state = await save(state.draft);
  const beforeLong = (await requests()).length;
  state = await sync(state);
  assert((await requests()).length - beforeLong > 4);
  for (const lang of languages) {
    const text = Object.values(
      state.draft.localization.translations[lang],
    ).find((e) => e.source === long).text;
    assert(text.includes("\n\n"));
    assert(text.includes("EN 469"));
    assert(text.includes("{count}"));
  }
  state = await publish(state);
  ok(
    "long technical descriptions are split into bounded requests and reconstructed with their formatting and tokens",
  );
  result = await batch(state, "all");
  assert(result.sync.remaining > 0);
  assert.equal(result.sync.completed, 4);
  assert.equal(result.state.publishedAt, state.publishedAt);
  state = result.state;
  ok(
    "older untranslated content can be completed in resumable batches without publishing or changing Turkish source",
  );
  if (process.env.CMS_BROWSER_MODULE) {
    const { chromium } = await import(process.env.CMS_BROWSER_MODULE);
    browser = await chromium.launch({
      executablePath: "/usr/bin/chromium",
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
    const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(origin + "/admin");
    await page.getByLabel("Kullanıcı adı", { exact: true }).fill(username);
    await page.getByLabel("Parola", { exact: true }).fill(password);
    await page
      .getByRole("button", { name: "Güvenli giriş →", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Diller ve çeviriler", exact: true })
      .click();
    await page
      .getByText("Türkçeden otomatik güncelleme etkin", { exact: true })
      .waitFor();
    assert(
      await page
        .getByRole("button", { name: "Eksik çevirileri tamamla", exact: true })
        .isEnabled(),
    );
    state.draft["components-Hero"].metin02 = "Tek panelden tüm dillere";
    state = await save(state.draft);
    await page.reload();
    await setProvider({ delay: 300 });
    page.once("dialog", (d) => d.accept());
    const published = page.waitForResponse(
      (r) =>
        r.url() === origin + "/api/admin/content" &&
        r.request().method() === "POST" &&
        r.request().postDataJSON().action === "publish",
    );
    await page
      .locator(".adm-savebar")
      .getByRole("button", { name: "Yayınla →", exact: true })
      .click();
    await page.locator(".adm-sync-progress").waitFor();
    assert(await page.locator(".adm-main").evaluate((e) => e.inert));
    assert.equal((await published).status(), 200);
    await page.waitForFunction(
      () => !document.querySelector(".adm-main").inert,
    );
    state = await getState();
    for (const lang of languages)
      assert(
        Object.values(state.published.localization.translations[lang]).some(
          (e) => e.source === "Tek panelden tüm dillere",
        ),
      );
    await setProvider();
    ok(
      "the actual Publish button saves Turkish, shows accessible progress, locks editing, translates and publishes five languages",
    );
    state.draft["components-Hero"].metin02 =
      "Bağlantı sonrasında devam eden yayın";
    state = await save(state.draft);
    await page.reload();
    await setProvider({ mode: "fail" });
    page.once("dialog", (d) => d.accept());
    await page
      .locator(".adm-savebar")
      .getByRole("button", { name: "Yayınla →", exact: true })
      .click();
    await page
      .getByRole("alert")
      .filter({ hasText: "Çeviri hizmetine" })
      .waitFor();
    assert.equal(
      (await getState()).published["components-Hero"].metin02,
      "Tek panelden tüm dillere",
    );
    await setProvider();
    page.once("dialog", (d) => d.accept());
    const retry = page.waitForResponse(
      (r) =>
        r.url() === origin + "/api/admin/content" &&
        r.request().method() === "POST" &&
        r.request().postDataJSON().action === "publish",
    );
    await page
      .locator(".adm-savebar")
      .getByRole("button", { name: "Yayınla →", exact: true })
      .click();
    assert.equal((await retry).status(), 200);
    await page.waitForFunction(
      () => !document.querySelector(".adm-main").inert,
    );
    assert.equal(
      (await getState()).published["components-Hero"].metin02,
      "Bağlantı sonrasında devam eden yayın",
    );
    assert.deepEqual(errors, []);
    ok(
      "browser failures retain the editable draft and prior live site; clicking Publish again resumes successfully",
    );
  }
  console.log(
    `\n${checks} translation synchronization checks passed. Provider replies were isolated fixtures; live Google access is a separate check.`,
  );
} catch (error) {
  console.error(output.slice(-5000));
  throw error;
} finally {
  await browser?.close();
  if (server) {
    server.kill("SIGTERM");
    await new Promise((r) => server.once("exit", r));
  }
  await rm(dir, { recursive: true, force: true });
}
