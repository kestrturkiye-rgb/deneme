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

## Ürün fotoğrafları · 26 Ekim 2026

Kullanıcı canlıda ürün fotoğraflarını göremediğini bildirdi. Orijinal ürün dosyaları erişilebilirken `/_next/image` bazı farklı ürün isteklerine aynı ana sayfa fotoğrafını döndürüyordu: örneğin 1000×1500 Maximus fotoğrafı yerine 1672×941 yangın sahnesi geliyordu. HTTP 200 kontrolü bu içerik hatasını yakalamıyordu.

Netlify için Next.js'in desteklenen özel görsel yükleyicisi eklendi. Fotoğraflar kaynak URL, genişlik ve kalite korunarak doğrudan `/.netlify/images` servisine gider. Netlify dışındaki derlemelerde mevcut Next.js görsel yolu kullanılır. Harici CMS fotoğrafları Netlify'da kaynak URL'lerinden açılır. Geçersiz `/.netlify` yönlendirmeleri eklenmez.

Kaynak site ve medya kütüphanesi yeniden kontrol edildi. Paulson 510-ARC-SN 12'nin kendi teknik broşüründeki özgün 358×358 ürün fotoğrafı değiştirilmeden çıkarıldı; eski mühendislik Yangın Battaniyesi kaydı aynı PROTEK ürününün kaynak galerisine bağlandı. Toplam 187 ürün/kategori kaydının 171'i fotoğraflıdır; 133 ayrı modelin tamamında görsel vardır. Kaynakta boş olan 16 kategori/bilgi kaydı için ürün fotoğrafı uydurulmadı. Kaynak, hedef, dosya özeti ve boş sayfa listesi `PRODUCT-PHOTOS.json` içindedir.

Netlify yayını `6adf6908d0ea8dee5622c589` ile güncellendi. 133 modelin 128 farklı ana fotoğraf dosyasının tamamı canlıda HTTP 200 ve görsel türü döndürdü. Yedi temsilî modelin görüntülenen resmi kaynaktaki fotoğrafla karşılaştırıldı: boy/en oranları doğru, ortalama piksel farkı 1,38–4,00 (0–255 ölçeği). Maximus, Paulson gözlük, PROTEK battaniye, çizme, baret, eldiven ve solunum seti kontrolleri geçti. Yeni `test:product-images` testi bu içerik karşılaştırmasını tekrarlar. Yerel 40 CMS regresyon kontrolü ve üretim/Netlify paketlemesi başarılıdır.

Masaüstü ürün sayfası, katalog ve 390 px mobil görünüm Chromium'da gerçek canlı içerikle kontrol edildi. Çalışma ortamının Chromium CA kısıtından dolayı tarayıcı, yukarı akıştaki HTTPS sertifikasını doğrulayan salt okunur yerel HTTP aktarımı üzerinden çalıştırıldı; TLS doğrulaması kapatılmadı, içerik/stil değiştirilmedi, POST istekleri aktarılmadı. Ürün fotoğrafı 792×1188 olarak doğru portre oranında yüklendi; taşma ve tarayıcı çalışma hatası bulunmadı.

## Supabase bağlantısı ve güvenlik güncellemesi · 27 Ekim 2026

Kullanıcının güvenli ortam alanına kaydettiği Supabase yönetim erişimi gerçek API çağrısıyla doğrulandı. `KivancGroup` organizasyonu Free planda oluşturuldu; `kivancgroup-deneme` projesi Frankfurt (`eu-central-1`), en küçük `nano` örneğiyle kuruldu. Ücretli abonelik başlatılmadı. `supabase/setup.sql` uygulandı; özel CMS kayıtları, ortak hız sınırları ve herkese açık `site-media` deposu hazırlandı. Yeni medya için sınır 10 MB'dır.

Yerel `yonetici` hesabı aynı kullanıcı adı, parola özeti, oturum imzalama sırrı ve ilk parola değiştirme zorunluluğu korunarak aktarıldı. Aktarım aracındaki `@next/env` CommonJS adlandırılmış import uyumsuzluğu Node.js 24 için düzeltildi. Kimlik dosyaları ve anahtarlar Git'e veya herkese açık site dosyalarına eklenmedi. `SUPABASE_URL`, sunucuya özel `SUPABASE_SERVICE_ROLE_KEY` ve `SUPABASE_STORAGE_BUCKET` Netlify ortamına kaydedildi. Mevcut CLI yetkisi kullanıldı; ek Netlify/Vercel anahtarı istenmedi.

Üretim derlemesi, Next.js 16.4.0 için bildirilen güvenlik açıkları nedeniyle durdu. Next.js aynı sürüm ailesindeki 16.4.3'e güncellendi ve kilit dosyası yenilendi. `npm audit --omit=dev` sıfır açık bildirdi. Normal üretim derlemesi ve Netlify paketlemesi geçti. Güncelleme sonrasında Playwright destekli **40 CMS** ve **14 Netlify bulut sözleşmesi** kontrolü başarılıdır; bu regresyonlar geçici hesaplar ve yerel sağlayıcı sözleşme servisini kullanır.

Gerçek Supabase projesinde **7 kontrol** geçti: anonim kayıt okuma/RPC/yükleme engeli, kalıcı kayıt ve eski sürümle yazma koruması, ortak hız sınırı, imzalı dosya yükleme ve birebir aynı fotoğrafı indirme, depo erişimi/türleri/boyut sınırı. Geçici kontrol kayıtları ve dosyaları kaldırıldı.

Canlı Netlify deployment: `6ae0577d99badef7892f7839`. Gerçek HTTPS adresinde **5 kontrol grubu** geçti: admin API'si `configured:true, backend:supabase` döndürür; taşınan hesabın geçerli imzalı oturumu tanınır ve ilk parola değişikliği zorunlu tutulur; özel API'ler anonim ve parola değişikliği tamamlanmamış erişimi engeller; iletişim ve teklif formları gerçek veritabanına kayıt yapar; ana sayfa, admin kabuğu ve gönderilen JavaScript dosyaları açılır ve sunucu anahtarını içermez. İki geçici form kaydının temizlendiği ayrıca doğrulandı. Bu canlı oturum kontrolü, mevcut hesabın parolasını değiştirmeden yapıldı; kullanıcının gerçek parolayla ilk giriş ve parola değiştirme işlemi kullanıcıya bırakıldı.

Yeni yayında yedi temsilî ürünün gerçek gösterilen fotoğrafları kaynak dosyalarla tekrar karşılaştırıldı; tamamı geçti. Git tarafından izlenen dosyalarda sunucu anahtarı, veritabanı parolası, yönetici oturum sırrı veya parola özeti bulunmadığı kontrol edildi.

İsteğe bağlı e-posta servisi bağlı değildir; talep kayıtları panelin gelen kutusu için saklanır. Gerçek 360° kare serileri ve kurumsal banner videosu henüz kullanıcı tarafından sağlanmamıştır. Deneme adresinin indekslenmemesi korunur ve kivancgroup.com DNS kayıtları değiştirilmedi.

## Sade ürün sahnesi ve Maximus açıları · 27 Ekim 2026

Bu bölüm, yukarıdaki bağlantı kontrolünden sonra sağlanan Maximus görsellerini ve yeni ürün tasarımını kapsar. Texport referansına göre tüm ürün detaylarında solda büyük ürün, sağda başlık/açıklama/teklif eylemi, koyu zemin ve hafif buğu kullanılan ortak düzen uygulandı. Uzun fotoğraf şeritleri ve ayrıntılı dönüş araçları açılır başlıklara alındı. Referans markanın ürün fotoğrafları kullanılmadı; ürünün mevcut özellikleri ve belgeleri korundu.

Maximus 2.0 için kullanıcının RAR dosyasındaki yedi görüntünün fonu kaldırıldı, silüetleri aynı ölçüde hizalandı ve 1000×1440 şeffaf WebP olarak hazırlandı. Karelerin toplamı **904.822 bayt**. Görsellerin içindeki özgün renk ve ürün detayları korunarak fon kenarları birleştirildi. Açılış 45° görünümüdür; halka ve sürükleme karelerin tanımlı `45, 90, 135, 180, 225, 270, 0` açılarını kullanır. Eksik 315° görüntüsü veya yeni ürün açısı üretilmedi. Yedi kareli dönüş kademelidir; daha akıcı sonuç için aynı çekim düzeninde 24–72 kare gerekir. Ceket ve pantolon için ayrı çekimler sağlanmadığından bu kayıt bütün takımı gösterir.

ALUSTAR ULTRA LIGHT, ALUSTAR, Cool Vest, ERIC içlik ve istasyon üniformasının **dokuz farklı fotoğrafı** da şeffaf WebP olarak hazırlandı; toplam **894.716 bayt**. Aynı fotoğrafları kullanan model, eski ad ve kategori kayıtları dahil **16 detay kaydındaki** görsel adresleri güncellendi. Bu, katalogdaki bütün fotoğrafların fonunun kaldırıldığı anlamına gelmez. Bu ürünlerin mevcut fotoğraf galerileri korundu; onlara olmayan dönüş kareleri eklenmedi. Yüklenen her dosyanın indirilen kopyası SHA-256 ile karşılaştırıldı. Canlı içerik sürümü **3**; önceki yayınlar geri alma geçmişinde tutuldu ve yayın sırasında sürüm çakışması kontrol edildi. Diğer metinler ve kullanıcı düzenlemeleri değiştirilmedi.

Doğrulama:

- Üretim derlemesi, TypeScript ve Netlify paketlemesi başarılı. Son görsel yerleşim yayını: **`6ae078a83432402079b80c89`**; adres: `https://kivancgroup-deneme.netlify.app`.
- Yeni açı doğrulaması dahil Playwright destekli **41 CMS kontrolü** ve **14 bulut sözleşmesi kontrolü** geçti. Bulut sözleşmesi kontrolleri gerçek hizmet hesabına bağlanmayan yerel sağlayıcı testleridir.
- Gerçek canlı Maximus sayfasında **7 kontrol grubu** geçti: ürün metni/10 özellik/3 belge, yedi karenin yüklenmesi, fare/klavye/açı halkası/kaydırıcı, oynatma/durdurma/tam ekran, fotoğraf-dönüş geçişi, başlangıçta sade kontroller ve mobil dokunma. Taşma veya tarayıcı çalışma hatası görülmedi.
- Netlify Free rozeti korunarak mobil teklif eylemine ayrı alan bırakıldı. 390×844 görünümde rozet, teklif düğmesi ve açı halkasının birbirini örtmediği ölçülerek doğrulandı. Ana teklif eylemi görünür olduğunda tekrarlanan sabit mobil çubuk gizlenir.
- Beş ek elbise sayfası 1440 ve 390 piksel genişlikte, toplam **10 sayfa/görünüm kontrolünde** geçti. Yüklenen doğru görsellerin açılması, mevcut galeride geçiş, doğal resim ölçüsü ve taşma/çalışma hatası kontrol edildi. Masaüstü Maximus, ALUSTAR, ERIC ve üniforma ekranları ayrıca görsel olarak incelendi.

Canlı tarayıcı kontrolleri, çalışma ortamının Chromium CA kısıtı nedeniyle yukarı akış HTTPS sertifikalarını doğrulayan salt okunur yerel aktarım ve yalnızca herkese açık medya adreslerine yönelik aktarım kullandı. İçerik veya stiller değiştirilmedi; TLS doğrulaması kapatılmadı. Test hesapları veya deneme dönüş kareleri canlı ürüne eklenmedi. Yönetim anahtarları ve işleme yardımcıları kaynak depoya alınmadı.
