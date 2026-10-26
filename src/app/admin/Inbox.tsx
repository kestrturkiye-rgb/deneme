"use client";
import { useCallback, useEffect, useState } from "react";
import type { Inquiry } from "@/cms/inquiries";
type Result = { items: Inquiry[]; total: number; unread: number; page: number };
export default function Inbox() {
  const [data, setData] = useState<Result | null>(null),
    [page, setPage] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setError("");
    try {
      const r = await fetch("/api/admin/inquiries?page=" + page, {
        cache: "no-store",
      });
      const v = await r.json();
      if (!r.ok) throw new Error(v.error);
      setData(v);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [page]);
  useEffect(() => {
    void load();
  }, [load]);
  async function action(item: Inquiry, remove = false) {
    if (remove && !confirm("Bu talep kalıcı olarak silinsin mi?")) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/admin/inquiries", {
        method: remove ? "DELETE" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, read: !item.read }),
      });
      const v = await r.json();
      if (!r.ok) throw new Error(v.error);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="adm-inbox">
      <div className="adm-editor-card adm-padded">
        <div className="adm-inbox-toolbar">
          <div>
            <h2>Gelen talepler</h2>
            <p>
              {data
                ? `${data.total} talep · ${data.unread} okunmamış`
                : "Talepler yükleniyor…"}
            </p>
          </div>
          <button className="adm-btn" onClick={load} disabled={busy}>
            Yenile
          </button>
        </div>
        <p className="adm-muted">
          İletişim ve teklif formlarından gelen kayıtlar burada saklanır.
          E-posta bildirimi olmasa da kayıtları buradan takip edebilirsiniz.
        </p>
      </div>
      {error && (
        <p className="adm-alert" role="alert">
          {error}
        </p>
      )}
      {data?.items.length === 0 && (
        <div className="adm-editor-card adm-padded">
          <h2>Henüz talep yok.</h2>
          <p className="adm-muted">Yeni talepler geldikçe burada görünecek.</p>
        </div>
      )}
      {data?.items.map((item) => (
        <article
          className={
            "adm-editor-card adm-padded adm-inquiry" +
            (item.read ? "" : " is-unread")
          }
          key={item.id}
        >
          <div className="adm-inbox-toolbar">
            <div>
              <span className="adm-eyebrow">
                {item.kind === "contact" ? "İLETİŞİM MESAJI" : "TEKLİF TALEBİ"}
                {!item.read ? " · YENİ" : ""}
              </span>
              <h2>{item.name}</h2>
              <p>{item.company}</p>
            </div>
            <time dateTime={item.createdAt}>
              {new Date(item.createdAt).toLocaleString("tr-TR", {
                timeZone: "Europe/Istanbul",
              })}
            </time>
          </div>
          <div className="adm-inquiry-contact">
            <a href={"mailto:" + item.email}>{item.email}</a>
            {item.phone && (
              <a href={"tel:" + item.phone.replace(/[^+0-9]/g, "")}>
                {item.phone}
              </a>
            )}
          </div>
          <p className="adm-inquiry-message">{item.message}</p>
          {item.items.length > 0 && (
            <ul>
              {item.items.map((product, index) => (
                <li key={index}>
                  {product.name} × {product.qty}
                </li>
              ))}
            </ul>
          )}
          <div className="adm-inbox-toolbar">
            <small>
              E-posta bildirimi:{" "}
              {item.delivery === "sent"
                ? "İletildi"
                : item.delivery === "failed"
                  ? "İletilemedi; talep kayıtlı"
                  : "Yapılandırılmamış; talep kayıtlı"}
            </small>
            <div className="adm-actions">
              <button
                className="adm-btn"
                disabled={busy}
                onClick={() => action(item)}
              >
                {item.read
                  ? "Okunmadı olarak işaretle"
                  : "Okundu olarak işaretle"}
              </button>
              <button
                className="adm-btn"
                disabled={busy}
                onClick={() => action(item, true)}
              >
                Talebi sil
              </button>
            </div>
          </div>
        </article>
      ))}
      {data && data.total > 25 && (
        <div className="adm-actions">
          <button
            className="adm-btn"
            disabled={!page || busy}
            onClick={() => setPage(page - 1)}
          >
            Önceki
          </button>
          <span>Sayfa {page + 1}</span>
          <button
            className="adm-btn"
            disabled={(page + 1) * 25 >= data.total || busy}
            onClick={() => setPage(page + 1)}
          >
            Sonraki
          </button>
        </div>
      )}
    </section>
  );
}
