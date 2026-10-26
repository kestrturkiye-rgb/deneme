# Yayın hazırlığı ve doğrulama

26 Ekim 2026 tarihinde geliştirme ortamında tamamlandı. Uygulama Vercel için hazırlandı; gerçek Vercel ve Supabase hesabına erişim bulunmadığından yayın ve gerçek proje bağlantısı bu ortamdan yapılmadı.

## Tamamlananlar

- Ürün listeleri fotoğraflı kartlara dönüştürüldü. Ürüne yüklenen fotoğraf katalog ve ana sayfa kartlarına yansır; mevcut olmayan görselin yerine dekoratif grafik kullanılır.
- Kurumsal ve Ar-Ge sayfaları görselli açılışlar, kurum bilgileri, faaliyet kartları ve süreç anlatımıyla yenilendi. Marka sahneleri temsili olarak etiketlidir; gerçek tesis fotoğrafı veya test sonucu olarak sunulmaz.
- Haberlere ayrı detay adresleri, fotoğraf/alt yazı/içerik paragrafları alanları ve fotoğrafsız haberler için tarih grafikleri eklendi.
- Mobilde ürün başlığı galerinin önüne alındı. Sabit teklif düğmesi seçilen ürün/parça/renk/bileşimi doğrudan talep formuna taşır. Çoklu ürün teklif sepeti korunur.
- Küçük metinler büyütüldü, düşük kontrastlı etiketler düzeltildi. Yerel görseller AVIF/WebP, web fontları WOFF2 olarak sunulur; font kaynakları ve lisansları korunur.
- Sayfaya özel canonical adresleri ve çalışan sosyal paylaşım görselleri eklendi. Vercel preview ortamları indekslemeye kapatıldı; yayın ve alan adı kökü otomatik/ayarlanabilir tutuldu.
- Talep formları gelen kutusuna kalıcı kayıt yapar. E-posta bildirimi isteğe bağlıdır; bildirim başarısız olsa da kayıt korunur. Panelden okundu durumu ve silme yönetilir.
- Vercel'de hesap, içerik, yayın geçmişi, ortak giriş sınırları ve talepler Supabase veritabanında; dosyalar Storage'da saklanır. İmzalı doğrudan yükleme Vercel'in fonksiyon boyutu sınırını aşmadan 10 MB'a kadar dosya kabul eder. Sunucu dosyanın imzasını ve boyutunu kontrol eder. Medya kütüphanesi sayfalanır.
- İlk bulut hesabı özel bootstrap değişkenlerinden oluşturulabilir. Mevcut hesap ezilmez; geçici parola ilk girişte değiştirilir. Bu ortamdaki mevcut yönetici hesabı korunmuştur; kimlik dosyası Git'e eklenmez.

## Test sonuçları

- `npm run build`: başarılı.
- `npm run typecheck`: başarılı.
- `npm run test:assets`: **9 kontrol başarılı**; dosya imzası/boyut/zaman aşımı, yarım dosya bırakmama, bozuk önbelleği düzeltme, yapı envanteri ve Vercel statik belge kullanılabilirliği.
- Playwright destekli `npm run test:cms`: **40 kontrol başarılı**. Giriş, geçici parola, oturum yenileme, CSRF, taslak/yayın/önizleme, doğrulama, sürüm çakışması, yüklemeler, dinamik ürün/sayfa, haber detayları, paylaşım görseli, katalog fotoğrafı, gelen kutusu, ceket/pantolon, malzeme/renk, gerçek kare dizisiyle 360° sürükleme/klavye/dokunma, tam ekran, mobil teklif ve sepet akışları kontrol edildi.
- Playwright destekli `npm run test:cloud`: **13 kontrol başarılı**. Gerçek PostgreSQL motoru PGlite ve yerel Supabase REST/Storage sözleşme servisi kullanıldı. Anonim erişim engeli, iki uygulama işlemi arasında kalıcılık, eşzamanlı yazma koruması, ortak giriş sınırı, şifre değişikliği, bootstrap, imzalı yükleme, bozuk dosyanın reddi ve 5 MB görsel/video dosyasının API'ye taşınmadan tarayıcıdan yüklenmesi doğrulandı. **Bu testler gerçek Supabase/Vercel hesabına bağlanmaz.**
- **225 sayfa**, masaüstü ve 390 px mobil genişlikte tarandı. **1.116 yerel bağlantıda** hata bulunmadı. 427 yerel görsel adresi kontrol edildi. Sayfa taşması, hata ekranı, bozuk mevcut yerel görsel adresi veya tarayıcı çalışma hatası görülmedi. Olmayan sayfa/ürün adresleri 404 döndürür.
- Derleme bağımlılık listelerinde özel `.cms/` hesabı/verisi bulunmadığı kontrol edildi. Test hesapları ve örnek dönüş kareleri geçici alanlarda kullanılıp kaldırıldı.

## Kullanıcı hesabında tamamlanacak yayın adımları

[VERCEL-KURULUM.md](VERCEL-KURULUM.md) dosyası gerçek Supabase projesini oluşturma, SQL kurulumu, özel Vercel değişkenleri, ilk yönetici girişi ve sonradan kivancgroup.com'a geçiş adımlarını içerir. Bu bağlantı tamamlanmadan bulut yönetimi ve talep kaydı hazır kabul edilmemelidir; yapılandırılmamış Vercel ortamı yalnızca site önizlemesini sunar.

Kaynak sitedeki 133 modelin teknik içeriği, 509 kaynak görseli ve 136 PDF aktarılmıştır. Kaynakta bulunmayan gerçek 360° dizileri panelden tamamlanacaktır. Var olmayan beden, kumaş, sertifika veya test sonucu uydurulmadı. İsteğe bağlı gerçek e-posta teslimatı, hizmet hesabı bağlandıktan sonra yayın adresinde doğrulanmalıdır.

## Kaynak siteyle karşılaştırma

[AKTARIM-RAPORU.md](AKTARIM-RAPORU.md), 237 kaynak sayfanın değerlendirmesini ve aktarılan içeriği açıklar. Ham URL/dosya/hash envanteri `SOURCE-MIGRATION.json` içindedir. Site kimliğinin mutlak adresini korumaya ilişkin aktarım hatası ve menünün hover sonrası ilk tıklamada kapanması bu kontrolde giderildi.

Menü ve aktarım testi: ana menünün sekiz başlığı, üç faaliyet alanı, kurumsal alt menü, fare/klavye kapatma, telefon menüsü, model kartı/ön-arka galeri, belge araması ve boş sonuç durumu doğrulandı. **322 eski adresin tamamı** beklenen kalıcı yönlendirmeyi döndürdü. Son fonksiyon dosya izlerinde sabit katalog/fotoğraf ve özel CMS dosyası yoktur; birleşik bağımlılık boyutu yaklaşık 67,5 MB ölçüldü. 8 sayfalık güncel ekran görüntüsü PDF’si `goruntuler/aktarim-sonrasi-site.pdf` içindedir.

## Koyu arka plan güncellemesi · 26 Ekim 2026

Örnekteki ürün sahnesiyle uyumlu antrasit sayfa, kart ve form zeminleri uygulandı. Katalog, haberler, belgeler, kurumsal içerik, ürün detayları ve teklif/iletişim yüzeylerinde radyal ışık ve açık metin paleti kullanılır. Arka plan ışık tonu CMS tasarım alanından değiştirilebilir. Metin, kenarlık, bağlantı, hata ve başarı renkleri koyu zemine uyarlandı. Sepet rozeti ve atlama bağlantısı, yüzey renginden bağımsız beyaz metin kullanır.

Derleme ve TypeScript kontrolü geçti. 225 sayfa, 1.116 yerel bağlantı ve 427 görsel adresi tarandı; hata ekranı, taşma, bozuk bağlantı veya büyük açık renkli arayüz yüzeyi bulunmadı. Masaüstü ve 390 px mobil ekranlar incelendi. Sayfa/kart zeminleri taramasının kapsamı CSS yüzeyleridir; kaynak fotoğraflara gömülü beyaz pikseller değildir. Kaynak fotoğrafların renklerine veya içeriğine müdahale edilmedi.

Koyu form hata/başarı durumu tarayıcıda yakalanan örnek yanıtlarla kontrol edildi; gerçek talep oluşturulmadı. Tam ekran ürün galerisi ve normal görsel renkleri, telefon belge araması, menü ve eski adres yönlendirmeleri kontrol edildi. Güncel ekran görüntüleri `goruntuler/koyu-tasarim.pdf` dosyasındadır.

## Banner video desteği · 26 Ekim 2026

Her açılış hikâyesine panelden ayrı MP4/WebM videosu seçilebilir. Video başladığında kapak görselinin üzerine yumuşak geçişle açılır; sessiz, döngüde ve mobilde sayfa içinde oynar. Klavye ve dokunmayla erişilen durdur/oynat düğmesi vardır. Banner ekran dışında veya sekme gizliyken oynatma durur. Azaltılmış hareket ve veri tasarrufu tercihlerinde ziyaretçi açıkça başlatana kadar video indirilmez. Oynatma engeli veya dosya hatasında kapak görseli kalır.

Medya kütüphanesi, yerel sunum, buluta aktarım ve Supabase yükleme izinleri MP4/WebM için genişletildi. Boyut sınırı 10 MB olarak korunur. Yerel video sunumu byte-range/HEAD destekler. Eski içerikler yeni alanlar olmadan da kaydedilebilir. Daha önce kurulmuş Supabase projesinde güncel kurulum SQL'i yeniden çalıştırılmalıdır.

Üretim derlemesi başarılı; 40 CMS, 13 bulut sözleşmesi ve 13 video kontrolü geçti. Video testleri FFmpeg ile geçici renk desenli klipler ve ayrı bir yönetici hesabı oluşturur; gerçek kurumsal içerik olarak kullanılmaz. Masaüstü ve 390 px mobil görüntüler incelendi. Test dosyaları ve hesapları temizlendi. Gerçek kurumsal video henüz seçilmediğinden varsayılan banner mevcut fotoğrafları gösterir.

## Ücretsiz canlı deneme hedefi: Netlify · 26 Ekim 2026

Kullanıcı ilk aşamada ücretsiz bir canlı test adresi istedi. Seçilen yol Netlify Free + Supabase Free; ücretli abonelik veya alan adı işlemi başlatılmadı. `NETLIFY-KURULUM.md`, `netlify.toml` ve sürümü sabitlenmiş Next.js Runtime 5.16.4 eklendi. Mevcut Vercel yapılandırması da korunur. Netlify/Lambda ortamında veri deposu bağlı değilken geçici diske CMS kaydı yapılmaz. Belge bağlantıları fonksiyon dosya sistemi yerine doğrulanmış PDF envanterini kullanır. Netlify site adresi metadata kökü olarak desteklenir; deploy-preview/branch-deploy indekslenmez.

`netlify build --offline --context production` üretim derlemesi ve fonksiyon paketlemesi başarılı. Oluşan fonksiyon dosyaları toplamı yaklaşık 83,2 MB; özel `.cms` kayıtları, kaynak PDF'ler ve büyük statik fotoğraf klasörü fonksiyona dahil değil. 40 CMS kontrolü, Netlify ortam değişkenleriyle 14 bulut sözleşmesi kontrolü, Vercel regresyonu için 13 bulut kontrolü ve 10 varlık/belge kontrolü geçti. Bulut testlerinde gerçek PostgreSQL motoru ve yerel sağlayıcı sözleşme servisi kullanılır; gerçek hesaplara bağlanılmaz.

Ek yerel `netlify serve` çalışma testi tamamlanamadı: CLI önce kullanılmayan Edge ortamının bootstrap dosyasını indirmek istedi; uygulamanın Edge fonksiyon listesi boştur. Bu yerel bileşen kapatılarak Node fonksiyonu denendiğinde CLI'nin Blobs ortamında `deployID` eksikliği 500 yanıtına yol açtı. Bu çalışma testi başarılı olarak sayılmadı. Gerçek Netlify hesabı/yayın bağlamında fonksiyon çalışması ayrıca doğrulanmalıdır; başarılı paketleme bu kontrolün yerini tutmaz.

Netlify CLI hesabı kullanıcı tarafından yetkilendirildi ve sağlayıcı API'sinde hesabın Free planda olduğu doğrulandı. `kivancgroup-deneme` adlı deneme projesi oluşturuldu; hedef adres `https://kivancgroup-deneme.netlify.app`. Bu adres için henüz başarılı bir yayın yoktur. `SITE_ORIGIN` ve `SITE_NOINDEX=true` değişkenleri ayarlandı; deneme ortamının indekslenmemesi için açık ortam bayrağı da desteklenir.

Yerel CLI yayını, Netlify'ın kendi depolama sunucusuna dosya gönderirken engellendi. Netlify API çağrıları 200 dönerken `cmh-services-prod-netliblob-935421240257.s3.us-east-2.amazonaws.com` adresi ağ vekilinden CONNECT 403 döndürüyor. Ek ağ izni istemi onaylandı ancak ortamın egress kuralı değişmedi. İlgili tek depolama alan adı, mevcut hedefler korunarak ortam taslağına eklendi; araç `requires_publish: true` döndürdü. Kullanıcı ayarları kaydedip ortamı yayımladıktan sonra bu hedefe erişim ve dosya yükleme yeniden denenmelidir. İmzalı depolama URL'leri ve giriş anahtarları kayda yazılmadı.

Alternatif olarak GitHub üzerinden sağlayıcı derlemesi denendi. Depo bağlantısı ayarlandı, ancak sağlayıcı hazırlık aşamasında SSH host-key doğrulaması başarısız oldu. Doğrulama kapatılmadı. Tekrarlayan başarısız otomatik derlemeleri önlemek için otomatik build durduruldu; yerel CLI ile manuel yayın yolu korunur. Kullanıcının isteğiyle Supabase erişim anahtarı oluşturma adımı Netlify yayın sorunu çözülene kadar ertelendi. Bu nedenle gerçek admin/veri/form bağlantısı ve gerçek canlı fonksiyon testi hâlâ tamamlanmalıdır. Ücretli plan, özel alan adı veya DNS değişikliği yapılmadı.

## Başarılı canlı deneme yayını · 26 Ekim 2026

**https://kivancgroup-deneme.netlify.app** Netlify Free hesabında yayınlandı. Başarılı son deployment kimliği `6adf5ceac8d270f5df2036f4`. Ağ değişikliğinden sonra Netlify'ın imzalı S3 yükleme adresine erişim açıldı ve dosyalar gönderilebildi. Yeni deneme projesindeki varsayılan Netlify giriş koruması yalnızca bu proje için kaldırıldı; site giriş yapmadan görüntülenebilir.

İlk paket yüklemesinde Next.js işlevleri çalışırken CSS/JS ve bazı belgeler 404 döndürdü. `--no-build` yayınının `.next` yerine adaptörün hazırladığı `.netlify/static` dizininden yapılmasıyla giderildi. Son yayında 767 statik dosya, yaklaşık 566,4 MB içerik ve 136 PDF bulunur. Statik dosyalara özel `.cms` verileri veya `admin.json` dahil değildir.

Gerçek HTTPS adresinde ana sayfa, üç faaliyet sayfası, kurumsal, Ar-Ge, haberler, haber detayı, iletişim, teklif, admin kabuğu, Maximus 2.0 ürün sayfası, dokümanlar, site haritası ve paylaşım PNG'si açıldı. CSS ve JavaScript dosyaları 200 döndürür; SHA-256 değerleri derlenen dosyalarla aynıdır. Logo ve örnek optimize görseller 200 döndürür. Örnek PDF byte-range isteği 206, `application/pdf` ve gerçek `%PDF-` imzası döndürür. Üç eski adres beklenen 308 yönlendirmelerini döndürdü. `SITE_NOINDEX=true` ile ana sayfanın robots metadatası `noindex,nofollow`, robots.txt dosyası `Disallow: /` içerir.

Canlı Chromium kontrolü çalışma ortamının HTTPS vekil sertifikasına güvenmediği için başlatılamadı; TLS doğrulaması kapatılmadı. Yukarıdaki canlı doğrulamalar, sağlanan CA ile HTTPS sertifikasını doğrulayan Node/curl istekleridir. Masaüstü/mobil tarayıcı akışlarının önceki yerel 40 CMS kontrolü geçerlidir; bu yeni canlı Chromium kontrolü başarılı sayılmadı.

`/api/admin/auth` gerçek yayında `configured:false, backend:unconfigured` döndürür; özel içerik API'si oturumsuz isteğe 401 verir. Supabase henüz bağlanmadığından yönetici girişi ve form kayıtları etkin değildir. Kullanıcının isteğiyle bu anahtar, deneme yayını açıldıktan sonra birlikte oluşturulacaktır. Ücretli abonelik başlatılmadı ve kivancgroup.com DNS kayıtlarına dokunulmadı.
