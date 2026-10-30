import { isPreviewDeployment } from "@/lib/deployment";
import type { Metadata } from "next";
import { CartProvider } from "@/components/CartProvider";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import SiteFrame from "@/components/SiteFrame";
import { getClientContent } from "@/cms/server";
import { cookies } from "next/headers";
import { authenticated } from "@/cms/auth";
import { pageMetadata } from "@/lib/metadata";
import { siteBase } from "@/lib/site-base";
import "./globals.css";
import "./brand-design.css";
import "./creative-design.css";
import "./launch-design.css";
import "./surface-design.css";
import "./home-fonts.css";
import "./home-design.css";
import "./navigation-design.css";
import "./identity-design.css";
import "./page-content.css";
export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const c = (await getClientContent())["app-layout"].metadata;
  return {
    ...(await pageMetadata("/", c as Metadata)),
    metadataBase: new URL(siteBase(c.metadataBase)),
    ...(isPreviewDeployment()
      ? { robots: { index: false, follow: false } }
      : {}),
  } as Metadata;
}
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const content = await getClientContent();
  const cms = content["app-layout"];
  const preview =
    (await cookies()).get("cms_preview")?.value === "1" &&
    (await authenticated());
  return (
    <html lang="tr">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(cms.organizationJsonLd).replace(
              /</g,
              "\\u003c",
            ),
          }}
        />
        <CartProvider>
          <SiteFrame
            content={content}
            header={<Header />}
            footer={<Footer />}
            preview={preview}
          >
            {children}
          </SiteFrame>
        </CartProvider>
      </body>
    </html>
  );
}
