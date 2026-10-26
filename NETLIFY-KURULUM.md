# Ücretsiz canlı deneme yayını

Bu siteyi **Netlify Free + Supabase Free** ile bir `*.netlify.app` adresinde deneyebilirsiniz. Alan adı satın almak gerekmez. Kalıcı admin hesabı, içerikler, talepler ve yeni medya Supabase'de tutulur. Netlify için Next.js adaptörü, Node.js 24 ve yayın yapılandırması depoya eklenmiştir. Vercel zorunlu değildir.

Ücretsiz planlar sınırsız değildir. Güncel kredi, depolama ve trafik kotalarını hesap ekranında kontrol edin: [Netlify Free](https://www.netlify.com/pricing/) ve [Supabase Free](https://supabase.com/pricing). Limitler dolduğunda yayın/dosya erişimi kısıtlanabilir; Supabase'in etkin olmayan ücretsiz projeleri duraklatılabilir. Pro/ücretli plan seçmeyin. Yeni bir alan adı ve ücretli e-posta servisi bu deneme için gerekli değildir. E-posta servisi olmadan da talepler panelde kaydedilir.

## 1. Ücretsiz Supabase projesi

[Supabase](https://supabase.com/dashboard) hesabında **Free** planla bir proje oluşturun. **SQL Editor** içinde [supabase/setup.sql](supabase/setup.sql) dosyasının tamamını çalıştırın. Bu, özel içerik kayıtlarını, ortak oturum sınırlarını ve herkese açık `site-media` dosya deposunu kurar. Dosya sınırı 10 MB'dır; JPG/PNG/GIF/WebP/AVIF/PDF/MP4/WebM desteklenir.

Project URL ve sunucuya özel legacy `service_role` anahtarı sonraki adımda kullanılacak. Anahtarı sohbete veya GitHub'a yazmayın. Önceden kurulmuş bir Supabase projesi varsa aynı SQL yeniden çalıştırılabilir; mevcut kayıtlar korunur.

## 2. GitHub deposunu Netlify'a bağlama

[Netlify](https://app.netlify.com/start) üzerinde **Free** planı seçin. GitHub'dan `kestrturkiye-rgb/deneme` deposunu içe aktarın. Uygulama dalı **main** olmalıdır; eski PDF dalı `site-goruntuleri` seçilmemelidir. Kök klasör depo kökü, build komutu `npm run build`, publish klasörü `.next` olur. `netlify.toml` ve sürümü sabitlenmiş Next.js adaptörü bu ayarları içerir. Site adını örneğin `kivancgroup-deneme` yapın; Netlify size uygun bir `.netlify.app` adresi verecektir.

Yalnızca görselleri/HTML'i sürükleyip bırakma yöntemiyle yayınlamayın: admin, dinamik ürün sayfaları ve talep formu sunucu fonksiyonlarına ihtiyaç duyar.

## 3. Özel ortam değişkenleri

Netlify projesinin sunucu fonksiyonlarına ve build işlemine açık ortam değişkenlerine aşağıdakileri girin:

| Ad | Değer |
| --- | --- |
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Sunucuya özel legacy `service_role` anahtarı |
| `SUPABASE_STORAGE_BUCKET` | `site-media` |
| `SITE_ORIGIN` | Verilen gerçek `https://...netlify.app` adresi; sonunda `/` olmadan |
| `CMS_BOOTSTRAP_USERNAME` | `yonetici` |
| `CMS_BOOTSTRAP_PASSWORD` | İlk girişte değiştirilecek, en az 12 karakterlik geçici parola |

`NEXT_PUBLIC_` önekli gizli anahtar oluşturmayın. Ortam değişkenlerini ekledikten sonra yeni bir deploy başlatın. `SITE_ORIGIN` giriş ve formlardaki kaynak kontrolü ile canonical/paylaşım adreslerinin doğru olması için önemlidir. Netlify'ın `URL` değişkeni de otomatik site adresi olarak desteklenir.

Yerel yönetici hesabını aynen aktarmak için alternatif: çalışma ortamında Supabase bağlantısı güvenli biçimde ayarlandıktan sonra mevcut `npm run cms:import` komutu hesabı, varsa içerikleri ve yüklemeleri aktarabilir. Mevcut bulut kayıtlarını izinsiz değiştirmek için `--replace` kullanmayın. `.cms/` klasörünü siteye veya GitHub'a yüklemeyin.

## 4. Canlı test

1. Netlify'ın verdiği HTTPS adresinde ana sayfa, menüler, ürün sayfası ve PDF bağlantısını açın.
2. `/admin` adresinden giriş yapıp geçici parolayı değiştirin. Boş varsayılan hesap/parola yoktur.
3. Bir fotoğraf veya kısa MP4/WebM yükleyip taslak önizlemesini kontrol edin. Banner videosu **Ana sayfa · Karşılama** bölümündedir.
4. Örnek bir talep gönderip **Gelen talepler** içinde göründüğünü kontrol edin; sonra deneme kaydını kaldırın.
5. Yeniden deploy sonrasında hesabın, içeriğin ve yüklemelerin korunduğunu kontrol edin.

Gerçek bağlantı yoksa uygulama talep almış gibi davranmaz ve geçici fonksiyon diskine yazmaz. Sadece sayfaların görünmesi admin deposunun kurulduğunu kanıtlamaz. Deploy-preview ve branch-deploy adreslerinde arama motoru indeksleme kapalıdır. Canlı yayın doğrulaması gerçek hesap bağlantısı ve gerçek Netlify adresi gerektirir.

## Geliştirme ortamından yayınlama

Bu çalışma ortamından sizin adınıza yayın yapabilmem için `NETLIFY_AUTH_TOKEN` ve `SUPABASE_ACCESS_TOKEN` güvenli ortam alanlarından eklenmelidir; anahtar değerlerini sohbete göndermeyin. Önceki Vercel anahtarı Netlify için kullanılmaz. İzinli ağ hedefleri `api.netlify.com`, `*.netlify.app`, `api.supabase.com` ve oluşturulan projenin `*.supabase.co` adresini kapsamalıdır. Taslak ortam ayarlarını kaydetmek, kendi başına siteyi yayınlamaz.

Yerel uyumluluk kontrolü:

```bash
npm ci --cache /workspace/.npm-cache
npm exec --yes --cache /workspace/.npm-cache --package netlify-cli@27.14.2 -- netlify build --offline --context production
CMS_TEST_HOST=netlify CMS_BROWSER_MODULE=/tam/yol/playwright/index.mjs npm run test:cloud
npm run test:assets
```

Netlify CLI'nin yerel yapılandırma dizini salt okunur bir home altında kalıyorsa, komutu çalıştırırken `XDG_CONFIG_HOME=/workspace/.kivanc-deploy/config` ve `XDG_CACHE_HOME=/workspace/.kivanc-deploy/cache` kullanılabilir. Bu yerel testler gerçek Netlify/Supabase hesabına bağlanmaz ve canlı yayının yerini tutmaz.
