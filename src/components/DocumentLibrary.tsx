"use client";
import { useState, type ReactNode } from "react";

export default function DocumentLibrary({
  items,
  labels,
}: {
  items: { title: string; href: string; node: ReactNode }[];
  labels: {
    searchLabel: string;
    searchPlaceholder: string;
    resultTemplate: string;
    noResults: string;
  };
}) {
  const [query, setQuery] = useState("");
  const normalize = (value: string) =>
    value
      .toLocaleLowerCase("tr")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replaceAll("ı", "i");
  const words = normalize(query).trim().split(/\s+/).filter(Boolean);
  const visible = items.filter((item) =>
    words.every((word) => normalize(item.title).includes(word)),
  );
  return (
    <>
      <div className="document-library-search">
        <label htmlFor="document-query">{labels.searchLabel}</label>
        <input
          type="search"
          id="document-query"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={labels.searchPlaceholder}
        />
        <p role="status">
          {labels.resultTemplate.replace("{count}", String(visible.length))}
        </p>
      </div>
      {visible.length ? (
        <ul className="mt-6 divide-y divide-mist-dark border-y border-mist-dark bg-paper">
          {visible.map((item) => (
            <li key={item.href}>{item.node}</li>
          ))}
        </ul>
      ) : (
        <p className="py-8 text-muted">{labels.noResults}</p>
      )}
    </>
  );
}
