import assert from "node:assert/strict";

/** End-to-end authoring checks use the parent suite's isolated account and files. */
export async function runAdminStudio({ page, browser, origin, pngFrame, ok }) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  const slug = "optimus-2-0-832536",
    href = "/is-guvenligi/" + slug;
  const files = [
    {
      name: "photo-10.png",
      mimeType: "image/png",
      buffer: pngFrame(40, 100, 220),
    },
    {
      name: "photo-2.png",
      mimeType: "image/png",
      buffer: pngFrame(30, 160, 90),
    },
    {
      name: "photo-1.png",
      mimeType: "image/png",
      buffer: pngFrame(240, 80, 30),
    },
  ];
  const draft = async () => {
    const r = await page.request.get(origin + "/api/admin/content");
    assert.equal(r.status(), 200);
    return (await r.json()).draft;
  };
  const save = async (kind = "save") => {
    if (kind === "publish") page.once("dialog", (d) => d.accept());
    const response = page.waitForResponse(
      (r) =>
        r.url() === origin + "/api/admin/content" &&
        r.request().method() === "POST" &&
        r.request().postDataJSON().action === kind,
    );
    await page
      .locator(".adm-savebar")
      .getByRole("button", {
        name: kind === "save" ? "Taslağı kaydet" : "Yayınla →",
        exact: true,
      })
      .click();
    const r = await response;
    assert.equal(r.status(), 200, await r.text());
    await page.waitForFunction(
      () => !document.querySelector(".adm-main").inert,
    );
    return draft();
  };
  const upload = async (locator, items) => {
    await locator.setInputFiles(items);
    await page.waitForFunction(
      () => !document.querySelector(".adm-upload-status"),
    );
    await page
      .locator(".adm-savebar")
      .getByRole("button", { name: "Taslağı kaydet", exact: true })
      .waitFor();
  };
  await page.goto(origin + "/admin?product=" + slug, {
    waitUntil: "networkidle",
  });
  await page
    .locator(".adm-product-form h2")
    .filter({ hasText: "Optimus" })
    .waitFor();
  const before = await draft(),
    initial = before["data-details"].details[slug]?.images?.length || 0;
  const unchanged = structuredClone(
    before["data-details"].details["maximus-2-0-832551"],
  );
  let release;
  const gate = new Promise((resolve) => (release = resolve));
  const uploadRoute = async (route) => {
    if (route.request().method() === "POST") await gate;
    await route.continue();
  };
  await page.route("**/api/admin/media", uploadRoute);
  await page
    .getByLabel("Ürün fotoğrafları yükle", { exact: true })
    .setInputFiles(files);
  await page.locator(".adm-upload-status").waitFor();
  assert(
    await page
      .locator(".adm-savebar")
      .getByRole("button", { name: "Taslağı kaydet", exact: true })
      .isDisabled(),
  );
  assert(
    await page.locator(".adm-product-scroll > button").first().isDisabled(),
  );
  release();
  await page.waitForFunction(
    (n) => document.querySelectorAll(".adm-gallery-card").length === n,
    initial + 3,
  );
  await page.waitForFunction(
    () => !document.querySelector(".adm-upload-status"),
  );
  await page.unroute("**/api/admin/media", uploadRoute);
  let content = await save(),
    pictures = content["data-details"].details[slug].images;
  for (const [index, file] of [files[2], files[1], files[0]].entries())
    assert(
      Buffer.from(
        await (
          await fetch(origin + pictures[initial + index].src)
        ).arrayBuffer(),
      ).equals(file.buffer),
    );
  assert.deepEqual(
    content["data-details"].details["maximus-2-0-832551"],
    unchanged,
  );
  ok(
    "product gallery uploads actual files in natural order, protects pending uploads, and leaves other products unchanged",
  );

  const cover = pictures.at(-1).src;
  await page
    .locator(".adm-gallery-card")
    .last()
    .getByRole("button", { name: "Kapak yap", exact: true })
    .click();
  content = await save();
  assert.equal(content["data-details"].details[slug].images[0].src, cover);
  await page
    .getByRole("button", { name: "Fotoğraf 1 sil", exact: true })
    .click();
  content = await save();
  assert(
    !content["data-details"].details[slug].images.some(
      (im) => im.src === cover,
    ),
  );
  assert.equal(
    (await fetch(origin + cover)).status,
    200,
    "Removing a reference must preserve the reusable file",
  );
  ok(
    "cover changes and photo removal persist without deleting the file or changing unrelated products",
  );

  await page.getByRole("button", { name: "360°", exact: true }).click();
  await upload(
    page.getByLabel("360° karelerini yükle", { exact: true }),
    files,
  );
  await page.getByText("3 kare", { exact: true }).waitFor();
  await page.getByRole("button", { name: "360° önizle", exact: true }).click();
  await page.locator(".adm-spin-preview .p360[data-ready=true]").waitFor();
  await page
    .getByLabel("Her karenin gerçek açısını düzenle", { exact: true })
    .check();
  await page.getByLabel("2. kare açısı", { exact: true }).fill("90");
  await page.getByLabel("3. kare açısı", { exact: true }).fill("180");
  content = await save();
  assert.deepEqual(
    content["data-details"].details[slug].spin.angles,
    [0, 90, 180],
  );
  await page
    .getByRole("button", { name: "3. kare yukarı", exact: true })
    .click();
  content = await save();
  assert.deepEqual(
    content["data-details"].details[slug].spin.angles,
    [0, 180, 90],
  );
  await page
    .getByRole("button", { name: "3. kareyi sil", exact: true })
    .click();
  content = await save();
  assert.equal(content["data-details"].details[slug].spin.frames.length, 2);
  assert.deepEqual(content["data-details"].details[slug].spin.angles, [0, 180]);
  await page
    .getByLabel("Yükleme yöntemi", { exact: true })
    .selectOption("append");
  await page
    .getByLabel("360° karelerini yükle", { exact: true })
    .setInputFiles([files[1]]);
  await page.getByLabel("Yeni 3. kare açısı", { exact: true }).waitFor();
  assert(
    await page
      .locator(".adm-savebar")
      .getByRole("button", { name: "Taslağı kaydet", exact: true })
      .isDisabled(),
  );
  await page.getByLabel("Yeni 3. kare açısı", { exact: true }).fill("90");
  await page
    .getByRole("button", { name: "Kareleri seriye ekle", exact: true })
    .click();
  content = await save();
  assert.deepEqual(
    content["data-details"].details[slug].spin.angles,
    [0, 180, 90],
  );
  await page.getByLabel("Bu görünümde 360° kullan", { exact: true }).uncheck();
  await save("publish");
  const visitor = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    }),
    publicPage = await visitor.newPage();
  publicPage.on("pageerror", (e) => errors.push(e.message));
  await publicPage.goto(origin + href, { waitUntil: "networkidle" });
  assert.equal(await publicPage.locator(".p360").count(), 0);
  await page.getByLabel("Bu görünümde 360° kullan", { exact: true }).check();
  content = await save("publish");
  await publicPage.reload({ waitUntil: "networkidle" });
  await publicPage.locator(".p360[data-ready=true]").waitFor();
  assert.equal(await publicPage.locator(".p360-orbit button").count(), 3);
  assert.equal(
    await publicPage.locator(".p360-image").getAttribute("src"),
    content["data-details"].details[slug].spin.frames[0],
  );
  ok(
    "any existing garment accepts a new 360 series, real angle edits, paired frame reordering, deletion and persistent enable/disable",
  );

  await page
    .getByRole("button", { name: "Parçalar ve renkler", exact: true })
    .click();
  await page.getByRole("button", { name: "+ Ceket", exact: true }).click();
  await upload(page.getByLabel("Ürün fotoğrafları yükle", { exact: true }), [
    files[2],
  ]);
  await page.getByRole("button", { name: "360°", exact: true }).click();
  await upload(page.getByLabel("360° karelerini yükle", { exact: true }), [
    files[2],
    files[1],
  ]);
  await page
    .getByRole("button", { name: "Parçalar ve renkler", exact: true })
    .click();
  await page.getByRole("button", { name: "+ Pantolon", exact: true }).click();
  await upload(page.getByLabel("Ürün fotoğrafları yükle", { exact: true }), [
    files[0],
  ]);
  await page.getByRole("button", { name: "360°", exact: true }).click();
  await upload(page.getByLabel("360° karelerini yükle", { exact: true }), [
    files[0],
    files[1],
  ]);
  await page
    .getByRole("button", { name: "Parçalar ve renkler", exact: true })
    .click();
  await page
    .locator(".adm-variant-card")
    .first()
    .getByRole("button", { name: "+ Parçaya renk ekle", exact: true })
    .click();
  await page
    .getByLabel("Ceket 1. renk adı", { exact: true })
    .fill("Kontrol Lacivert");
  await page
    .locator(".adm-variant-card")
    .first()
    .getByRole("button", { name: "Görseller / 360°", exact: true })
    .click();
  await upload(page.getByLabel("Ürün fotoğrafları yükle", { exact: true }), [
    files[1],
  ]);
  await page.getByRole("button", { name: "360°", exact: true }).click();
  await upload(page.getByLabel("360° karelerini yükle", { exact: true }), [
    files[1],
    files[0],
  ]);
  content = await save("publish");
  const configured = content["data-details"].details[slug];
  assert(
    configured.variants[0].spin.frames[0] !==
      configured.variants[1].spin.frames[0],
  );
  assert.equal(configured.variants[0].colors[0].label, "Kontrol Lacivert");
  await publicPage.reload({ waitUntil: "networkidle" });
  await publicPage.locator(".p360[data-ready=true]").waitFor();
  assert.equal(
    await publicPage.locator(".p360-image").getAttribute("src"),
    configured.variants[0].colors[0].spin.frames[0],
  );
  await publicPage.getByRole("tab", { name: "Pantolon", exact: true }).click();
  await publicPage.locator(".p360[data-ready=true]").waitFor();
  assert.equal(
    await publicPage.locator(".p360-image").getAttribute("src"),
    configured.variants[1].spin.frames[0],
  );
  await publicPage.goto(origin + "/is-guvenligi/itfaiyeci-elbisesi", {
    waitUntil: "networkidle",
  });
  assert(
    (
      await publicPage
        .locator(`.family-model-grid a[href="${href}"] img`)
        .getAttribute("src")
    ).includes(
      encodeURIComponent(configured.variants[0].colors[0].images[0].src),
    ),
  );
  ok(
    "jacket, trousers and color-specific photo/360 editors remain separate and match the public page and category cover",
  );

  await page.getByLabel("Bu görünümde 360° kullan", { exact: true }).uncheck();
  await page.getByRole("button", { name: "Görseller", exact: true }).click();
  await page
    .getByRole("button", { name: "Fotoğraf 1 sil", exact: true })
    .click();
  content = await save("publish");
  assert.deepEqual(
    content["data-details"].details[slug].variants[0].colors[0].images,
    [],
  );
  await publicPage.goto(origin + href, { waitUntil: "networkidle" });
  assert.equal(
    await publicPage.locator(".product-photo img, .p360").count(),
    0,
  );
  assert.equal(await publicPage.locator(".product-no-image").count(), 1);
  await publicPage.getByRole("tab", { name: "Pantolon", exact: true }).click();
  await publicPage.locator(".p360[data-ready=true]").waitFor();
  await publicPage.goto(origin + "/is-guvenligi/itfaiyeci-elbisesi", {
    waitUntil: "networkidle",
  });
  assert.equal(
    await publicPage
      .locator(`.family-model-grid a[href="${href}"] img`)
      .count(),
    0,
  );
  ok(
    "removing a color's photos and disabling its spin does not restore inherited media or alter another garment's series",
  );

  await page
    .getByRole("button", { name: "Sayfalar ve görseller", exact: true })
    .click();
  await page
    .locator(".adm-page-links button")
    .filter({ hasText: "/iletisim" })
    .click();
  await upload(page.getByLabel("Banner görseli yükle", { exact: true }), [
    files[2],
  ]);
  await page
    .getByLabel("Banner başlığı", { exact: true })
    .fill("Görsel sayfa kontrolü");
  await page
    .getByLabel("Banner görsel açıklaması", { exact: true })
    .fill("Kontrol banner fotoğrafı");
  await page
    .getByRole("button", { name: "Fotoğraflı bloklar", exact: true })
    .click();
  await page.getByRole("button", { name: "+ Blok ekle", exact: true }).click();
  await page
    .locator(".adm-block-card")
    .first()
    .getByLabel("Başlık", { exact: true })
    .fill("Görselli ilk bölüm");
  await page
    .locator(".adm-block-card")
    .first()
    .getByLabel("Metin", { exact: true })
    .fill("Sayfaya ait düzenlenebilir açıklama.");
  await upload(page.getByLabel("1. blok görseli yükle", { exact: true }), [
    files[1],
  ]);
  await page.getByRole("button", { name: "+ Blok ekle", exact: true }).click();
  await page
    .locator(".adm-block-card")
    .last()
    .getByLabel("Başlık", { exact: true })
    .fill("Gizlenecek bölüm");
  await page
    .locator(".adm-block-card")
    .last()
    .getByLabel("Bloğu göster", { exact: true })
    .uncheck();
  await page
    .getByRole("button", { name: "Blok 2 yukarı", exact: true })
    .click();
  await save();
  await page
    .getByRole("button", { name: "Bu sayfayı önizle ↗", exact: true })
    .click();
  await page.waitForURL("**/iletisim");
  await page
    .getByRole("heading", { name: "Görsel sayfa kontrolü", exact: true })
    .waitFor();
  assert.equal(
    await page.locator(".kg-page-banner img").getAttribute("alt"),
    "Kontrol banner fotoğrafı",
  );
  assert.equal(await page.locator(".source-block").count(), 1);
  assert.equal(
    await page
      .getByRole("heading", { name: "Gizlenecek bölüm", exact: true })
      .count(),
    0,
  );
  assert.equal(await page.locator("main form").count(), 1);
  await publicPage.goto(origin + "/iletisim", { waitUntil: "networkidle" });
  assert.equal(
    await publicPage
      .getByRole("heading", { name: "Görsel sayfa kontrolü", exact: true })
      .count(),
    0,
  );
  ok(
    "a page-specific banner and reordered visible photo blocks appear in the exact draft preview while public content remains unchanged",
  );
  await page.goto(origin + "/admin?page=%2Filetisim", {
    waitUntil: "networkidle",
  });
  await page
    .getByRole("button", { name: "Fotoğraflı bloklar", exact: true })
    .click();
  await page.locator(".adm-layout-mode > summary").click();
  await page
    .getByLabel("Sayfayı yalnızca bu bloklarla oluştur", { exact: true })
    .check();
  await save("publish");
  await publicPage.reload({ waitUntil: "networkidle" });
  assert.equal(await publicPage.locator("main form").count(), 0);
  assert.equal(
    await publicPage
      .getByRole("heading", { name: "Görselli ilk bölüm", exact: true })
      .count(),
    1,
  );
  await page
    .getByLabel("Sayfayı yalnızca bu bloklarla oluştur", { exact: true })
    .uncheck();
  await save("publish");
  await publicPage.reload({ waitUntil: "networkidle" });
  assert.equal(await publicPage.locator("main form").count(), 1);
  await publicPage.goto(origin + "/kurumsal", { waitUntil: "networkidle" });
  assert.equal(
    await publicPage
      .getByRole("heading", { name: "Görsel sayfa kontrolü", exact: true })
      .count(),
    0,
  );
  ok(
    "page layout replacement and restoration preserve other pages and restore the original form",
  );

  await page.goto(origin + "/admin?product=" + slug, {
    waitUntil: "networkidle",
  });
  await page.getByRole("button", { name: "+ Yeni ürün", exact: true }).click();
  await page
    .locator(".adm-create-product")
    .getByLabel("Ürün adı", { exact: true })
    .fill("Panelden Yeni Kıyafet");
  await page
    .locator(".adm-create-product")
    .getByLabel("Ana ürün ailesi", { exact: true })
    .selectOption("itfaiyeci-elbisesi");
  await page
    .getByRole("button", { name: "Ürünü oluştur", exact: true })
    .click();
  await upload(page.getByLabel("Ürün fotoğrafları yükle", { exact: true }), [
    files[2],
  ]);
  await page.getByRole("button", { name: "360°", exact: true }).click();
  await upload(page.getByLabel("360° karelerini yükle", { exact: true }), [
    files[2],
    files[1],
  ]);
  await save("publish");
  await publicPage.goto(origin + "/is-guvenligi/panelden-yeni-kiyafet", {
    waitUntil: "networkidle",
  });
  await publicPage.locator(".p360[data-ready=true]").waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "360°", exact: true }).click();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  assert(
    await page
      .locator(".adm-savebar")
      .getByRole("button", { name: "Yayınla →", exact: true })
      .isVisible(),
  );
  assert.equal(
    (await draft())["data-details"].details["panelden-yeni-kiyafet"].spin.frames
      .length,
    2,
  );
  assert.deepEqual(errors, []);
  ok(
    "new products can be created, photographed, given a 360 series, published and edited on a phone without overflow",
  );
  await visitor.close();
}
