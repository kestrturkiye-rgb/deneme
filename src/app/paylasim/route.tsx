import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { readState } from "@/cms/store";
import { slugify } from "@/cms/schema";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const target = url.searchParams.get("path") || "/";
  if (target.length > 350 || !target.startsWith("/") || target.startsWith("//"))
    return new Response("Bulunamadı", { status: 404 });
  const content = (await readState()).published;
  const root = content["app-layout"];
  const routes: Record<string, { title: string; subtitle: string }> = {
    "/": {
      title: root.metadata.title.default,
      subtitle: root.metadata.description,
    },
  };
  const staticKeys = {
    "/urunler": "app-urunler",
    "/kurumsal": "app-kurumsal",
    "/ar-ge": "app-ar-ge",
    "/haberler": "app-haberler",
    "/iletisim": "app-iletisim",
    "/teklif-al": "app-teklif-al",
    "/dokumanlar": "app-dokumanlar",
    "/mevzuat": "app-mevzuat",
    "/tarihce": "app-tarihce",
    "/kariyer": "app-kariyer",
    "/satis-kanallari": "app-satis-kanallari",
    "/gizlilik-ve-guvenlik": "app-gizlilik-ve-guvenlik",
    "/arama": "app-arama",
    "/teklif-sepeti": "app-teklif-sepeti",
  } as const;
  for (const [route, key] of Object.entries(staticKeys)) {
    const data = content[key];
    routes[route] = {
      title: String(data.metadata.title),
      subtitle:
        "description" in data.metadata
          ? data.metadata.description
          : root.metadata.description,
    };
  }
  for (const d of content["data-divisions"].divisions) {
    routes["/" + d.slug] = { title: d.title, subtitle: d.intro };
    for (const group of d.groups)
      for (const item of group.items)
        routes["/" + d.slug + "/" + item.slug] = {
          title: item.name,
          subtitle: d.title + " · " + group.title,
        };
  }
  for (const item of content["data-news"].news)
    routes["/haberler/" + (item.slug || slugify(item.title))] = {
      title: item.title,
      subtitle: content["app-haberler"].eyebrow,
    };
  for (const item of content.customPages.pages as Array<{
    visible: boolean;
    slug: string;
    title: string;
    intro: string;
  }>)
    if (item.visible)
      routes["/" + item.slug] = { title: item.title, subtitle: item.intro };
  const item = routes[target];
  if (!item) return new Response("Bulunamadı", { status: 404 });
  const font = await readFile(
    path.join(process.cwd(), "public/fonts/OpenSans-ExtraBold.ttf"),
  );
  const logo = await readFile(path.join(process.cwd(), "public/logo.png"));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#202020",
          color: "white",
          padding: "55px 65px",
          fontFamily: "Brand",
          borderLeft: "16px solid #d52d0c",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <img
            width={190}
            height={72}
            src={"data:image/png;base64," + logo.toString("base64")}
            style={{
              objectFit: "contain",
              background: "white",
              padding: 8,
              borderRadius: 3,
            }}
            alt="Kıvanç Group"
          />
          <span
            style={{
              fontSize: 16,
              color: "#d7d7d7",
              maxWidth: 650,
              textAlign: "right",
            }}
          >
            {root.shareEyebrow}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            justifyContent: "center",
            maxWidth: 1050,
          }}
        >
          <div
            style={{
              fontSize: item.title.length > 85 ? 45 : 61,
              lineHeight: 1.18,
              letterSpacing: -2,
            }}
          >
            {item.title.slice(0, 160)}
          </div>
          <div
            style={{
              fontSize: 24,
              color: "#c3c3c3",
              marginTop: 24,
              lineHeight: 1.5,
            }}
          >
            {item.subtitle.slice(0, 180)}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 17,
            color: "#c6c6c6",
            borderTop: "1px solid #555",
            paddingTop: 23,
          }}
        >
          <span>{root.shareFooter}</span>
          <span style={{ color: "#ff7253" }}>KIVANÇ GROUP</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [{ name: "Brand", data: font, weight: 800, style: "normal" }],
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=60",
      },
    },
  );
}
