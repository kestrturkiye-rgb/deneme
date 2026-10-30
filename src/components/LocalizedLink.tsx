"use client";
import NextLink from "next/link";
import { forwardRef, type ComponentProps } from "react";
import { useLocale } from "@/i18n/context";
import { localizedHref } from "@/i18n/locales";
const LocalizedLink = forwardRef<
  HTMLAnchorElement,
  ComponentProps<typeof NextLink>
>(function LocalizedLink({ href, ...props }, ref) {
  const locale = useLocale();
  const target =
    typeof href === "string"
      ? localizedHref(href, locale)
      : {
          ...href,
          ...(href.pathname
            ? { pathname: localizedHref(href.pathname, locale) }
            : {}),
        };
  return <NextLink {...props} ref={ref} href={target} />;
});
export default LocalizedLink;
