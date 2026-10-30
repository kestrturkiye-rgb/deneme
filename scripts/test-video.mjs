// End-to-end video checks use generated test patterns, never company footage.
import assert from "node:assert/strict";
import {
  translationFixtureOptions,
  publishWithTranslations,
} from "./translation-test-helpers.mjs";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { randomBytes, scryptSync } from "node:crypto";
import net from "node:net";
import { setTimeout as delay } from "node:timers/promises";
if (!process.env.CMS_BROWSER_MODULE)
  throw new Error("Set CMS_BROWSER_MODULE to a Playwright module path.");
const { chromium } = await import(process.env.CMS_BROWSER_MODULE);
const dataDir = await mkdtemp(path.join(tmpdir(), "kivanc-video-test-"));
let server,
  browser,
  output = "",
  checks = 0;
const pass = (message) => {
  checks++;
  console.log("PASS " + message);
};
try {
  const fixtures = {};
  for (const [extension, codec] of [
    ["mp4", "libx264"],
    ["webm", "libvpx-vp9"],
  ]) {
    const file = path.join(dataDir, "pattern." + extension);
    const result = spawnSync(
      "ffmpeg",
      [
        "-v",
        "error",
        "-f",
        "lavfi",
        "-i",
        "testsrc2=size=320x180:rate=12",
        "-t",
        "3",
        "-an",
        "-c:v",
        codec,
        ...(extension === "mp4"
          ? ["-pix_fmt", "yuv420p", "-movflags", "+faststart"]
          : []),
        file,
      ],
      { encoding: "utf8" },
    );
    assert.equal(
      result.status,
      0,
      result.stderr || "ffmpeg is required for test fixtures",
    );
    fixtures[extension] = await readFile(file);
  }
  const username = "video-test",
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
  const listener = net.createServer();
  await new Promise((resolve) => listener.listen(0, "127.0.0.1", resolve));
  const port = listener.address().port;
  await new Promise((resolve) => listener.close(resolve));
  const origin = "http://localhost:" + port;
  server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "-p", String(port)],
    {
      env: {
        ...process.env,
        NODE_OPTIONS: translationFixtureOptions,
        CMS_DATA_DIR: dataDir,
        SITE_ORIGIN: origin,
        VERCEL: "",
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
    if (i === 79) throw new Error("Server did not start");
    await delay(100);
  }
  const login = await fetch(origin + "/api/admin/auth", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie").split(";")[0];
  async function api(url, body) {
    return fetch(origin + url, {
      method: body ? "POST" : "GET",
      headers: {
        Cookie: cookie,
        Origin: origin,
        ...(body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
      },
      body: body
        ? body instanceof FormData
          ? body
          : JSON.stringify(body)
        : undefined,
    });
  }
  async function publish(change) {
    const state = await (await api("/api/admin/content")).json();
    change(state.draft);
    const res = await publishWithTranslations(
      (target, data) => api(target, data),
      {
        action: "publish",
        version: state.version,
        content: state.draft,
      },
    );
    assert.equal(res.status, 200, await res.text());
  }
  const urls = {};
  for (const ext of ["mp4", "webm"]) {
    const body = new FormData();
    body.set(
      "file",
      new Blob([fixtures[ext]], { type: "video/" + ext }),
      "pattern." + ext,
    );
    const res = await api("/api/admin/media", body);
    assert.equal(res.status, 200, await res.clone().text());
    urls[ext] = (await res.json()).url;
    const served = await fetch(origin + urls[ext]);
    assert.equal(served.headers.get("content-type"), "video/" + ext);
    assert.deepEqual(Buffer.from(await served.arrayBuffer()), fixtures[ext]);
  }
  pass(
    "MP4 and WebM uploads retain bytes, correct MIME and durable public URLs",
  );
  for (const [range, from, to] of [
    ["bytes=0-511", 0, 512],
    ["bytes=512-", 512, fixtures.mp4.length],
    ["bytes=-32", fixtures.mp4.length - 32, fixtures.mp4.length],
    ["bytes=0-999999999", 0, fixtures.mp4.length],
  ]) {
    const res = await fetch(origin + urls.mp4, { headers: { Range: range } });
    assert.equal(res.status, 206, range);
    assert.equal(
      res.headers.get("content-range"),
      `bytes ${from}-${to - 1}/${fixtures.mp4.length}`,
    );
    assert.equal(res.headers.get("content-length"), String(to - from));
    assert.deepEqual(
      Buffer.from(await res.arrayBuffer()),
      fixtures.mp4.subarray(from, to),
    );
  }
  for (const range of [
    "bytes=999999999-",
    "bytes=9-1",
    "bytes=-0",
    "bytes=0-1,3-4",
    "bytes=-",
    "nonsense",
  ]) {
    const res = await fetch(origin + urls.mp4, { headers: { Range: range } });
    assert.equal(res.status, 416, range);
    assert.equal(
      res.headers.get("content-range"),
      "bytes */" + fixtures.mp4.length,
    );
  }
  const head = await fetch(origin + urls.mp4, {
    method: "HEAD",
    headers: { Range: "bytes=0-1" },
  });
  assert.equal(head.status, 200);
  assert.equal(head.headers.get("content-length"), String(fixtures.mp4.length));
  assert.equal((await head.arrayBuffer()).byteLength, 0);
  pass(
    "Video byte ranges, suffixes, invalid ranges and HEAD work for seeking and mobile playback",
  );
  const fake = new FormData();
  fake.set(
    "file",
    new Blob([Buffer.from("1a45dfa3", "hex"), "matroska"], {
      type: "video/webm",
    }),
    "fake.webm",
  );
  assert.equal((await api("/api/admin/media", fake)).status, 400);
  const state = await (await api("/api/admin/content")).json();
  for (const url of [
    "javascript:alert(1)",
    "https://youtube.com/watch?v=test",
    "//external.test/clip.mp4",
    "/docs/catalog.pdf",
  ]) {
    const bad = structuredClone(state.draft);
    bad["components-Hero"].heroVideo = url;
    assert.equal(
      (
        await api("/api/admin/content", {
          action: "save",
          version: state.version,
          content: bad,
        })
      ).status,
      400,
      url,
    );
  }
  pass("Spoofed containers and unsafe or non-video banner links are rejected");
  const legacy = structuredClone(state.draft);
  for (const key of ["heroVideo", "videoPlayLabel", "videoPauseLabel"])
    delete legacy["components-Hero"][key];
  for (const story of legacy["components-Hero"].extraStories)
    delete story.video;
  assert.equal(
    (
      await api("/api/admin/content", {
        action: "save",
        version: state.version,
        content: legacy,
      })
    ).status,
    200,
  );
  pass("Older saved content without video fields remains editable and valid");
  browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(origin);
  assert.equal(await page.locator(".kg-hero-video").count(), 0);
  pass("No configured video preserves the existing home banner");
  await page.goto(origin + "/admin");
  await page.getByLabel("Kullanıcı adı", { exact: true }).fill(username);
  await page.getByLabel("Parola", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Güvenli giriş →" }).click();
  await page.getByRole("heading", { name: "Hoş geldiniz." }).waitFor();
  await page.getByRole("button", { name: "Ana sayfayı düzenle →" }).click();
  const videoEditor = page
    .locator(".adm-page-media-grid .adm-media-field")
    .filter({
      hasText:
        "Ana sayfa · Karşılama / Karşılama videosu (MP4 / WebM, isteğe bağlı)",
    });
  const field = videoEditor.locator(".adm-url-details input");
  await videoEditor
    .getByRole("button", { name: "Kütüphaneden seç", exact: true })
    .click();
  await page
    .locator('.adm-modal .adm-upload input[type="file"]')
    .setInputFiles({
      name: "banner.mp4",
      mimeType: "video/mp4",
      buffer: fixtures.mp4,
    });
  await page
    .getByRole("status")
    .filter({ hasText: "Dosya yüklendi." })
    .waitFor();
  await page
    .locator(".adm-modal .adm-media-card")
    .filter({ hasText: "MP4" })
    .first()
    .click();
  assert.match(await field.inputValue(), /\.mp4$/);
  assert.equal(await page.locator(".adm-video-preview").count(), 1);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Yayınla →", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "yayınlandı" }).waitFor();
  await publish((content) => {
    content["components-Hero"].extraStories[0].video = urls.webm;
  });
  pass(
    "Administrator uploads, selects, previews and publishes a video through the panel",
  );
  async function playing(p) {
    await p.waitForFunction(() => {
      const v = document.querySelector(".kg-hero-video");
      return (
        v &&
        !v.paused &&
        v.currentTime > 0.05 &&
        getComputedStyle(v).opacity === "1"
      );
    });
  }
  await page.goto(origin);
  await playing(page);
  if (process.env.VIDEO_TEST_SCREENSHOT)
    await page.screenshot({
      path: process.env.VIDEO_TEST_SCREENSHOT + "-desktop.png",
    });
  assert(
    await page
      .locator(".kg-hero-video")
      .evaluate((v) => v.muted && v.loop && v.playsInline),
  );
  await page.getByRole("button", { name: "Banner videosunu durdur" }).click();
  await page.waitForFunction(
    () => document.querySelector(".kg-hero-video").paused,
  );
  const time = await page
    .locator(".kg-hero-video")
    .evaluate((v) => v.currentTime);
  await delay(300);
  assert(
    Math.abs(
      (await page.locator(".kg-hero-video").evaluate((v) => v.currentTime)) -
        time,
    ) < 0.05,
  );
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
  await delay(200);
  await page.evaluate(() => scrollTo(0, 0));
  await delay(200);
  assert(await page.locator(".kg-hero-video").evaluate((v) => v.paused));
  await page.getByRole("button", { name: "Banner videosunu oynat" }).click();
  await playing(page);
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
  await page.waitForFunction(
    () => document.querySelector(".kg-hero-video").paused,
  );
  await page.evaluate(() => scrollTo(0, 0));
  await playing(page);
  pass(
    "Muted looping footage fades in, can be paused, and stops off screen without losing an explicit pause",
  );
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      value: true,
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForFunction(
    () => document.querySelector(".kg-hero-video").paused,
  );
  await page.evaluate(() => {
    delete document.hidden;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await playing(page);
  pass("Document visibility changes suspend and restore playback");
  await page
    .locator(".kg-hero")
    .getByRole("tab", { name: "02 Mühendislik" })
    .click();
  await playing(page);
  assert.match(
    await page.locator(".kg-hero-video").getAttribute("src"),
    /\.webm$/,
  );
  await page
    .locator(".kg-hero")
    .getByRole("tab", { name: "03 Madencilik" })
    .click();
  assert.equal(await page.locator(".kg-hero-video").count(), 0);
  assert(await page.locator(".kg-hero-image").isVisible());
  pass(
    "Each activity has its own video, with a poster-only story when no video is set",
  );
  for (const mode of ["reduce", "save-data"]) {
    const restricted = await browser.newContext({
      reducedMotion: mode === "reduce" ? "reduce" : "no-preference",
    });
    if (mode === "save-data")
      await restricted.addInitScript(() =>
        Object.defineProperty(navigator, "connection", {
          value: {
            saveData: true,
            addEventListener() {},
            removeEventListener() {},
          },
          configurable: true,
        }),
      );
    const p = await restricted.newPage(),
      requests = [];
    p.on("request", (r) => {
      if (/\.(mp4|webm)(?:[?#]|$)/i.test(r.url())) requests.push(r.url());
    });
    await p.goto(origin);
    await p.getByRole("button", { name: "Banner videosunu oynat" }).waitFor();
    await delay(500);
    assert.equal(await p.locator(".kg-hero-video").getAttribute("src"), null);
    assert.deepEqual(requests, []);
    await p.getByRole("button", { name: "Banner videosunu oynat" }).click();
    await playing(p);
    await restricted.close();
  }
  pass(
    "Reduced motion and data saver prevent video requests until the visitor explicitly plays",
  );
  const blocked = await browser.newContext();
  await blocked.addInitScript(() => {
    const original = HTMLMediaElement.prototype.play;
    let first = true;
    HTMLMediaElement.prototype.play = function () {
      if (first) {
        first = false;
        return Promise.reject(
          new DOMException("Autoplay blocked", "NotAllowedError"),
        );
      }
      return original.call(this);
    };
  });
  const blockedPage = await blocked.newPage();
  await blockedPage.goto(origin);
  await blockedPage.waitForFunction(
    () => !!document.querySelector(".kg-hero-video")?.getAttribute("src"),
  );
  await delay(250);
  assert.equal(await blockedPage.locator(".kg-hero-video.is-ready").count(), 0);
  await blockedPage
    .getByRole("button", { name: "Banner videosunu oynat" })
    .click();
  await playing(blockedPage);
  await blocked.close();
  pass("Blocked autoplay leaves the poster visible and explicit play recovers");
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobile.newPage();
  await mobilePage.goto(origin);
  await playing(mobilePage);
  if (process.env.VIDEO_TEST_SCREENSHOT)
    await mobilePage.screenshot({
      path: process.env.VIDEO_TEST_SCREENSHOT + "-mobile.png",
    });
  assert(
    await mobilePage.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  const box = await mobilePage
    .getByRole("button", { name: "Banner videosunu durdur" })
    .boundingBox();
  assert(
    box.width >= 44 &&
      box.height >= 44 &&
      box.x >= 0 &&
      box.x + box.width <= 390,
  );
  await mobilePage
    .getByRole("button", { name: "Banner videosunu durdur" })
    .tap();
  assert(await mobilePage.locator(".kg-hero-video").evaluate((v) => v.paused));
  await mobile.close();
  pass(
    "Mobile video plays inline, touch controls are reachable and the layout has no horizontal overflow",
  );
  await publish((content) => {
    content["components-Hero"].heroVideo =
      "/media/00000000-0000-0000-0000-000000000000.mp4";
  });
  await page.goto(origin);
  await page.waitForFunction(
    () => !!document.querySelector(".kg-hero-video")?.error,
  );
  assert.equal(
    await page
      .locator(".kg-hero-video.is-ready, .kg-hero-video-control")
      .count(),
    0,
  );
  assert(await page.locator(".kg-hero-image").isVisible());
  assert.deepEqual(errors, []);
  pass(
    "Missing video falls back to the banner image without JavaScript errors",
  );
  console.log(
    `\n${checks} video checks passed. Temporary clips and account removed.`,
  );
} catch (error) {
  console.error(output.slice(-3000));
  throw error;
} finally {
  await browser?.close();
  if (server) {
    server.kill("SIGTERM");
    await new Promise((resolve) => {
      server.once("exit", resolve);
      setTimeout(resolve, 3000).unref();
    });
  }
  await rm(dataDir, { recursive: true, force: true });
}
