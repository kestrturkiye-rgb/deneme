// Exercises the Supabase adapter with real PostgreSQL semantics in PGlite.
// The local HTTP service implements the provider's REST/storage contract, not a live cloud account.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { PGlite } from "@electric-sql/pglite";
import { createClient } from "@supabase/supabase-js";
import { readFile, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomBytes, scryptSync } from "node:crypto";
import { spawn } from "node:child_process";
import net from "node:net";
import { setTimeout as delay } from "node:timers/promises";
const pg = new PGlite();
await pg.waitReady;
await pg.exec(
  "create role anon;create role authenticated;create role service_role;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);",
);
await pg.exec(await readFile("supabase/setup.sql", "utf8"));
const serviceKey = randomBytes(32).toString("hex");
const files = new Map(),
  tokens = new Map();
let checks = 0;
const pass = (m) => {
  checks++;
  console.log("PASS " + m);
};
const api = createServer(async (req, res) => {
  const reply = (status, value, headers = {}) => {
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "content-type,x-upsert",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      ...headers,
    });
    res.end(value === null ? "" : JSON.stringify(value));
  };
  try {
    if (req.method === "OPTIONS") return reply(200, {});
    const u = new URL(req.url, "http://fixture");
    const pathname = u.pathname;
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks);
    const body =
      raw.length && req.headers["content-type"]?.includes("application/json")
        ? JSON.parse(raw)
        : {};
    if (pathname.startsWith("/rest/v1/")) {
      if (req.headers.authorization !== "Bearer " + serviceKey)
        return reply(401, { message: "unauthorized" });
      if (pathname.startsWith("/rest/v1/rpc/")) {
        let data;
        if (pathname.endsWith("/cms_rate_limit"))
          data = (
            await pg.query(
              "select public.cms_rate_limit($1,$2,$3,$4) as value",
              [body.rate_key, body.max_hits, body.window_seconds, body.consume],
            )
          ).rows[0].value;
        else if (pathname.endsWith("/cms_patch_record"))
          data = (
            await pg.query(
              "select public.cms_patch_record($1,$2::jsonb) as value",
              [body.record_key, JSON.stringify(body.patch)],
            )
          ).rows[0].value;
        else return reply(404, { message: "unknown rpc" });
        return reply(200, data);
      }
      if (
        pathname !== "/rest/v1/cms_records" &&
        pathname !== "/rest/v1/cms_rate_limits"
      )
        return reply(404, { message: "unknown table" });
      const table = pathname.endsWith("cms_records")
        ? "cms_records"
        : "cms_rate_limits";
      const filter = u.searchParams.get("key");
      let where = "",
        params = [];
      if (filter?.startsWith("eq.")) {
        params.push(filter.slice(3));
        where = " where key=$1";
      }
      if (filter?.startsWith("like.")) {
        params.push(filter.slice(5));
        where = " where key like $1";
      }
      if (req.method === "GET" || req.method === "HEAD") {
        const offset = Number(u.searchParams.get("offset") || 0),
          limit = Number(u.searchParams.get("limit") || 1000);
        const rows = (
          await pg.query(
            `select * from ${table}${where} order by ${table === "cms_records" ? "updated_at desc" : "key"} limit ${limit} offset ${offset}`,
            params,
          )
        ).rows;
        const columns = u.searchParams.get("select")?.split(",");
        const data =
          columns && !columns.includes("*")
            ? rows.map((row) =>
                Object.fromEntries(columns.map((k) => [k, row[k]])),
              )
            : rows;
        return reply(200, data, {
          "Content-Range": `0-${Math.max(0, data.length - 1)}/${data.length}`,
        });
      }
      if (req.method === "POST") {
        const values = Array.isArray(body) ? body : [body],
          result = [];
        for (const row of values) {
          const ignore = req.headers.prefer?.includes("ignore-duplicates");
          const sql =
            "insert into cms_records(key,value,version,updated_at) values($1,$2::jsonb,$3,now()) on conflict(key) do " +
            (ignore
              ? "nothing"
              : "update set value=excluded.value,version=excluded.version,updated_at=now()") +
            " returning key";
          result.push(
            ...(
              await pg.query(sql, [
                row.key,
                JSON.stringify(row.value),
                row.version || 0,
              ])
            ).rows,
          );
        }
        return reply(201, result);
      }
      if (req.method === "PATCH") {
        params = [JSON.stringify(body.value), body.version, body.key];
        where = " where key=$3";
        const version = u.searchParams.get("version");
        if (version?.startsWith("eq.")) {
          params.push(Number(version.slice(3)));
          where += " and version=$4";
        }
        const rows = (
          await pg.query(
            "update cms_records set value=$1::jsonb,version=$2,updated_at=now()" +
              where +
              " returning key",
            params,
          )
        ).rows;
        return reply(200, rows);
      }
      if (req.method === "DELETE") {
        const rows = (
          await pg.query(
            "delete from " + table + where + " returning key",
            params,
          )
        ).rows;
        return reply(200, rows);
      }
    }
    const uploadPrefix = "/storage/v1/object/upload/sign/site-media/";
    const publicPrefix = "/storage/v1/object/public/site-media/";
    const infoPrefix = "/storage/v1/object/info/site-media/";
    if (pathname.startsWith(uploadPrefix)) {
      const file = pathname.slice(uploadPrefix.length);
      if (req.method === "POST") {
        if (req.headers.authorization !== "Bearer " + serviceKey)
          return reply(401, { message: "unauthorized" });
        const token = randomBytes(16).toString("hex");
        tokens.set(token, file);
        return reply(200, {
          url: "/object/upload/sign/site-media/" + file + "?token=" + token,
        });
      }
      if (req.method === "PUT") {
        if (tokens.get(u.searchParams.get("token")) !== file)
          return reply(403, { message: "invalid token" });
        if (files.has(file)) return reply(409, { message: "already exists" });
        const request = new Request("http://fixture/upload", {
          method: "PUT",
          headers: req.headers,
          body: raw,
        });
        const form = await request.formData();
        const entry = form.get("");
        files.set(file, {
          bytes: Buffer.from(await entry.arrayBuffer()),
          type: entry.type,
        });
        return reply(200, { Key: "site-media/" + file });
      }
    }
    if (pathname.startsWith(publicPrefix)) {
      const item = files.get(pathname.slice(publicPrefix.length));
      if (!item) return reply(404, { message: "missing" });
      const ranged = Boolean(req.headers.range);
      const bytes = ranged
        ? item.bytes.subarray(
            0,
            Number(/bytes=0-(\d+)/.exec(req.headers.range)?.[1] || 15) + 1,
          )
        : item.bytes;
      res.writeHead(ranged ? 206 : 200, {
        "Content-Type": item.type,
        "Content-Length": bytes.length,
        "Access-Control-Allow-Origin": "*",
      });
      res.end(bytes);
      return;
    }
    if (pathname.startsWith(infoPrefix)) {
      if (req.headers.authorization !== "Bearer " + serviceKey)
        return reply(401, { message: "unauthorized" });
      const item = files.get(pathname.slice(infoPrefix.length));
      return item
        ? reply(200, {
            size: item.bytes.length,
            metadata: { size: item.bytes.length },
          })
        : reply(404, { message: "missing" });
    }
    if (
      pathname === "/storage/v1/object/site-media" &&
      req.method === "DELETE"
    ) {
      if (req.headers.authorization !== "Bearer " + serviceKey)
        return reply(401, { message: "unauthorized" });
      for (const name of body.prefixes || []) files.delete(name);
      return reply(200, []);
    }
    reply(404, { message: "unhandled fixture request" });
  } catch (error) {
    reply(500, { message: error.message });
  }
});
await new Promise((r) => api.listen(0, "127.0.0.1", r));
const provider = "http://127.0.0.1:" + api.address().port;
const db = createClient(provider, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const dir = await mkdtemp(path.join(tmpdir(), "kivanc-cloud-test-"));
const servers = [];
let logs = "";
async function start(extraEnv = {}) {
  const listener = net.createServer();
  await new Promise((r) => listener.listen(0, "127.0.0.1", r));
  const port = listener.address().port;
  await new Promise((r) => listener.close(r));
  const origin = "http://localhost:" + port;
  const child = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "-p", String(port)],
    {
      env: {
        ...process.env,
        VERCEL: "1",
        VERCEL_ENV: "preview",
        VERCEL_URL: "preview.example.test",
        VERCEL_PROJECT_PRODUCTION_URL: "",
        CMS_DATA_DIR: dir,
        SUPABASE_URL: provider,
        SUPABASE_SERVICE_ROLE_KEY: serviceKey,
        SUPABASE_STORAGE_BUCKET: "site-media",
        SITE_ORIGIN: origin,
        RESEND_API_KEY: "",
        CONTACT_FROM: "",
        ...extraEnv,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  servers.push(child);
  child.stdout.on("data", (b) => (logs += b));
  child.stderr.on("data", (b) => (logs += b));
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(origin + "/api/admin/auth")).ok) return origin;
    } catch {}
    await delay(100);
  }
  throw new Error("Cloud test server did not start");
}
let cookie = "";
async function request(
  base,
  url,
  { method = "GET", body, authenticated = true, ip = "192.0.2.10" } = {},
) {
  return fetch(base + url, {
    method,
    headers: {
      ...(authenticated && cookie ? { Cookie: cookie } : {}),
      Origin: base,
      "Content-Type": "application/json",
      "X-Forwarded-For": ip,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
try {
  await pg.exec("set role anon");
  await assert.rejects(pg.query("select * from public.cms_records"));
  await assert.rejects(pg.query("select public.cms_rate_limit('x',5,60,true)"));
  await pg.exec("reset role");
  pass(
    "SQL prevents anonymous reads of accounts, drafts and requests and denies public RPC execution",
  );
  const a = await start();
  assert.equal(
    (await (await fetch(a + "/api/admin/auth")).json()).configured,
    false,
  );
  const username = "cloud-admin",
    password = randomBytes(24).toString("hex"),
    salt = randomBytes(24).toString("hex");
  const account = {
    username,
    salt,
    hash: scryptSync(password, salt, 64).toString("hex"),
    secret: randomBytes(48).toString("hex"),
  };
  const seeded = await db
    .from("cms_records")
    .insert({ key: "admin", value: account, version: 0 });
  assert.equal(seeded.error, null);
  let r = await request(a, "/api/admin/auth", {
    method: "POST",
    body: { username, password },
  });
  assert.equal(r.status, 200);
  cookie = r.headers.get("set-cookie").split(";")[0];
  assert.equal(
    (await (await request(a, "/api/admin/auth")).json()).backend,
    "supabase",
  );
  pass(
    "Vercel mode loads the private cloud account and authenticates without a local account file",
  );
  let state = await (await request(a, "/api/admin/content")).json();
  const content = structuredClone(state.draft);
  content["components-Hero"].metin02 = "Bulutta kalıcı içerik";
  r = await request(a, "/api/admin/content", {
    method: "POST",
    body: { action: "publish", version: state.version, content },
  });
  assert.equal(r.status, 200);
  state = await r.json();
  const b = await start();
  assert((await (await fetch(b)).text()).includes("Bulutta kalıcı içerik"));
  assert.equal(
    (await (await request(b, "/api/admin/content")).json()).version,
    state.version,
  );
  pass(
    "A second server instance sees published cloud content, history and sessions without filesystem state",
  );
  const first = structuredClone(content),
    second = structuredClone(content);
  first["components-Hero"].metin02 = "Eşzamanlı kayıt A";
  second["components-Hero"].metin02 = "Eşzamanlı kayıt B";
  const writes = await Promise.all([
    request(a, "/api/admin/content", {
      method: "POST",
      body: { action: "save", version: state.version, content: first },
    }),
    request(b, "/api/admin/content", {
      method: "POST",
      body: { action: "save", version: state.version, content: second },
    }),
  ]);
  assert.deepEqual(writes.map((r) => r.status).sort(), [200, 409]);
  pass("Concurrent server instances cannot overwrite the same content version");
  const inquiry = {
    kind: "inquiry",
    name: "Bulut Talebi",
    company: "Test",
    email: "cloud@example.com",
    phone: "",
    message: "Teklif istiyorum.",
    consent: true,
  };
  assert.equal(
    (
      await request(a, "/api/mesaj", {
        method: "POST",
        body: inquiry,
        authenticated: false,
      })
    ).status,
    200,
  );
  let inbox = await (await request(b, "/api/admin/inquiries")).json();
  assert.equal(inbox.total, 1);
  assert.equal(inbox.items[0].name, inquiry.name);
  assert.equal(inbox.items[0].delivery, "not_configured");
  assert.equal(
    (
      await request(b, "/api/admin/inquiries", {
        method: "PATCH",
        body: { id: inbox.items[0].id, read: true },
      })
    ).status,
    200,
  );
  assert.equal(
    (await (await request(a, "/api/admin/inquiries")).json()).unread,
    0,
  );
  pass(
    "Inquiry receipt and read status persist across instances with email notifications disabled",
  );
  async function upload(bytes, type = "image/png") {
    const prepared = await request(a, "/api/admin/media", {
      method: "POST",
      body: { action: "prepare", type, size: bytes.length },
    });
    assert.equal(prepared.status, 200);
    const p = await prepared.json();
    const form = new FormData();
    form.set("", new File([bytes], "test.png", { type }));
    const stored = await fetch(p.signedUrl, { method: "PUT", body: form });
    assert.equal(stored.status, 200);
    return {
      response: await request(b, "/api/admin/media", {
        method: "POST",
        body: { action: "complete", path: p.path },
      }),
      path: p.path,
    };
  }
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z0fgAAAAASUVORK5CYII=",
    "base64",
  );
  const uploadResult = await upload(png);
  assert.equal(uploadResult.response.status, 200);
  const media = await uploadResult.response.json();
  assert.equal((await fetch(media.url)).status, 200);
  assert.equal((await (await request(a, "/api/admin/media")).json()).length, 1);
  const rejected = await upload(Buffer.from('<svg onload="alert(1)"/>'));
  assert.equal(rejected.response.status, 400);
  assert(!files.has(rejected.path));
  pass(
    "Signed cloud uploads are validated by bytes, registered in the library and rejected content is removed",
  );
  // Container headers exercise the storage contract; decoded playback is covered by test:video.
  const mp4Header = Buffer.from(
    "000000186674797069736f6d0000020069736f6d69736f32",
    "hex",
  );
  const webmHeader = Buffer.concat([
    Buffer.from("1a45dfa3", "hex"),
    Buffer.alloc(32),
    Buffer.from("4282847765626d", "hex"),
  ]);
  for (const [bytes, type] of [
    [mp4Header, "video/mp4"],
    [webmHeader, "video/webm"],
  ]) {
    const result = await upload(bytes, type);
    assert.equal(result.response.status, 200);
    const record = await result.response.json();
    const stored = await fetch(record.url);
    assert.equal(stored.headers.get("content-type"), type);
    assert.deepEqual(Buffer.from(await stored.arrayBuffer()), bytes);
  }
  const wrongVideo = await upload(png, "video/mp4");
  assert.equal(wrongVideo.response.status, 400);
  assert(!files.has(wrongVideo.path));
  const bucket = (
    await pg.query(
      "select allowed_mime_types from storage.buckets where id='site-media'",
    )
  ).rows[0];
  assert(bucket.allowed_mime_types.includes("video/mp4"));
  assert(bucket.allowed_mime_types.includes("video/webm"));
  pass(
    "Cloud MP4/WebM uploads preserve MIME, inspect the full signature and remove mismatched content; SQL permits videos",
  );
  if (process.env.CMS_BROWSER_MODULE) {
    const { chromium } = await import(process.env.CMS_BROWSER_MODULE);
    const browser = await chromium.launch({
      executablePath: "/usr/bin/chromium",
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
    try {
      const p = await browser.newPage({
        viewport: { width: 1200, height: 900 },
      });
      const errors = [];
      p.on("pageerror", (e) => errors.push(e.message));
      const apiSizes = [];
      p.on("request", (r) => {
        if (r.url().includes("/api/admin/media"))
          apiSizes.push(r.postDataBuffer()?.length || 0);
      });
      await p.goto(a + "/admin");
      await p.getByLabel("Kullanıcı adı", { exact: true }).fill(username);
      await p.getByLabel("Parola", { exact: true }).fill(password);
      await p.getByRole("button", { name: "Güvenli giriş →" }).click();
      await p.getByRole("heading", { name: "Hoş geldiniz." }).waitFor();
      await p
        .getByRole("button", { name: "Medya kütüphanesi", exact: true })
        .click();
      const large = Buffer.concat([png, Buffer.alloc(5_000_000 - png.length)]);
      await p.locator(".adm-upload input[type=file]").setInputFiles({
        name: "large.png",
        mimeType: "image/png",
        buffer: large,
      });
      await p
        .getByRole("status")
        .filter({ hasText: "Dosya yüklendi." })
        .waitFor();
      assert(apiSizes.every((n) => n < 2048));
      const list = await (await request(b, "/api/admin/media")).json();
      assert(list.some((i) => i.size === 5_000_000));
      await p.locator(".adm-upload input[type=file]").setInputFiles({
        name: "large.mp4",
        mimeType: "video/mp4",
        buffer: Buffer.concat([
          mp4Header,
          Buffer.alloc(5_000_000 - mp4Header.length),
        ]),
      });
      await p
        .locator(".adm-media-card")
        .filter({ hasText: "MP4" })
        .filter({ hasText: "4883 KB" })
        .waitFor();
      assert(apiSizes.every((n) => n < 2048));
      const videoList = await (await request(b, "/api/admin/media")).json();
      assert(
        videoList.some((i) => i.name.endsWith(".mp4") && i.size === 5_000_000),
      );
      assert.deepEqual(errors, []);
      pass(
        "Browser uploads a 5 MB image and video directly to storage; every Vercel upload API request stays below 2 KB",
      );
    } finally {
      await browser.close();
    }
  }
  for (let i = 0; i < 8; i++)
    assert.equal(
      (
        await request(i % 2 ? a : b, "/api/admin/auth", {
          method: "POST",
          body: { username, password: "wrong" },
          ip: "192.0.2.80",
        })
      ).status,
      401,
    );
  assert.equal(
    (
      await request(b, "/api/admin/auth", {
        method: "POST",
        body: { username, password },
        ip: "192.0.2.80",
      })
    ).status,
    429,
  );
  pass(
    "Password failure limits are shared between independent Vercel instances",
  );
  const oldCookie = cookie;
  const changed = randomBytes(24).toString("hex");
  assert.equal(
    (
      await request(a, "/api/admin/auth", {
        method: "PATCH",
        body: { currentPassword: password, newPassword: changed },
      })
    ).status,
    200,
  );
  cookie = oldCookie;
  assert.equal((await request(b, "/api/admin/content")).status, 401);
  pass("Cloud password changes invalidate sessions on other instances");
  await db.from("cms_records").delete().eq("key", "admin");
  const bootstrapPassword = randomBytes(24).toString("hex");
  const bootstrap = await start({
    CMS_BOOTSTRAP_USERNAME: "bootstrap-admin",
    CMS_BOOTSTRAP_PASSWORD: bootstrapPassword,
  });
  const seededAuth = await request(bootstrap, "/api/admin/auth", {
    method: "POST",
    authenticated: false,
    body: { username: "bootstrap-admin", password: bootstrapPassword },
    ip: "192.0.2.99",
  });
  assert.equal(seededAuth.status, 200);
  assert.equal((await seededAuth.json()).passwordChangeRequired, true);
  pass(
    "private Vercel bootstrap variables create a temporary cloud account without committing credentials",
  );
  const offline = await start({
    SUPABASE_URL: "",
    SUPABASE_SERVICE_ROLE_KEY: "",
    CMS_BOOTSTRAP_USERNAME: "",
    CMS_BOOTSTRAP_PASSWORD: "",
  });
  const offlineAuth = await (
    await request(offline, "/api/admin/auth", { authenticated: false })
  ).json();
  assert.equal(offlineAuth.backend, "unconfigured");
  assert.equal(offlineAuth.configured, false);
  assert.equal((await fetch(offline)).status, 200);
  assert.equal(
    (
      await request(offline, "/api/mesaj", {
        method: "POST",
        body: inquiry,
        authenticated: false,
        ip: "192.0.2.201",
      })
    ).status,
    503,
  );
  pass(
    "unconfigured Vercel serves the site preview but cannot falsely accept requests or write temporary account data",
  );
  assert.deepEqual(await readdir(dir), []);
  const html = await (await fetch(a)).text();
  assert(!html.includes(account.secret));
  assert(!html.includes(serviceKey));
  assert(
    (await (await fetch(a + "/robots.txt")).text()).includes("Disallow: /"),
  );
  pass(
    "Vercel mode writes no CMS files, exposes no private keys and prevents preview indexing",
  );
  console.log(
    `\n${checks} cloud checks passed. Local provider fixture and temporary data removed.`,
  );
} catch (e) {
  console.error(logs.slice(-3000));
  throw e;
} finally {
  for (const server of servers) server.kill("SIGTERM");
  await Promise.all(
    servers.map(
      (s) =>
        new Promise((r) => {
          s.once("exit", r);
          setTimeout(r, 3000).unref();
        }),
    ),
  );
  await new Promise((r) => api.close(r));
  await pg.close();
  await rm(dir, { recursive: true, force: true });
}
