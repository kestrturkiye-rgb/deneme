"use client";

import { useSection } from "@/cms/context";

import Link from "@/components/LocalizedLink";

export default function GlobalError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const cms = useSection("app-error");

  return (
    <section className="container-site py-24">
      <h1 className="text-5xl font-semibold text-ink">{cms.metin01}</h1>
      <p className="mt-4 max-w-xl text-muted">{cms.metin02}</p>
      <div className="mt-8 flex flex-wrap gap-4">
        <button type="button" onClick={reset} className="btn-primary">
          {cms.metin03}
        </button>
        <Link href={cms.metin04} className="btn-outline">
          {cms.metin05}
        </Link>
      </div>
    </section>
  );
}
