# Vercel üzerinden yayınlama

Bu sürüm Vercel için kalıcı Supabase veritabanı ve dosya deposuyla hazırlanmıştır. Mevcut sitedeki fotoğraflar ve 136 PDF depoya dahil edilmiştir; yeni görseller ve 360° kareleri yayın sonrasında panelden eklenebilir. Vercel'e veya Supabase hesabınıza bu çalışma ortamından erişim bulunmadığı için aşağıdaki proje bağlantıları kullanıcı hesabınızda tamamlanmalıdır.

## 1. Kalıcı veri deposunu oluşturun

Supabase hesabınızda bir proje oluşturun. Projenin **SQL Editor** ekranında [supabase/setup.sql](supabase/setup.sql) dosyasının tamamını çalıştırın. Betik özel CMS kayıtlarını, ortak giriş sınırlarını ve `site-media` dosya deposunu oluşturur.

Yönetici hesabı, taslaklar, yayınlar ve gelen talepler yalnızca sunucu anahtarıyla okunabilir. Dosya deposu, sitede gösterilecek herkese açık görseller ve belgeler içindir. Tarayıcıya anonim veritabanı erişimi verilmez.

## 2. Projeyi Vercel'e aktarın

Uygulama kodu **`main` dalındadır**. Bu depoda eski PDF paylaşımı için oluşturulmuş `site-goruntuleri` dalı varsayılan görünebilir. İçe aktarmadan önce GitHub depo ayarlarındaki **Default branch** alanını `main` yapın. Vercel'deki Production Branch seçiminin de `main` olduğundan emin olun; PDF dalını uygulama kaynağı olarak seçmeyin.

Vercel'de **Add New → Project** yoluyla `kestrturkiye-rgb/deneme` deposunu seçin. Framework **Next.js**, kök klasör depo kökü, Node.js **24.x**, kurulum `npm ci`, derleme `npm run build` olmalıdır. `vercel.json` ve `package.json` bunları içerir.

**Environment Variables** bölümüne şu değerleri ekleyin:

| Değişken                    | Değer                                                                                               |
| --------------------------- | --------------------------------------------------------------------------------------------------- |
| `SUPABASE_URL`              | Supabase projesinin Project URL değeri                                                              |
| `SUPABASE_SERVICE_ROLE_KEY` | Projenin sunucuya özel legacy `service_role` anahtarı                                               |
| `CMS_BOOTSTRAP_USERNAME`    | `yonetici`                                                                                          |
| `CMS_BOOTSTRAP_PASSWORD`    | Sohbette verilen geçici yönetici parolanız; isterseniz en az 12 karakterlik başka bir geçici parola |

Bu değerleri Vercel'in özel ortam değişkeni ekranına girin. Sunucu anahtarını kaynak koduna veya `NEXT_PUBLIC_` değişkenlerine koymayın. `SUPABASE_STORAGE_BUCKET` isteğe bağlıdır; varsayılan `site-media` kullanılır.

Ardından **Deploy** seçin. Vercel size `https://...vercel.app` adresini verir. İlk yayın için `SITE_ORIGIN` eklemek gerekmez; site Vercel adresini otomatik kullanır.

## 3. İlk yönetici girişi

Yayın adresinin sonuna `/admin` ekleyin. Bulut veritabanında hesap bulunmuyorsa, yukarıdaki iki bootstrap değişkeninden geçici hesap otomatik oluşturulur. Aynı anda birden fazla Vercel işlemi başlasa da mevcut hesap ezilmez.

Kullanıcı adı ve geçici parolayla giriş yapınca kendi parolanızı belirleyin. Yeni parola bulut veritabanında saklanır; sonraki deploy işlemlerinde geçici parola hesabın üzerine yazılmaz. İlk kurulumdan sonra bootstrap değişkenlerini kaldırabilirsiniz; veritabanındaki hesap korunur.

Bu çalışma ortamında oluşturulan yerel hesap ve içerikleri aynen taşımak için alternatif yöntem: Supabase sunucu bağlantısını yerel `.env.local` içine ekleyip `npm run cms:import` çalıştırın. Betik `.cms/` hesabını, içerikleri, talepleri ve yüklemeleri aktarır; mevcut bulut kayıtlarını değiştirmez. Yerel `.cms/` klasörü bu ortamda bulunur ve Git'e dahil edilmez. `--replace` yalnızca mevcut bulut kayıtlarını bilerek değiştirmek için kullanılmalıdır.

## 4. Ürünleri ve görselleri yükleyin

Panelin **Ürün detayları** bölümünde aktarılan 133 modeli ve mevcut aileleri düzenleyebilirsiniz. Yeni fotoğrafları ve gerçek 360° karelerini buradan yükleyin. Yükleme tamamlandıktan sonra taslağı kaydedip önizleyin ve yayınlayın. Ürün fotoğrafları katalog kartlarında da görünür. Ceket, pantolon ve renkler için ayrı kare dizileri kullanılabilir.

Vercel'de dosyalar uygulama fonksiyonundan geçirilmez: tarayıcı, yönetici oturumu doğrulandıktan sonra verilen imzalı bağlantıyla doğrudan Supabase'e yükler. Böylece 10 MB'a kadar dosyalar Vercel'in fonksiyon istek boyutu sınırına takılmaz. Sunucu tamamlanan yüklemenin boyutunu ve dosya imzasını kontrol eder.

İletişim ve teklif talepleri **Gelen talepler** bölümünde tutulur. E-posta bildirimi isteğe bağlıdır: `RESEND_API_KEY`, doğrulanmış gönderici `CONTACT_FROM` ve isteğe bağlı `CONTACT_TO` değerlerini Vercel'e ekleyip yeniden deploy edin. E-posta bildirimi başarısız olsa da talep kaydı korunur.

## 5. Yayın adresinde kontrol edin

- `/admin` girişi ve ilk parola değişikliği.
- Bir ürün fotoğrafı yükleyip taslakta önizleme ve yayınlama.
- Formdan deneme talebi bırakıp **Gelen talepler** bölümünde görme.
- Yeni deploy sonrasında hesap, içerik ve dosyaların korunması.
- Telefonda ürün galerisi, sabit teklif düğmesi ve gerçek kareler yüklendiyse 360° dönüş.

Yerel otomatik testler ve servis sözleşmesi testleri gerçek Vercel/Supabase hesabınızın bağlantı kontrolünün yerini tutmaz. Gerçek proje bağlantısını bu adım doğrular.

## 6. Daha sonra kivancgroup.com'a geçiş

Vercel projesinin **Settings → Domains** ekranına alan adını ekleyin ve Vercel'in gösterdiği DNS kayıtlarını uygulayın. Aynı projeyi ve Supabase deposunu kullanacağınız için içerikleri yeniden taşımanız gerekmez.

Ana adresi belirledikten sonra Vercel'e `SITE_ORIGIN=https://kivancgroup.com` (www kullanacaksanız tam www adresi) ekleyin ve yeniden deploy edin. Site haritası, canonical ve paylaşım adresleri bu kökü kullanır. Alternatif www/non-www adresini Vercel üzerinden ana adrese yönlendirin. Eski sitedeki adreslerin korunması veya gerektiğinde 301 yönlendirmeleri alan adı geçişinde ayrıca kontrol edilmelidir.

Preview ortamlarında arama motoru indeksleme kapalıdır; Production yayını normal site haritasını sunar. Yönetim paneli ve API yolları indekslemeye kapalı kalır.

## Aktarılan sabit dosyalar

Mevcut fotoğraflar ve kataloglar `public/` altında Git ile taşınır. Vercel bunları statik olarak sunar; büyük PDF ve kaynak görsel klasörleri sunucu fonksiyonlarına dahil edilmez. PDF kullanılabilirliği derleme sırasında oluşturulan `src/cms/bundled-documents.json` envanteriyle doğrulanır. İlk deploy için `npm run assets` çalıştırmanız gerekmez. Panelden sonradan eklenen dosyalar Supabase Storage üzerinde tutulur.
