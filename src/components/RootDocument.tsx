import { getLocale } from "@/i18n/server";
import { LocaleProvider } from "@/i18n/context";
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
import "@/app/globals.css";
import "@/app/brand-design.css";
import "@/app/creative-design.css";
import "@/app/launch-design.css";
import "@/app/surface-design.css";
import "@/app/home-fonts.css";
import "@/app/home-design.css";
import "@/app/navigation-design.css";
import "@/app/identity-design.css";
import "@/app/page-content.css";
import "@/app/languages.css";
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
  const locale = await getLocale();
  const content = await getClientContent();
  const cms = content["app-layout"];
  const preview =
    (await cookies()).get("cms_preview")?.value === "1" &&
    (await authenticated());
  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
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
        <LocaleProvider locale={locale}>
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
        </LocaleProvider>
      </body>
    </html>
  );
}
