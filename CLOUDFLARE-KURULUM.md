# Cloudflare'de ücretsiz yayın

Site, Cloudflare Workers ücretsiz planında OpenNext adaptörüyle (`@opennextjs/cloudflare`) çalışır.

- Admin paneli, formlar ve Supabase bağlantısı aynen çalışır.
- Ücretli bir servis kullanılmaz. R2 ve KV kullanılmaz, kart bilgisi gerekmez.
- Netlify ayarları yerinde kalır; iki yayın yolu birbirini etkilemez.

## Ne değişti

| Dosya | Amaç |
| --- | --- |
| `wrangler.jsonc` | Worker adı (`kivancgroup`), statik dosyalar, Cloudflare Images bağlantısı, gizli olmayan ortam değişkenleri |
| `open-next.config.ts` | Adaptör ayarı. Bütün sayfalar istek anında üretildiği için önbellek deposu yok. |
| `scripts/cloudflare-build.mjs` | `npm run cf:build`: fotoğraf listesi, OpenNext derlemesi, dosya boyutu kontrolü |
| `scripts/product-media-manifest.mjs` | `public/products` klasörlerinin listesini derleme anında `src/lib/product-media.manifest.json` dosyasına yazar. Worker çalışırken diske erişemez. |
| `scripts/cloudflare-postbuild.mjs` | 25 MB'tan büyük dosyaları yüklemeden çıkarır (`.assetsignore`). Listede olmayan büyük bir dosya varsa derlemeyi durdurur. |
| `cloudflare/large-documents.json` | 25 MB sınırını aşan 5 PDF. Cloudflare'de bu adresler kivancgroup.com'daki aynı belgeye yönlendirilir (302). |
| `src/lib/deployment.ts` | `CLOUDFLARE_WORKER` değişkeni, sunucusuz barındırma olarak tanınır. |
| `src/lib/product-media.ts` | Cloudflare'de klasörü okumak yerine derleme anındaki listeyi kullanır. |
| `src/app/paylasim/route.tsx` | Paylaşım görseli yazı tipini ve logoyu Cloudflare'de statik dosyalardan okur. |

## 1. Cloudflare hesabı

1. https://dash.cloudflare.com/sign-up adresinden ücretsiz hesap açın.
2. Hesap açılınca **Workers & Pages** bölümüne girin. İlk girişte bir `*.workers.dev` alt adı seçmeniz istenir, örneğin `kivancgroup`.

## 2. GitHub deposunu bağlama (Workers Builds)

1. **Workers & Pages → Create → Import a repository** yolunu izleyin ve GitHub hesabınızı (kestrturkiye-rgb) bağlayın.
2. `kestrturkiye-rgb/deneme` deposunu seçin.
3. Ayarları şöyle girin:

| Alan | Değer |
| --- | --- |
| Project name | `kivancgroup` (`wrangler.jsonc` içindeki `name` ile aynı olmalı) |
| Production branch | `main` |
| Build command | `npm run cf:build` |
| Deploy command | `npx wrangler deploy` |
| Root directory | `/` |

4. **Build variables** bölümüne `NODE_VERSION = 24` ekleyin.

## 3. Gizli değişkenler

Bu değerleri **Settings → Variables and Secrets** bölümünde **Secret** (gizli) olarak girin. Değerleri sohbete, GitHub'a ya da `wrangler.jsonc` dosyasına yazmayın.

| Ad | Değer |
| --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` anahtarı |
| `CMS_BOOTSTRAP_PASSWORD` | Netlify'dakiyle aynı geçici yönetici parolası |
| `SITE_ORIGIN` | Cloudflare'in verdiği adres, örneğin `https://kivancgroup.<alt-ad>.workers.dev` (sonunda `/` olmadan) |

`SUPABASE_URL`, `SUPABASE_STORAGE_BUCKET`, `SITE_NOINDEX` ve `CMS_BOOTSTRAP_USERNAME` gizli değildir ve `wrangler.jsonc` içinde zaten tanımlıdır.

Değişkenleri ekledikten sonra **Deployments → Retry deployment** ile yeniden yayınlayın.

## 4. Kontrol listesi

1. Ana sayfa, menüler ve bir ürün sayfası açılıyor mu? 360° görüntüleyici dönüyor mu?
2. Bir katalog PDF'ine tıklayın. Büyük PDF'ler kivancgroup.com'a yönlendirilir.
3. `/admin` girişini ve bir içerik değişikliğini deneyin.
4. Bir deneme talebi gönderip **Gelen talepler** bölümünde göründüğünü kontrol edin, sonra silin.

## Sınırlar (ücretsiz plan)

- Günde 100.000 istek.
- İstek başına 10 ms işlemci süresi. Supabase'i beklerken geçen süre bu hesaba katılmaz.
- Sıkıştırılmış Worker kodu en fazla 3 MiB.
- En fazla 20.000 statik dosya, dosya başına en fazla 25 MiB.
- Cloudflare Images ile ayda 5.000 farklı görsel dönüşümü.

Güncel sınırlar için: https://developers.cloudflare.com/workers/platform/limits/

## Yerelde deneme

```bash
npm run cf:build
npm run cf:preview
```

Supabase anahtarı olmadan yerelde içerik varsayılan verilerle açılır. Gerçek veriyle denemek için anahtarı proje kökündeki `.dev.vars` dosyasına yazın (`SUPABASE_SERVICE_ROLE_KEY=...`). Bu dosya GitHub'a gönderilmez.
