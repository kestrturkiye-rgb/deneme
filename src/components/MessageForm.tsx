"use client";
import {useLocale} from "@/i18n/context";

import { useSection } from "@/cms/context";

import Link from "@/components/LocalizedLink";
import { useState } from "react";

type QuoteItem = { name: string; qty: number; href: string };

type Props = {
  kind: "contact" | "quote" | "inquiry";
  subject?: string;
  items?: QuoteItem[];
  onSuccess?: () => void;
};

type Status = "idle" | "sending" | "success" | "error";

const fieldClass =
  "mt-2 w-full border border-mist-dark bg-paper px-4 py-3 text-[15px] text-ink outline-none transition-colors placeholder:text-muted focus:border-brand-500";
const labelClass = "block text-sm font-semibold text-ink";

export default function MessageForm({
  kind,
  items,
  onSuccess,
  subject,
}: Props) {
  const locale=useLocale();
  const cms = useSection("components-MessageForm");

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    setStatus("sending");
    setError("");

    try {
      const res = await fetch("/api/mesaj", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Site-Language": locale },
        body: JSON.stringify({
          kind,
          name: data.get("name"),
          company: data.get("company"),
          email: data.get("email"),
          phone: data.get("phone"),
          message: data.get("message"),
          website: data.get("website"),
          consent: data.get("consent") === "on",
          items: items ?? [],
        }),
      });

      const result = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        setError(result.error ?? cms.sendError);
        setStatus("error");
        return;
      }

      form.reset();
      setStatus("success");
      onSuccess?.();
    } catch {
      setError(
        cms.connectionError,
      );
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div role="status" className="border border-brand-500 bg-brand-100 p-8">
        <h3 className="text-2xl font-semibold text-ink">
          {kind === "inquiry"
            ? cms.receivedTitle
            : kind === "quote"
              ? cms.metin01
              : cms.metin02}
        </h3>
        <p className="mt-3 text-[15px] leading-relaxed text-ink">
          {cms.metin03}
        </p>
      </div>
    );
  }

  const sending = status === "sending";

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate={false}>
      {/* Bot tuzağı: insanlar bu alanı görmez */}
      <div
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
      >
        <label>
          {cms.metin04}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className={labelClass}>
          {cms.metin05}
          <input
            name="name"
            required
            maxLength={120}
            autoComplete="name"
            className={fieldClass}
          />
        </label>
        <label className={labelClass}>
          {cms.metin06}
          <input
            name="company"
            maxLength={160}
            autoComplete="organization"
            className={fieldClass}
          />
        </label>
        <label className={labelClass}>
          {cms.metin07}
          <input
            name="email"
            type="email"
            required
            maxLength={160}
            autoComplete="email"
            className={fieldClass}
          />
        </label>
        <label className={labelClass}>
          {cms.metin08}
          <input
            name="phone"
            type="tel"
            maxLength={40}
            autoComplete="tel"
            className={fieldClass}
          />
        </label>
      </div>

      <label className={labelClass}>
        {kind === "inquiry"
          ? cms.inquiryMessage
          : kind === "quote"
            ? cms.metin09
            : cms.metin10}
        <textarea
          name="message"
          rows={kind === "quote" ? 4 : 6}
          required={kind !== "quote"}
          placeholder={kind === "inquiry" ? cms.inquiryPlaceholder : undefined}
          defaultValue={
            subject ? subject + " için bilgi ve teklif rica ediyorum." : ""
          }
          maxLength={4000}
          className={fieldClass}
        />
      </label>

      <label className="flex items-start gap-3 text-sm leading-snug text-muted">
        <input
          type="checkbox"
          name="consent"
          required
          className="mt-1 h-4 w-4 accent-brand-500"
        />
        <span>
          <Link
            href={cms.metin11}
            className="font-semibold text-brand-600 underline underline-offset-4"
          >
            {cms.metin12}
          </Link>{" "}
          {cms.metin13}
        </span>
      </label>

      {status === "error" && (
        <p
          role="alert"
          className="border border-red-300 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={sending}
        className="btn-primary disabled:opacity-60"
      >
        {sending
          ? cms.metin14
          : kind === "inquiry"
            ? cms.inquirySubmit
            : kind === "quote"
              ? cms.metin15
              : cms.metin16}
      </button>
    </form>
  );
}
