import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";
import {
  mkdtemp,
  mkdir,
  writeFile,
  rm,
  readFile,
  stat,
  readdir,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { randomBytes, scryptSync } from "node:crypto";
import net from "node:net";
import { setTimeout as delay } from "node:timers/promises";

function pngFrame(red, green, blue) {
  const crc = (bytes) => {
    let c = 0xffffffff;
    for (const byte of bytes) {
      c ^= byte;
      for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (name, data) => {
    const type = Buffer.from(name),
      length = Buffer.alloc(4),
      sum = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    sum.writeUInt32BE(crc(Buffer.concat([type, data])));
    return Buffer.concat([length, type, data, sum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(12, 0);
  header.writeUInt32BE(12, 4);
  header[8] = 8;
  header[9] = 2;
  const raw = Buffer.alloc(12 * (1 + 12 * 3));
  for (let y = 0; y < 12; y++)
    for (let x = 0; x < 12; x++) {
      const i = y * 37 + 1 + x * 3;
      raw[i] = red;
      raw[i + 1] = green;
      raw[i + 2] = blue;
    }
  return Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
const dataDir = await mkdtemp(path.join(tmpdir(), "kivanc-cms-test-"));
let password = randomBytes(24).toString("hex");
const username = "test-admin",
  salt = randomBytes(24).toString("hex");
await writeFile(
  path.join(dataDir, "admin.json"),
  JSON.stringify({
    username,
    salt,
    hash: scryptSync(password, salt, 64).toString("hex"),
    secret: randomBytes(48).toString("hex"),
    mustChangePassword: true,
  }),
  { mode: 0o600 },
);
const listener = net.createServer();
await new Promise((resolve) => listener.listen(0, "127.0.0.1", resolve));
const port = listener.address().port;
await new Promise((resolve) => listener.close(resolve));
const origin = "http://localhost:" + port;
let output = "";
const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "-p", String(port)],
  {
    env: {
      ...process.env,
      CMS_DATA_DIR: dataDir,
      SITE_ORIGIN: origin,
      VERCEL: "",
      SUPABASE_URL: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      RESEND_API_KEY: "",
      CONTACT_FROM: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
server.stdout.on("data", (b) => (output += b));
server.stderr.on("data", (b) => (output += b));
let checks = 0;
function ok(message) {
  checks++;
  console.log("PASS " + message);
}
let cookie = "";
async function request(
  url,
  {
    body,
    method = "GET",
    authenticated = true,
    originHeader = origin,
    ip,
  } = {},
) {
  const headers = {};
  if (ip) headers["X-Forwarded-For"] = ip;
  if (authenticated && cookie) headers.Cookie = cookie;
  if (method !== "GET") {
    headers.Origin = originHeader;
    if (!(body instanceof FormData))
      headers["Content-Type"] = "application/json";
  }
  return fetch(origin + url, {
    method,
    headers,
    body:
      body === undefined
        ? undefined
        : body instanceof FormData
          ? body
          : JSON.stringify(body),
  });
}
async function json(url, options) {
  const res = await request(url, options);
  const data = await res.json();
  return { res, data };
}
try {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(origin + "/api/admin/auth");
      if (r.ok) break;
    } catch {}
    if (i === 79) throw new Error("Server did not start: " + output);
    await delay(250);
  }
  for (const name of await readdir(".next/server", { recursive: true })) {
    if (!name.endsWith(".nft.json")) continue;
    const trace = JSON.parse(
      await readFile(path.join(".next/server", name), "utf8"),
    );
    assert(
      !trace.files.some((file) =>
        ("/" + file.replaceAll("\\", "/")).includes("/.cms/"),
      ),
      name + " must not bundle private CMS files",
    );
  }
  ok("deployment traces exclude private accounts, drafts and uploads");
  assert.equal((await request("/api/admin/content")).status, 401);
  assert.equal((await request("/api/admin/media")).status, 401);
  ok("unauthenticated content and media access rejected");
  let r = await request("/api/admin/auth", {
    method: "POST",
    body: { username, password },
    originHeader: "https://untrusted.example",
  });
  assert.equal(r.status, 403);
  ok("cross-origin login rejected");
  r = await request("/api/admin/auth", {
    method: "POST",
    body: { username, password: "wrong" },
  });
  assert.equal(r.status, 401);
  ok("wrong password rejected");
  r = await request("/api/admin/auth", {
    method: "POST",
    body: { username, password },
  });
  assert.equal(r.status, 200);
  const setCookie = r.headers.get("set-cookie");
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /Secure/i);
  assert.match(setCookie, /SameSite=strict/i);
  cookie = setCookie.split(";")[0];
  ok("password login and protected cookie");
  let authInfo = await json("/api/admin/auth");
  assert.equal(authInfo.data.passwordChangeRequired, true);
  assert.equal(authInfo.data.username, username);
  assert.equal((await request("/api/admin/content")).status, 401);
  assert.equal((await request("/api/admin/media")).status, 401);
  assert.equal(
    (
      await request("/api/admin/content", {
        method: "POST",
        body: { action: "preview", enabled: true },
      })
    ).status,
    403,
  );
  ok(
    "temporary account requires a password change before content, media and preview access",
  );
  const previousCookie = cookie;
  const oldPassword = password;
  const newPassword = randomBytes(24).toString("hex");
  const passwordBody = { currentPassword: password, newPassword };
  assert.equal(
    (
      await request("/api/admin/auth", {
        method: "PATCH",
        body: passwordBody,
        authenticated: false,
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await request("/api/admin/auth", {
        method: "PATCH",
        body: passwordBody,
        originHeader: "https://untrusted.example",
      })
    ).status,
    403,
  );
  for (const invalid of [
    null,
    {},
    { ...passwordBody, newPassword: "short" },
    { ...passwordBody, newPassword: "x".repeat(257) },
    { ...passwordBody, newPassword: password },
    { ...passwordBody, currentPassword: "wrong" },
  ]) {
    assert.equal(
      (await request("/api/admin/auth", { method: "PATCH", body: invalid }))
        .status,
      400,
    );
  }
  ok(
    "password changes reject missing sessions, foreign origins, invalid lengths, reused and incorrect passwords",
  );
  r = await request("/api/admin/auth", { method: "PATCH", body: passwordBody });
  assert.equal(r.status, 200);
  cookie = r.headers.get("set-cookie").split(";")[0];
  password = newPassword;
  assert.equal(
    (
      await fetch(origin + "/api/admin/content", {
        headers: { Cookie: previousCookie },
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await request("/api/admin/auth", {
        method: "POST",
        body: { username, password: oldPassword },
      })
    ).status,
    401,
  );
  authInfo = await json("/api/admin/auth");
  assert.equal(authInfo.data.authenticated, true);
  assert.equal(authInfo.data.passwordChangeRequired, false);
  const accountOnDisk = await readFile(
    path.join(dataDir, "admin.json"),
    "utf8",
  );
  assert(!accountOnDisk.includes(password));
  assert.equal(
    (await stat(path.join(dataDir, "admin.json"))).mode & 0o777,
    0o600,
  );
  assert.equal(
    (
      await fetch(origin + "/api/admin/content", {
        headers: { Cookie: cookie + ".extra" },
      })
    ).status,
    401,
  );
  ok(
    "password changes persist only a private hash, invalidate previous sessions and reject malformed session tokens",
  );
  for (const invalid of [null, 42, "text", [], {}]) {
    r = await request("/api/mesaj", {
      method: "POST",
      body: invalid,
      authenticated: false,
      ip: "192.0.2.200",
    });
    assert.equal(r.status, 400);
    assert.equal(typeof (await r.json()).error, "string");
  }
  assert.equal(
    (
      await request("/api/mesaj", {
        method: "POST",
        body: { message: "x".repeat(64_001) },
        authenticated: false,
        ip: "192.0.2.201",
      })
    ).status,
    413,
  );
  assert.equal(
    (
      await request("/api/mesaj", {
        method: "POST",
        body: {
          kind: "quote",
          name: "Test",
          email: "test@example.com",
          items: [],
        },
        authenticated: false,
        ip: "192.0.2.202",
      })
    ).status,
    400,
  );
  ok(
    "contact and quote endpoints handle malformed JSON values, empty quotes and oversized input without server errors",
  );
  const inquiryBody = {
    kind: "inquiry",
    name: "Talep Testi",
    company: "Test Firma",
    email: "request@example.com",
    phone: "+90 555 000 00 00",
    message: "Teknik bilgi ve teklif istiyorum.",
    consent: true,
  };
  assert.equal(
    (await request("/api/admin/inquiries", { authenticated: false })).status,
    401,
  );
  assert.equal(
    (
      await request("/api/mesaj", {
        method: "POST",
        body: { ...inquiryBody, consent: false },
        authenticated: false,
        ip: "192.0.2.210",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request("/api/mesaj", {
        method: "POST",
        body: inquiryBody,
        authenticated: false,
        ip: "192.0.2.211",
      })
    ).status,
    200,
  );
  let inbox = await json("/api/admin/inquiries");
  assert.equal(inbox.data.total, 1);
  assert.equal(inbox.data.items[0].name, "Talep Testi");
  assert.equal(inbox.data.items[0].delivery, "not_configured");
  const inquiryId = inbox.data.items[0].id;
  assert.equal(
    (
      await request("/api/admin/inquiries", {
        method: "PATCH",
        body: { id: inquiryId, read: true },
        originHeader: "https://untrusted.example",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request("/api/admin/inquiries", {
        method: "PATCH",
        body: { id: inquiryId, read: true },
      })
    ).status,
    200,
  );
  assert.equal((await json("/api/admin/inquiries")).data.unread, 0);
  assert.equal(
    (
      await request("/api/admin/inquiries", {
        method: "DELETE",
        body: { id: inquiryId },
      })
    ).status,
    200,
  );
  assert.equal((await json("/api/admin/inquiries")).data.total, 0);
  ok(
    "inquiry forms persist without email configuration; private inbox supports CSRF-protected read and delete actions",
  );
  let { data: state } = await json("/api/admin/content");
  assert.equal(state.version, 0);
  let content = structuredClone(state.draft);
  const heroOriginal = content["components-Hero"].metin02;
  content["components-Hero"].metin02 = "Yönetim paneli test başlığı";
  let result = await json("/api/admin/content", {
    method: "POST",
    body: { action: "save", version: state.version, content },
  });
  assert.equal(result.res.status, 200, JSON.stringify(result.data));
  state = result.data;
  ok("entire default schema and draft save validated");
  let html = await (await request("/", { authenticated: false })).text();
  assert(html.includes(heroOriginal));
  assert(!html.includes("Yönetim paneli test başlığı"));
  ok("draft changes hidden from visitors");
  r = await request("/api/admin/content", {
    method: "POST",
    body: { action: "preview", enabled: true },
  });
  assert.equal(r.status, 200);
  const previewCookie =
    cookie + "; " + r.headers.get("set-cookie").split(";")[0];
  html = await (
    await fetch(origin + "/", { headers: { Cookie: previewCookie } })
  ).text();
  assert(html.includes("Yönetim paneli test başlığı"));
  assert(html.includes("TASLAK ÖNİZLEMESİ"));
  ok("authenticated draft preview renders unpublished server content");
  html = await (
    await fetch(origin + "/", { headers: { Cookie: "cms_preview=1" } })
  ).text();
  assert(!html.includes("Yönetim paneli test başlığı"));
  ok("preview cookie alone cannot reveal draft");
  r = await request("/api/admin/content", {
    method: "POST",
    body: { action: "save", version: 0, content },
  });
  assert.equal(r.status, 409);
  ok("stale-version writes rejected");
  const bad = structuredClone(content);
  bad["components-Header"].metin02 = "javascript:alert(1)";
  r = await request("/api/admin/content", {
    method: "POST",
    body: { action: "save", version: state.version, content: bad },
  });
  assert.equal(r.status, 400);
  ok("unsafe content URLs rejected");
  const invalid = structuredClone(content);
  invalid["data-news"].news[0].date = "not-a-date";
  r = await request("/api/admin/content", {
    method: "POST",
    body: { action: "save", version: state.version, content: invalid },
  });
  assert.equal(r.status, 400);
  ok("invalid dates rejected");
  content["data-divisions"].divisions[0].groups[0].items.push({
    name: "Yeni Panel Ürünü",
    slug: "yeni-panel-urunu",
  });
  content["data-details"].details["yeni-panel-urunu"] = {
    description: ["Panelden eklenen ürün açıklaması."],
    features: ["Yönetilebilir özellik"],
    images: [],
    documents: [],
  };
  content.customPages.pages.push({
    slug: "yeni-ozel-sayfa",
    title: "Yeni özel sayfa",
    intro: "Panelden oluşturuldu",
    seoTitle: "Özel SEO",
    seoDescription: "SEO açıklaması",
    visible: true,
    blocks: [
      {
        title: "Sayfa bölümü",
        text: "Yeni blok içeriği",
        image: "",
        alt: "",
        buttonLabel: "İletişim",
        buttonHref: "/iletisim",
      },
    ],
  });
  const image = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8v8AAAAASUVORK5CYII=",
    "base64",
  );
  let form = new FormData();
  form.set("file", new Blob([image], { type: "image/png" }), "pixel.png");
  let uploaded = await json("/api/admin/media", { method: "POST", body: form });
  assert.equal(uploaded.res.status, 200, JSON.stringify(uploaded.data));
  const imageUrl = uploaded.data.url;
  assert.deepEqual(
    Buffer.from(
      await (await request(imageUrl, { authenticated: false })).arrayBuffer(),
    ),
    image,
  );
  ok("image upload, magic bytes, durable storage and public serving");
  form = new FormData();
  form.set(
    "file",
    new Blob(['<svg onload="alert(1)"/>'], { type: "image/svg+xml" }),
    "unsafe.svg",
  );
  r = await request("/api/admin/media", { method: "POST", body: form });
  assert.equal(r.status, 400);
  ok("active SVG upload rejected");
  content["data-details"].details["yeni-panel-urunu"].images = [
    { src: imageUrl, alt: "Yeni ürün görseli" },
  ];
  const spinImages = [];
  for (const color of [
    [240, 80, 30],
    [30, 160, 90],
    [40, 100, 220],
    [220, 180, 30],
  ]) {
    const body = new FormData();
    body.set(
      "file",
      new Blob([pngFrame(...color)], { type: "image/png" }),
      "frame.png",
    );
    const uploaded = await json("/api/admin/media", { method: "POST", body });
    assert.equal(uploaded.res.status, 200);
    spinImages.push(uploaded.data.url);
  }
  content["data-details"].details["yeni-panel-urunu"].variants = [
    {
      id: "ceket",
      label: "Ceket",
      description: "Ceket parçası",
      images: [{ src: imageUrl, alt: "Yeni ürün görseli" }],
      spin: { alt: "Ceket 360", frames: spinImages },
    },
    {
      id: "pantolon",
      label: "Pantolon",
      description: "Pantolon parçası",
      images: [{ src: imageUrl, alt: "Pantolon fotoğrafı" }],
      spin: { alt: "Pantolon 360", frames: [...spinImages].reverse() },
    },
  ];
  const testDetail = content["data-details"].details["yeni-panel-urunu"];
  testDetail.line = "Kıvanç Koruyucu Seri";
  testDetail.configurations = [
    {
      id: "a",
      composition: "Bileşim A",
      outerLayer: "Dış A",
      sizes: "S–XL",
      compositionCode: "A1",
      articleNumber: "100",
    },
    {
      id: "b",
      composition: "Bileşim A",
      outerLayer: "Dış B",
      sizes: "M–XXL",
      compositionCode: "A2",
      articleNumber: "101",
    },
    {
      id: "c",
      composition: "Bileşim B",
      outerLayer: "Dış C",
      sizes: "L–3XL",
      compositionCode: "B1",
      articleNumber: "102",
    },
  ];
  testDetail.variants[0].colors = [
    {
      id: "gold",
      label: "Lacivert / Altın",
      swatch: "#bd9a48",
      images: [{ src: imageUrl, alt: "Yeni ürün görseli" }],
      spin: { alt: "Ceket 360", frames: spinImages },
    },
    {
      id: "red",
      label: "Lacivert / Kırmızı",
      swatch: "#bd3535",
      images: [{ src: imageUrl, alt: "Kırmızı ceket fotoğrafı" }],
      spin: {
        alt: "Kırmızı ceket 360",
        frames: [spinImages[1], spinImages[2], spinImages[3], spinImages[0]],
      },
    },
  ];
  const invalidColor = structuredClone(content);
  invalidColor["data-details"].details[
    "yeni-panel-urunu"
  ].variants[0].colors[0].swatch = "invalid";
  r = await request("/api/admin/content", {
    method: "POST",
    body: { action: "save", version: state.version, content: invalidColor },
  });
  assert.equal(r.status, 400);
  ok("nested color configuration validates before saving");
  const brokenSpin = structuredClone(content);
  brokenSpin["data-details"].details[
    "yeni-panel-urunu"
  ].variants[0].spin.frames = [imageUrl];
  r = await request("/api/admin/content", {
    method: "POST",
    body: { action: "save", version: state.version, content: brokenSpin },
  });
  assert.equal(r.status, 400);
  ok("single-frame variant rejected as invalid 360 content");
  for (const angles of [
    [0, 90],
    [0, 90, 180, 360],
    [0, 90, 90, 270],
  ]) {
    const invalidAngles = structuredClone(content);
    invalidAngles["data-details"].details[
      "yeni-panel-urunu"
    ].variants[0].colors[0].spin.angles = angles;
    const response = await request("/api/admin/content", {
      method: "POST",
      body: { action: "save", version: state.version, content: invalidAngles },
    });
    assert.equal(response.status, 400);
  }
  testDetail.variants[0].colors[0].spin.angles = [0, 45, 180, 270];
  ok("explicit frame angles reject missing, duplicate and out-of-range values");
  result = await json("/api/admin/content", {
    method: "POST",
    body: { action: "publish", version: state.version, content },
  });
  assert.equal(result.res.status, 200, JSON.stringify(result.data));
  state = result.data;
  html = await (await request("/", { authenticated: false })).text();
  assert(html.includes("Yönetim paneli test başlığı"));
  ok("published content renders immediately without a rebuild");
  r = await request("/is-guvenligi/yeni-panel-urunu", { authenticated: false });
  assert.equal(r.status, 200);
  html = await r.text();
  assert(html.includes("Panelden eklenen ürün açıklaması."));
  assert(html.includes("Yeni ürün görseli"));
  ok("new product route, text and uploaded image work without rebuild");
  html = await (
    await request("/arama?q=Yeni%20Panel", { authenticated: false })
  ).text();
  assert(html.includes("Yeni Panel Ürünü"));
  html = await (await request("/sitemap.xml", { authenticated: false })).text();
  assert(html.includes("/is-guvenligi/yeni-panel-urunu"));
  ok("search and sitemap include new product");
  html = await (
    await request("/yeni-ozel-sayfa", { authenticated: false })
  ).text();
  assert(html.includes("Yeni blok içeriği"));
  assert(html.includes("Özel SEO"));
  ok("custom page creation, SEO and content render without rebuild");
  r = await request("/api/admin/content", {
    method: "POST",
    body: {
      action: "restore",
      version: state.version,
      id: state.history[0].id,
    },
  });
  assert.equal(r.status, 200);
  state = await r.json();
  assert.equal(state.draft["components-Hero"].metin02, heroOriginal);
  assert.equal(
    state.published["components-Hero"].metin02,
    "Yönetim paneli test başlığı",
  );
  ok("revision restored to draft without changing published site");
  const disk = JSON.parse(
    await readFile(path.join(dataDir, "content.json"), "utf8"),
  );
  assert.equal(disk.version, state.version);
  ok("content persists to disk");
  for (const url of [
    "/admin",
    "/kurumsal",
    "/tarihce",
    "/ar-ge",
    "/haberler",
    "/mevzuat",
    "/dokumanlar",
    "/satis-kanallari",
    "/kariyer",
    "/iletisim",
    "/gizlilik-ve-guvenlik",
    "/teklif-sepeti",
    "/muhendislik",
    "/madencilik",
  ]) {
    assert.equal(
      (await request(url, { authenticated: false })).status,
      200,
      url,
    );
  }
  ok("all existing public page routes and admin respond");
  for (const route of [
    "/dokumanlar",
    "/mevzuat",
    "/is-guvenligi/itfaiyeci-elbisesi",
  ]) {
    const response = await request(route, { authenticated: false });
    const markup = await response.text();
    const bundledLinks = [
      ...markup.matchAll(/<a\b[^>]*href="(\/docs\/[^"?#]+)"/g),
    ].map((match) => match[1]);
    assert(
      bundledLinks.length > 0,
      route + ": copied documents are downloadable",
    );
    for (const href of bundledLinks) {
      assert(
        (
          await stat(
            path.join(process.cwd(), "public", decodeURIComponent(href)),
          )
        ).isFile(),
        href,
      );
    }
  }
  const missingDocument = structuredClone(state.published);
  missingDocument["data-documents"].brochures[0].href =
    "/docs/absent-test-document.pdf";
  result = await json("/api/admin/content", {
    method: "POST",
    body: {
      action: "publish",
      version: state.version,
      content: missingDocument,
    },
  });
  assert.equal(result.res.status, 200, JSON.stringify(result.data));
  state = result.data;
  const missingMarkup = await (
    await request("/dokumanlar", { authenticated: false })
  ).text();
  assert(missingMarkup.includes("Belge hazırlanıyor"));
  assert(
    !/<a\b[^>]*href="\/docs\/absent-test-document.pdf"/.test(missingMarkup),
  );
  const brochureContent = structuredClone(state.published);
  const pdfBody = new FormData();
  pdfBody.set(
    "file",
    new File(["%PDF-1.4\n%%EOF"], "test.pdf", { type: "application/pdf" }),
  );
  const pdfUpload = await json("/api/admin/media", {
    method: "POST",
    body: pdfBody,
  });
  assert.equal(pdfUpload.res.status, 200);
  brochureContent["data-documents"].brochures[0].href = pdfUpload.data.url;
  result = await json("/api/admin/content", {
    method: "POST",
    body: {
      action: "publish",
      version: state.version,
      content: brochureContent,
    },
  });
  assert.equal(result.res.status, 200, JSON.stringify(result.data));
  state = result.data;
  html = await (await request("/dokumanlar", { authenticated: false })).text();
  assert(html.includes('href="' + pdfUpload.data.url + '"'));
  const pdfDownload = await request(pdfUpload.data.url, {
    authenticated: false,
  });
  assert.equal(pdfDownload.status, 200);
  assert.match(pdfDownload.headers.get("content-disposition"), /attachment/);
  ok(
    "missing documents have no broken download links; uploaded PDFs become available immediately",
  );
  if (process.env.CMS_BROWSER_MODULE) {
    const { chromium } = await import(process.env.CMS_BROWSER_MODULE);
    const browser = await chromium.launch({
      executablePath: "/usr/bin/chromium",
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
    try {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
        reducedMotion: "reduce",
        timezoneId: "Europe/Istanbul",
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      const temporaryAccount = JSON.parse(
        await readFile(path.join(dataDir, "admin.json"), "utf8"),
      );
      await writeFile(
        path.join(dataDir, "admin.json"),
        JSON.stringify({ ...temporaryAccount, mustChangePassword: true }),
        { mode: 0o600 },
      );
      await page.goto(origin + "/admin");
      await page.getByLabel("Kullanıcı adı", { exact: true }).fill(username);
      await page.getByLabel("Parola", { exact: true }).fill(password);
      await page.getByRole("button", { name: "Güvenli giriş →" }).click();
      await page
        .getByRole("heading", { name: "Kendi parolanızı belirleyin." })
        .waitFor();
      await page.reload();
      await page
        .getByRole("heading", { name: "Kendi parolanızı belirleyin." })
        .waitFor();
      assert.equal(
        (await page.request.get(origin + "/api/admin/content")).status(),
        401,
      );
      const firstLoginPassword = randomBytes(24).toString("hex");
      await page.getByLabel("Mevcut parola", { exact: true }).fill(password);
      await page
        .getByLabel("Yeni parola", { exact: true })
        .fill(firstLoginPassword);
      await page
        .getByLabel("Yeni parola tekrar", { exact: true })
        .fill("mismatch-password-123");
      await page
        .getByRole("button", { name: "Parolayı değiştir", exact: true })
        .click();
      await page
        .getByRole("alert")
        .filter({ hasText: "Yeni parolalar eşleşmiyor." })
        .waitFor();
      await page
        .getByLabel("Yeni parola tekrar", { exact: true })
        .fill(firstLoginPassword);
      await page
        .getByRole("button", { name: "Parolayı değiştir", exact: true })
        .click();
      password = firstLoginPassword;
      await page.getByRole("heading", { name: "Hoş geldiniz." }).waitFor();
      ok(
        "browser first-login setup survives reload, checks confirmation and opens the panel after password change",
      );
      await page.screenshot({
        path: "/tmp/kivanc-admin-desktop.png",
        fullPage: true,
      });
      await page.getByRole("button", { name: "Ana sayfayı düzenle →" }).click();
      await page
        .getByRole("heading", { name: "Ana sayfa · Karşılama", exact: true })
        .waitFor();
      const field = page.getByLabel("Isıya ve aleve karşı", { exact: true });
      await field.fill("Tarayıcıdan güncellenen başlık");
      await page
        .getByRole("button", { name: "Taslağı kaydet", exact: true })
        .click();
      await page
        .getByRole("status")
        .filter({ hasText: "Taslak kaydedildi." })
        .waitFor();
      await page.getByRole("button", { name: "◉ Taslağı önizle" }).click();
      await page.getByText("TASLAK ÖNİZLEMESİ", { exact: false }).waitFor();
      assert(
        await page
          .getByRole("heading", { level: 1 })
          .textContent()
          .then((t) => t.includes("Tarayıcıdan güncellenen başlık")),
      );
      await page.getByRole("link", { name: "Yönetime dön" }).click();
      await page.getByRole("heading", { name: "Hoş geldiniz." }).waitFor();
      await page
        .getByRole("button", { name: "Ürün detayları ›", exact: false })
        .first()
        .click()
        .catch(async () => {
          await page
            .getByRole("button", { name: "Ürün detayları", exact: true })
            .click();
        });
      await page.screenshot({
        path: "/tmp/kivanc-admin-products.png",
        fullPage: true,
      });
      const spinField = page
        .locator(".adm-optional")
        .filter({ hasText: "360° görüntü" })
        .first();
      await spinField
        .getByRole("button", { name: "+ Alanı ekle", exact: true })
        .click();
      const files = [
        {
          name: "frame-10.png",
          mimeType: "image/png",
          buffer: pngFrame(40, 100, 220),
        },
        {
          name: "frame-2.png",
          mimeType: "image/png",
          buffer: pngFrame(30, 160, 90),
        },
        {
          name: "frame-1.png",
          mimeType: "image/png",
          buffer: pngFrame(240, 80, 30),
        },
      ];
      await page.locator("input[type=file][multiple]").setInputFiles(files);
      await page.getByText("3 kare", { exact: true }).waitFor();
      await page
        .getByRole("button", { name: "Taslağı kaydet", exact: true })
        .click();
      await page
        .getByRole("status")
        .filter({ hasText: "Taslak kaydedildi." })
        .waitFor();
      const browserState = await (
        await page.request.get(origin + "/api/admin/content")
      ).json();
      const uploadedFrames =
        browserState.draft["data-details"].details["itfaiyeci-elbisesi"].spin
          .frames;
      assert.equal(uploadedFrames.length, 3);
      assert.deepEqual(
        Buffer.from(
          await (await fetch(origin + uploadedFrames[0])).arrayBuffer(),
        ),
        pngFrame(240, 80, 30),
      );
      assert.deepEqual(
        Buffer.from(
          await (await fetch(origin + uploadedFrames[2])).arrayBuffer(),
        ),
        pngFrame(40, 100, 220),
      );
      ok(
        "admin bulk frame upload preserves natural filename order and saves real 360 content",
      );
      const visitor = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
        reducedMotion: "reduce",
        hasTouch: true,
      });
      const productPage = await visitor.newPage();
      productPage.on("pageerror", (e) => errors.push(e.message));
      await productPage.goto(origin + "/is-guvenligi/yeni-panel-urunu");
      await productPage.locator(".p360[data-ready=true]").waitFor();
      const stage = productPage.locator(".p360-stage");
      const frame = productPage.locator(".p360-image");
      const first = await frame.getAttribute("src");
      await stage.focus();
      await productPage.keyboard.press("ArrowRight");
      assert.notEqual(await frame.getAttribute("src"), first);
      await productPage.locator(".p360-tools > summary").click();
      await productPage.locator(".p360-controls input").fill("0");
      assert.equal(await frame.getAttribute("src"), first);
      const box = await stage.boundingBox();
      await productPage.mouse.move(
        box.x + box.width * 0.7,
        box.y + box.height * 0.4,
      );
      await productPage.mouse.down();
      await productPage.mouse.move(
        box.x + box.width * 0.4,
        box.y + box.height * 0.4,
        { steps: 8 },
      );
      await productPage.mouse.up();
      assert.notEqual(await frame.getAttribute("src"), first);
      await productPage
        .getByRole("button", { name: "Görüş açısı 0°", exact: true })
        .click();
      assert.equal(await frame.getAttribute("src"), first);
      await productPage
        .getByRole("button", { name: "Görüş açısı 45°", exact: true })
        .click();
      assert.equal(await frame.getAttribute("src"), spinImages[1]);
      await productPage
        .getByRole("button", { name: "Görüş açısı 180°", exact: true })
        .click();
      assert.equal(await frame.getAttribute("src"), spinImages[2]);
      await productPage
        .locator(".product-overview")
        .screenshot({ path: "/tmp/kivanc-product-reference-test.png" });
      await productPage
        .getByLabel("Dış katman", { exact: true })
        .selectOption("b");
      assert(
        (
          await productPage.locator(".product-config-data").textContent()
        ).includes("101"),
      );
      await productPage
        .getByLabel("Malzeme bileşimi", { exact: true })
        .selectOption("Bileşim B");
      assert(
        (
          await productPage.locator(".product-config-data").textContent()
        ).includes("102"),
      );
      assert.equal(
        await productPage
          .getByLabel("Dış katman", { exact: true })
          .inputValue(),
        "c",
      );
      await productPage
        .getByRole("button", { name: "Lacivert / Kırmızı", exact: true })
        .click();
      await productPage.locator(".p360[data-ready=true]").waitFor();
      assert.equal(await frame.getAttribute("src"), spinImages[1]);
      assert.equal(await frame.getAttribute("alt"), "Kırmızı ceket 360");
      await productPage
        .locator(".product-overview")
        .screenshot({ path: "/tmp/kivanc-product-reference-test.png" });
      ok(
        "reference layout: material filters, dependent technical codes, color-specific 360 frames and orbital angle selector",
      );
      await productPage
        .getByRole("tab", { name: "Pantolon", exact: true })
        .click();
      await productPage.locator(".p360[data-ready=true]").waitFor();
      assert.equal(await frame.getAttribute("alt"), "Pantolon 360");
      assert.equal(await frame.getAttribute("src"), spinImages.at(-1));
      await productPage
        .getByRole("button", { name: "Tam ekran incele", exact: true })
        .click();
      await productPage.getByRole("dialog").waitFor();
      await productPage
        .getByRole("button", { name: "Tam ekranı kapat", exact: true })
        .click();
      await productPage
        .getByRole("button", { name: "Teklif sepetine ekle", exact: true })
        .click();
      await productPage.waitForFunction(() =>
        JSON.parse(localStorage.getItem("kivanc-teklif-sepeti") || "[]")
          .some((item) => item.name.startsWith("Yeni Panel Ürünü – Pantolon")),
      );
      await productPage.goto(origin + "/teklif-sepeti");
      await productPage.getByRole("link", {
        name: /^Yeni Panel Ürünü – Pantolon/,
      }).waitFor();
      assert(
        (await productPage.textContent("main")).includes(
          "Yeni Panel Ürünü – Pantolon",
        ),
      );
      await productPage.setViewportSize({ width: 390, height: 844 });
      await productPage.goto(origin + "/is-guvenligi/yeni-panel-urunu");
      await productPage.locator(".p360[data-ready=true]").waitFor();
      const touchStage = productPage.locator(".p360-stage");
      const mobileBefore = await productPage
        .locator(".p360-image")
        .getAttribute("src");
      const touchBox = await touchStage.boundingBox();
      const cdp = await visitor.newCDPSession(productPage);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: touchBox.x + 250, y: touchBox.y + 120 }],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: touchBox.x + 70, y: touchBox.y + 120 }],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      assert.notEqual(
        await productPage.locator(".p360-image").getAttribute("src"),
        mobileBefore,
      );
      assert.equal(
        await productPage.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      ok(
        "jacket/trousers switch, keyboard/mouse/touch rotation, fullscreen and variant-specific quote cart",
      );
      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByRole("button", { name: "Menüyü aç" }).click();
      await page.getByRole("button", { name: /Genel bakış$/ }).click();
      await page.screenshot({
        path: "/tmp/kivanc-admin-mobile.png",
        fullPage: true,
      });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth,
        ),
        false,
        "mobile horizontal overflow",
      );
      assert.deepEqual(errors, []);
      ok(
        "browser login, editor save, real draft preview, product editor and mobile layout without runtime errors",
      );
      await page.getByRole("button", { name: "Menüyü aç" }).click();
      await page
        .getByRole("button", { name: "Hesap ve parola", exact: true })
        .click();
      const changedPassword = randomBytes(24).toString("hex");
      await page.getByLabel("Mevcut parola", { exact: true }).fill(password);
      await page
        .getByLabel("Yeni parola", { exact: true })
        .fill(changedPassword);
      await page
        .getByLabel("Yeni parola tekrar", { exact: true })
        .fill(changedPassword);
      await page
        .getByRole("button", { name: "Parolayı değiştir", exact: true })
        .click();
      await page
        .getByRole("status")
        .filter({ hasText: "Parolanız değiştirildi." })
        .waitFor();
      assert.equal(
        await page.getByLabel("Mevcut parola", { exact: true }).inputValue(),
        "",
      );
      await context.clearCookies();
      await page
        .getByRole("link", { name: "Siteye git →", exact: true })
        .click();
      await page
        .getByRole("alert")
        .filter({ hasText: "Yetkisiz istek." })
        .waitFor();
      assert.deepEqual(errors, []);
      await page.reload();
      await page.getByLabel("Kullanıcı adı", { exact: true }).fill(username);
      await page.getByLabel("Parola", { exact: true }).fill(password);
      await page.getByRole("button", { name: "Güvenli giriş →" }).click();
      await page
        .getByRole("alert")
        .filter({ hasText: "Kullanıcı adı veya parola yanlış." })
        .waitFor();
      await page.getByLabel("Parola", { exact: true }).fill(changedPassword);
      await page.getByRole("button", { name: "Güvenli giriş →" }).click();
      await page.getByRole("heading", { name: "Hoş geldiniz." }).waitFor();
      password = changedPassword;
      ok(
        "mobile account settings change passwords, clear fields, reject the old password and handle expired-session navigation",
      );
      const launchVisitor = await browser.newContext({
        viewport: { width: 390, height: 844 },
        reducedMotion: "reduce",
      });
      const launchPage = await launchVisitor.newPage();
      launchPage.on("pageerror", (e) => errors.push(e.message));
      await launchPage.setViewportSize({ width: 1440, height: 1000 });
      await launchPage.goto(origin + "/is-guvenligi/itfaiyeci-elbisesi", {
        waitUntil: "networkidle",
      });
      assert.equal(await launchPage.locator(".product-family h1").textContent(), "İtfaiyeci Elbisesi");
      assert.equal(await launchPage.locator(".product-quote,.product-mobile-bar,.product-gallery").count(), 0);
      const familyCards = launchPage.locator("#modeller .kg-product-card");
      assert.equal(await familyCards.count(), 18);
      assert.deepEqual((await familyCards.locator("h3").allTextContents()).slice(0, 8), [
        "Maximus 2.0 (832551)", "Optimus 2.0 (832536)", "Stefan III (832507)",
        "Stefan II (832356)", "Primus 2.0 (832548)", "Salvator (832330)",
        "Mare (833115)", "Alexus (832346)",
      ]);
      assert((await familyCards.first().boundingBox()).y < 1000, "Models must start in the first viewport.");
      await familyCards.first().locator(".kg-product-art").click();
      await launchPage.waitForURL("**/maximus-2-0-832551");
      await launchPage.locator(".product-parent-nav a").click();
      await launchPage.waitForURL("**/itfaiyeci-elbisesi");
      await familyCards.nth(1).focus();
      await launchPage.keyboard.press("Enter");
      await launchPage.waitForURL("**/optimus-2-0-832536");
      for (const slug of ["aluminize-elbise", "solunum-seti"]) {
        await launchPage.goto(origin + "/is-guvenligi/" + slug, { waitUntil: "networkidle" });
        assert.equal(await launchPage.locator(".product-family h1").count(), 1);
        const card = launchPage.locator("#modeller .kg-product-card").first();
        const destination = await card.getAttribute("href");
        await card.locator("h3").click();
        await launchPage.waitForURL("**" + destination);
        assert.equal(await launchPage.locator(".product-heading h1").count(), 1);
      }
      await launchPage.setViewportSize({ width: 390, height: 844 });
      await launchPage.goto(origin + "/is-guvenligi/itfaiyeci-elbisesi", { waitUntil: "networkidle" });
      assert.equal(await launchPage.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.equal(await familyCards.first().evaluate(el => getComputedStyle(el.closest("ul")).gridTemplateColumns.split(" ").length), 2);
      await familyCards.first().locator("h3").click();
      await launchPage.waitForURL("**/maximus-2-0-832551");
      ok("product families show ordered clickable model cards; image, title, keyboard, parent return and mobile navigation work without category quote controls");
      await launchPage.goto(origin + "/is-guvenligi/yeni-panel-urunu", {
        waitUntil: "networkidle",
      });
      assert(
        await launchPage
          .locator(".product-heading")
          .evaluate(
            (el) =>
              el.getBoundingClientRect().top <
              document.querySelector(".product-gallery").getBoundingClientRect()
                .top,
          ),
      );
      await launchPage
        .locator(".product-mobile-bar")
        .getByRole("link", { name: "Teklif iste", exact: true })
        .click();
      await launchPage.waitForURL("**/teklif-al?*");
      assert(
        (
          await launchPage.locator('textarea[name="message"]').inputValue()
        ).includes("Yeni Panel Ürünü"),
      );
      await launchPage.locator('input[name="name"]').fill("Tarayıcı talebi");
      await launchPage
        .locator('input[name="email"]')
        .fill("browser@example.com");
      await launchPage.locator('input[name="consent"]').check();
      await launchPage
        .getByRole("button", { name: "Teklif talebini ilet", exact: true })
        .click();
      await launchPage
        .getByRole("heading", { name: "Talebiniz alındı.", exact: true })
        .waitFor();
      await page.getByRole("button", { name: "Menüyü aç" }).click();
      await page
        .getByRole("button", { name: "Gelen talepler", exact: true })
        .click();
      await page
        .getByRole("heading", { name: "Tarayıcı talebi", exact: true })
        .waitFor();
      await page
        .getByRole("button", { name: "Okundu olarak işaretle", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Okunmadı olarak işaretle", exact: true })
        .waitFor();
      ok(
        "mobile product heading and fixed quote action preserve the selected product through inquiry submission into the admin inbox",
      );
      await launchPage.goto(origin + "/is-guvenligi", {
        waitUntil: "networkidle",
      });
      const catalogPhoto = launchPage.locator(
        '.catalog-grid a[href="/is-guvenligi/yeni-panel-urunu"] img',
      );
      await catalogPhoto.scrollIntoViewIfNeeded();
      await catalogPhoto.evaluate((img) => img.decode());
      assert(
        (await catalogPhoto.getAttribute("src")).includes("/_next/image?"),
      );
      await launchPage.goto(origin + "/haberler", { waitUntil: "networkidle" });
      const firstArticle = await launchPage
        .locator(".news-index-card")
        .first()
        .getAttribute("href");
      await launchPage.locator(".news-index-card").first().click();
      await launchPage.waitForURL("**" + firstArticle);
      assert.equal(await launchPage.locator(".news-article h1").count(), 1);
      assert.equal(
        new URL(
          await launchPage
            .locator('link[rel="canonical"]')
            .getAttribute("href"),
        ).pathname,
        firstArticle,
      );
      const social = await launchPage.request.get(
        origin + "/paylasim?path=" + encodeURIComponent(firstArticle),
      );
      assert.equal(social.status(), 200);
      assert.match(social.headers()["content-type"], /image\/png/);
      assert.equal(
        (await social.body()).subarray(0, 8).toString("hex"),
        "89504e470d0a1a0a",
      );
      assert.equal(
        (
          await launchPage.request.get(
            origin + "/paylasim?path=%2Funknown-page",
          )
        ).status(),
        404,
      );
      assert.deepEqual(errors, []);
      ok(
        "uploaded product images appear in catalog cards; news have internal detail pages, canonical URLs and rendered social preview images",
      );
      await launchVisitor.close();
    } finally {
      await browser.close();
    }
  }
  for (let attempt = 0; attempt < 61; attempt++) {
    r = await request("/api/admin/auth", {
      method: "POST",
      body: { username, password },
    });
    assert.equal(
      r.status,
      200,
      "successful logins must not exhaust the failure limit",
    );
    cookie = r.headers.get("set-cookie").split(";")[0];
  }
  for (let attempt = 0; attempt < 8; attempt++) {
    assert.equal(
      (
        await request("/api/admin/auth", {
          method: "POST",
          body: { username, password: "wrong" },
          ip: "192.0.2.70",
        })
      ).status,
      401,
    );
  }
  assert.equal(
    (
      await request("/api/admin/auth", {
        method: "POST",
        body: { username, password },
        ip: "192.0.2.70",
      })
    ).status,
    429,
  );
  assert.equal(
    (
      await request("/api/admin/auth", {
        method: "POST",
        body: { username, password },
        ip: "192.0.2.71",
      })
    ).status,
    200,
  );
  ok(
    "failed logins are limited per address without locking out repeated successful logins",
  );
  r = await request("/api/admin/auth", { method: "DELETE" });
  assert.equal(r.status, 200);
  ok("logout clears session");
  const directListener = net.createServer();
  await new Promise((resolve) =>
    directListener.listen(0, "127.0.0.1", resolve),
  );
  const directPort = directListener.address().port;
  await new Promise((resolve) => directListener.close(resolve));
  const directOrigin = "http://127.0.0.1:" + directPort;
  const directServer = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "-p",
      String(directPort),
      "-H",
      "127.0.0.1",
    ],
    {
      env: { ...process.env, CMS_DATA_DIR: dataDir, SITE_ORIGIN: "" },
      stdio: "ignore",
    },
  );
  try {
    for (let attempt = 0; attempt < 80; attempt++) {
      try {
        if ((await fetch(directOrigin + "/api/admin/auth")).ok) break;
      } catch {}
      if (attempt === 79) throw new Error("Direct-origin server did not start");
      await delay(100);
    }
    for (const hostname of ["127.0.0.1", "localhost"]) {
      const directUrl = "http://" + hostname + ":" + directPort;
      const login = await fetch(directUrl + "/api/admin/auth", {
        method: "POST",
        headers: { Origin: directUrl, "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      assert.equal(login.status, 200, hostname);
    }
    assert.equal(
      (
        await fetch(directOrigin + "/api/admin/auth", {
          method: "POST",
          headers: {
            Origin: "https://untrusted.example",
            "X-Forwarded-Host": "untrusted.example",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username, password }),
        })
      ).status,
      403,
    );
    ok(
      "direct localhost and IP logins work without SITE_ORIGIN while foreign origins and spoofed forwarded hosts are rejected",
    );
  } finally {
    directServer.kill("SIGTERM");
    await new Promise((resolve) => {
      directServer.once("exit", resolve);
      setTimeout(resolve, 3000).unref();
    });
  }
  console.log(`\n${checks} checks passed. Temporary data removed.`);
} catch (e) {
  console.error(output.slice(-5000));
  throw e;
} finally {
  server.kill("SIGTERM");
  await new Promise((resolve) => {
    server.once("exit", resolve);
    setTimeout(resolve, 3000).unref();
  });
  await rm(dataDir, { recursive: true, force: true });
}
