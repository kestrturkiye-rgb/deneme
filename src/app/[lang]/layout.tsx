import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/locales";
import RootDocument from "@/components/RootDocument";
export { generateMetadata } from "@/components/RootDocument";
export const dynamic = "force-dynamic";
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  if (!isLocale((await params).lang)) notFound();
  return <RootDocument>{children}</RootDocument>;
}
