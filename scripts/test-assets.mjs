import assert from "node:assert/strict";
import { createServer } from "node:http";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  rm,
  readdir,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import vm from "node:vm";
import fs from "node:fs";
import ts from "typescript";
import { fileValid, transferAssets, inventoryAssets } from "./fetch-assets.mjs";
import { indexDocuments } from "./index-documents.mjs";
const dir = await mkdtemp(path.join(tmpdir(), "kivanc-documents-"));
const pdf = Buffer.from(
  "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n",
);
let hits = 0;
const server = createServer((req, res) => {
  hits++;
  if (req.url === "/ok.pdf") {
    res.writeHead(200, { "Content-Type": "application/octet-stream" });
    res.end(pdf);
  } else if (req.url === "/html.pdf") {
    res.writeHead(200, { "Content-Type": "application/pdf" });
    res.end("<html>Not a PDF</html>");
  } else if (req.url === "/large.pdf") {
    res.writeHead(200, {
      "Content-Type": "application/pdf",
      "Content-Length": "90000000",
    });
    res.end();
  } else if (req.url === "/slow.pdf") {
    setTimeout(() => {
      if (!res.destroyed) {
        res.writeHead(200, { "Content-Type": "application/pdf" });
        res.end(pdf);
      }
    }, 500).unref();
  } else {
    res.writeHead(403);
    res.end("Forbidden");
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = "http://127.0.0.1:" + server.address().port;
let checks = 0;
const pass = (m) => {
  checks++;
  console.log("PASS " + m);
};
try {
  const report = await transferAssets({
    base,
    publicDir: dir,
    entries: [["/ok.pdf", "docs/catalog.pdf"]],
  });
  assert.equal(report.downloaded, 1);
  assert.deepEqual(await readFile(path.join(dir, "docs/catalog.pdf")), pdf);
  assert.match(report.results[0].sha256, /^[a-f0-9]{64}$/);
  pass("PDF bytes and checksum survive a complete atomic transfer");
  const before = hits;
  const repeated = await transferAssets({
    base,
    publicDir: dir,
    entries: [["/ok.pdf", "docs/catalog.pdf"]],
  });
  assert.equal(repeated.existing, 1);
  assert.equal(hits, before);
  pass(
    "repeated transfer preserves a valid existing file without downloading again",
  );
  const failed = await transferAssets({
    base,
    publicDir: dir,
    entries: [
      ["/html.pdf", "docs/html.pdf"],
      ["/missing.pdf", "docs/failed.pdf"],
      ["/large.pdf", "docs/large.pdf"],
      ["/slow.pdf", "docs/slow.pdf"],
    ],
    timeoutMs: 100,
    maxBytes: 1000,
  });
  assert.equal(failed.failed, 4);
  assert.deepEqual((await readdir(path.join(dir, "docs"))).sort(), [
    "catalog.pdf",
  ]);
  pass(
    "HTML, forbidden responses, size limits and timeouts do not create fake PDF or partial files",
  );
  await writeFile(path.join(dir, "docs/old.pdf"), "<html>bad old cache</html>");
  const replaced = await transferAssets({
    base,
    publicDir: dir,
    entries: [["/ok.pdf", "docs/old.pdf"]],
  });
  assert.equal(replaced.downloaded, 1);
  assert.deepEqual(await readFile(path.join(dir, "docs/old.pdf")), pdf);
  pass("an invalid cached document is replaced only after a verified download");
  await assert.rejects(
    transferAssets({
      base,
      publicDir: dir,
      entries: [["/ok.pdf", "../escape.pdf"]],
    }),
  );
  await assert.rejects(
    transferAssets({
      base,
      publicDir: dir,
      entries: [
        ["/ok.pdf", "docs/a.pdf"],
        ["/ok.pdf", "docs/a.pdf"],
      ],
    }),
  );
  await assert.rejects(
    transferAssets({ base: "file:///etc", publicDir: dir, entries: [] }),
  );
  pass(
    "unsafe destination paths, duplicate targets and non-HTTP sources are rejected",
  );
  const inventory = await inventoryAssets({
    base,
    publicDir: dir,
    entries: [
      ["/ok.pdf", "docs/catalog.pdf"],
      ["/missing.pdf", "docs/missing.pdf"],
    ],
  });
  assert.deepEqual(
    inventory.map((r) => r.status),
    ["available", "missing"],
  );
  pass("inventory distinguishes actual copied documents from missing links");
  const bundled = await indexDocuments(dir);
  assert.equal(bundled.documents.length, 2);
  assert(bundled.documents.some((d) => d.href === "/docs/catalog.pdf"));
  await writeFile(path.join(dir, "docs/not-a-pdf.pdf"), "bad");
  await assert.rejects(indexDocuments(dir));
  await rm(path.join(dir, "docs/not-a-pdf.pdf"));
  pass(
    "build index includes verified PDF files and fails on corrupt static documents",
  );
  const source = await readFile("src/lib/document-availability.ts", "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  function load(vercel) {
    const exports = {};
    const sandbox = {
      exports,
      URL,
      process: { env: { VERCEL: vercel ? "1" : "" }, cwd: () => dir },
      require(name) {
        if (name === "server-only") return {};
        if (name === "node:path") return path;
        if (name === "node:fs")
          return {
            statSync: vercel
              ? () => {
                  throw new Error(
                    "Function filesystem must not be consulted for static PDFs",
                  );
                }
              : fs.statSync,
          };
        if (name === "@/cms/store") return { dataDir: () => dir };
        if (name === "@/cms/bundled-documents.json") return bundled;
        throw new Error(name);
      },
    };
    vm.runInNewContext(compiled, sandbox);
    return exports.documentAvailable;
  }
  const cloudAvailable = load(true);
  assert.equal(cloudAvailable("/docs/catalog.pdf"), true);
  assert.equal(cloudAvailable("/docs/missing.pdf"), false);
  assert.equal(cloudAvailable("/docs/../private.pdf"), false);
  assert.equal(cloudAvailable("https://example.com/document.pdf"), true);
  pass(
    "Vercel uses the build inventory when static assets are absent from the function filesystem",
  );
  const localAvailable = load(false);
  await mkdir(path.join(dir, "public/docs"), { recursive: true });
  await writeFile(path.join(dir, "public/docs/runtime.pdf"), pdf);
  assert.equal(localAvailable("/docs/runtime.pdf"), true);
  assert.equal(localAvailable("/docs/missing.pdf"), false);
  pass(
    "persistent Node deployments still discover local runtime document files",
  );
  console.log(`\n${checks} asset checks passed. Temporary documents removed.`);
} finally {
  await new Promise((r) => server.close(r));
  await rm(dir, { recursive: true, force: true });
}
