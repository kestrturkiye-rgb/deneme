# Kıvanç Group web sitesi ve admin paneli

Node.js 24, Next.js 16, React 19, TypeScript ve Tailwind CSS. Yüklenen mevcut siteye kalıcı içerik yönetimi ve 360° ürün deneyimi eklendi.

## Başlangıç

```bash
npm ci --cache /workspace/.npm-cache
npm run admin:setup
npm run dev
```

Yönetim paneli: sitenin `/admin` yolu. Varsayılan kullanıcı adı/parola yoktur; `admin:setup` komutu ile kendi hesabınızı oluşturun.

**Vercel yayını:** [VERCEL-KURULUM.md](VERCEL-KURULUM.md).

Tam kurulum ve kullanım: **[ADMIN-KILAVUZU.md](ADMIN-KILAVUZU.md)**.

## Özellikler

- kivancgroup.com menüsündeki sekmeler ve alt bölümler; 54 ürün ailesi/bilgi başlığı, 133 ayrı model, 16 tam haber, 136 PDF ve 509 kaynak görseli.
- Kaynak belgelerin başlıkla aranması, ailelere göre model kartları ve 322 eski adres yönlendirmesi.
- Mevcut sayfalar, menüler, metinler, görseller, dokümanlar, haberler, ürünler, SEO ve tasarım ayarları.
- Bloklarla yeni sayfa oluşturma; ana sayfa bölümlerini sıralama ve gizleme.
- Taslak, oturuma özel gerçek site önizlemesi, yayınlama, sürüm geçmişi ve yedekleme.
- Ürünlerde büyük galeri, ceket/pantolon seçimi ve her parça için ayrı 360° kareleri.
- Referans ekran görüntüsüne göre koyu ürün alanı, elips açı seçimi ve oval teklif düğmesi.
- Malzeme/dış katman filtreleri, teknik kodlar, renge göre ayrı galeri ve 360° kareleri.
- 360° için toplu yükleme, doğal dosya sırası; fare, dokunma, klavye, kaydırıcı ve tam ekran.
- Teklif sepetinde seçilen ceket/pantolon adını koruma.

Ürün adları ve adresleri ayrı yönetilir; yalnızca adı değiştirmek URL'yi bozmaz. Başlangıç içerikleri `src/cms/defaults.json` içindedir. Panel değişiklikleri kod dosyalarını değiştirmeden saklanır. Yerelde `.cms/`, Vercel’de Supabase veritabanı ve Storage kullanılır.

## Üretim ve test

```bash
npm run typecheck
npm run build
npm run test:cms
npm run start
```

**Dağıtım:** Vercel’de `SUPABASE_URL` ve `SUPABASE_SERVICE_ROLE_KEY` ile kalıcı Supabase deposu kullanılır. Kurulum SQL’i `supabase/setup.sql` içindedir. Aynı veritabanını paylaşan uygulama işlemleri sürüm kontrolü ve ortak giriş sınırlarıyla çalışır. Supabase olmadan yerel kullanımda `.cms/` kalıcı diski desteklenir; Vercel’de geçici diske sessizce kayıt yapılmaz.

**İçerik aktarımı:** kaynak sitedeki gerçek ürün fotoğrafları ve belgeler depoya dahil edildi; yeniden indirilmeleri gerekmez. [Aktarım raporu](AKTARIM-RAPORU.md) kapsamı ve istisnaları açıklar. Yeni fotoğraflar ve dönüş kareleri panelden eklenebilir. Gerçek dönüş için her ürün/parça başına aynı ölçü ve arka planla çekilmiş 24–72 farklı açı önerilir; tek fotoğraftan 360° üretilemez.

İletişim ve teklif talepleri paneldeki **Gelen talepler** bölümüne kaydedilir. İsteğe bağlı e-posta bildirimi için `.env.example` içindeki Resend ayarlarını kullanın.

Mevcut klasör tabanlı fotoğraflar da desteklenir: `public/products/<ürün>/` ve `public/products/360/<ürün>/`. Eski siteden varlık indirme yardımcısı: `npm run assets` (kaynak siteye erişim gerekir).

## Güncel görsel tasarım

Site genelinde koyu gri, beyaz ve kırmızı görsel dil; geniş gri ürün menüsü, tam genişlikte açılış alanı, görselli faaliyet kartları, haberler ve yeni iletişim çağrısı uygulanmıştır. Üst menüdeki gruplar/ürünler CMS kataloğuyla birlikte güncellenir. Ana sayfanın temsili marka görseli ve kart illüstrasyonları panelden değiştirilebilir. Fontlar yereldir; mevcut admin, taslak/yayın ve 360° ürün akışları korunmuştur.

### Kreatif ana sayfa ekleri

Seçilebilir üç görsel hikâye, büyük fotoğraflı faaliyet vitrini, gerçek katalogdan ürün keşfi ve filtreleme, tipografik marka mesajı, ilerleme çizgisi ve sayfa başına dönüş eklendi. Bölümler CMS'den düzenlenebilir, sıralanabilir ve gizlenebilir. Hareketler kullanıcı tercihine bağlıdır; azaltılmış hareket ayarına uyulur. Ürün görselleri ve 360° kareleri varsa katalog kartlarına otomatik yansır.

## Yayın öncesi tamamlanan düzenlemeler

Fotoğraflı ürün kartları, mobilde başlığı öne alan ürün sayfası ve sabit teklif düğmesi, doğrudan teklif formu, görselli Kurumsal/Ar-Ge, resim ve metin eklenebilir haber detayları, okunabilir yazılar ve kontrast, yerel görsellerde AVIF/WebP optimizasyonu ve sayfaya özel sosyal paylaşım kartları bulunur. Gerçek ürün verileri, fotoğrafları ve çok açılı kareler panelden eklenir; mevcut olmayan teknik özellikler uydurulmaz.

`npm run test:cms` yerel CMS akışlarını; `npm run test:cloud` gerçek PostgreSQL motoru (PGlite) ve yerel Supabase REST/Storage sözleşme servisiyle bulut adaptörünü sınar. Gerçek Vercel/Supabase hesabı bu testlerde kullanılmaz. `CMS_BROWSER_MODULE` bir Playwright modül yoluna ayarlanırsa tarayıcı kontrolleri de çalışır.

Güncel tasarımın 8 sayfalık ekran görüntüsü albümü: [PDF önizleme](goruntuler/vercel-hazir-tasarim.pdf) (yaklaşık 1,34 MB).

Kaynak aktarımı için menü, galeri, belge araması ve 322 yönlendirmeyi çalışan site üzerinde kontrol etmek için: `npm run start` çalışırken başka terminalde `CMS_BROWSER_MODULE=/tam/yol/playwright/index.mjs npm run test:site`. Farklı bir yayın/port için `SITE_TEST_ORIGIN` ayarlanabilir. Test yalnızca okuma ve sayfa gezintisi yapar.
