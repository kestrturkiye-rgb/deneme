import "./globals.css";
export const metadata = {
  title: "Sayfa bulunamadı | Kıvanç Group",
  robots: { index: false },
};
export default function GlobalNotFound() {
  return (
    <html lang="tr" dir="ltr">
      <body
        style={{
          background: "#171d20",
          color: "#f5f2eb",
          fontFamily: "Arial,sans-serif",
        }}
      >
        <main style={{ maxWidth: 800, margin: "12vh auto", padding: 32 }}>
          <h1 style={{ fontSize: 36 }}>Sayfa bulunamadı</h1>
          <p style={{ marginBlock: 24 }}>
            Aradığınız sayfa taşınmış ya da hiç var olmamış olabilir.
          </p>
          <a href="/" style={{ color: "#ff9655" }}>
            Ana sayfa →
          </a>
        </main>
      </body>
    </html>
  );
}
