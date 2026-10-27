# Kıvanç Group içerik yönetimi

## İlk çalıştırma

Node.js 24 kullanın. Ücretsiz canlı deneme için [NETLIFY-KURULUM.md](NETLIFY-KURULUM.md), Vercel alternatifi için [VERCEL-KURULUM.md](VERCEL-KURULUM.md) dosyasını izleyin.

```bash
cd /workspace/deneme
npm ci --cache /workspace/.npm-cache
npm run admin:setup
npm run dev
```

`admin:setup` komutu kullanıcı adını ve en az 12 karakterlik parolanızı terminalde sorar.
Parola yazarken gösterilmez; sunucuda scrypt özeti saklanır. Hazır veya varsayılan parola yoktur.
Sitenin `/admin` adresine gidin ve oluşturduğunuz hesapla giriş yapın.
Parolayı değiştirmek ve tüm mevcut oturumları geçersiz kılmak için:

```bash
npm run admin:setup -- --reset
```

Başka birine teslim edilecek geçici hesap için `npm run admin:setup -- --temporary` kullanın (mevcut hesapta `--reset --temporary`). Bu hesap ilk girişte kendi parolasını belirlemeden içeriklere ve dosyalara erişemez. Normal kullanımda panelin **Hesap ve parola** bölümünden mevcut parolanızı girerek yeni parolanızı belirleyebilirsiniz. Parola değişikliği diğer bütün oturumları geçersiz kılar; değişikliği yaptığınız oturum açık kalır.

## Panelde neler var?

- **Gelen talepler:** iletişim ve teklif kayıtları; okundu/okunmadı durumu, iletişim bilgileri, ürünler ve e-posta bildirimi durumu.
- **Genel bakış:** içerik sayıları, yayın durumu ve hızlı erişim.
- **Üst menü ve duyurular:** kayan yazılar, logo, bağlantılar, arama alanı, telefon ve e-posta.
- **Ana sayfa:** karşılama görseli/metinleri/düğmeleri, kurumsal bilgiler, faaliyet kartları, kalite ve iş ortakları.
- **Ana sayfa sırası ve görünürlük:** bölümleri yukarı/aşağı taşıma ve gizleme.
- **Bölümler ve ürün listesi:** bölüm, kategori ve ürün ekleme/silme/sıralama. Ürünün adı ile adresi ayrı alanlardır; adı değiştirmek adresi değiştirmez. `slug` alanını değiştirirseniz detay kaydının anahtarı da değişeceği için önce içeriği yedekleyin; yeni adreste “Mevcut bir üründen içerik kopyala” ile eski kaydı aktarabilirsiniz. Aynı ürün adresi iki kez kullanılamaz.
- **Ürün detayları:** açıklamalar, özellikler, başlıklı bölümler, modeller, teknik tablolar, görseller, katalog/sertifika bağlantıları ve 360° kareleri. İsteğe bağlı alanlar “Alanı ekle” ile açılır.
- **Haberler, mevzuat, dokümanlar, videolar, kariyer:** kayıt ekleme, düzenleme, kopyalama, kaldırma ve sıralama.
- **Sayfalar:** kurumsal, tarihçe, Ar-Ge, satış kanalları, iletişim, gizlilik ve diğer mevcut sayfaların metinleri ve SEO bilgileri.
- **Yeni sayfalar:** adres, başlık, SEO açıklaması ve metin/görsel/düğme bloklarıyla yeni bir sayfa oluşturma. Sayfayı görünür yapıp yayınlayın; isterseniz üst/alt menüye bağlantısını ayrıca ekleyin.
- **Renkler, yazı ve görünüm:** ana renkler, yazı tipleri, temel yazı boyutu, içerik genişliği, düğme köşeleri ve gelişmiş CSS.
- **Medya kütüphanesi:** en fazla 10 MB JPG, PNG, GIF, WebP, AVIF, PDF, MP4 ve WebM yükleme. İlgili alanda “Medya kütüphanesinden seç” ile kullanma. Çok kareli 360° içerikte karelerin sırasını listede belirleyin. Dosyalar herkese açık sunulur; gizli belge yüklemeyin.
- **Sürüm geçmişi ve yedek:** son 10 yayını taslağa geri alma, JSON dışa/içe aktarma.

Listelerdeki oklarla sıralayın; kopyalama düğmesiyle benzer bir kayıt oluşturun. İç içe kayıtları açarak alt alanları düzenleyin. Arama kutusu hem bölüm adında hem içerik değerlerinde arar.

## Taslak ve yayın

1. Alanları düzenleyin. Değişiklikler bu aşamada yalnızca tarayıcıdadır.
2. **Taslağı kaydet:** sunucuya kaydeder, ziyaretçilerin gördüğü içeriği değiştirmez.
3. **Taslağı önizle:** taslağı kaydedip gerçek site üzerinde, yalnızca giriş yaptığınız oturumda gösterir. Banttan yönetime dönün. Paneldeki “Siteye git” önizlemeyi kapatır.
4. **Yayınla:** içeriği ziyaretçilere açar. Yeni metinler, ürünler ve özel sayfalar için tekrar derleme gerekmez.

Aynı anda iki oturum düzenlerse eski sürümün yeni kaydı ezmesi engellenir. Çalışmanızı JSON olarak indirdikten sonra “Sunucudaki taslağı yükle” ile güncel kaydı alın.

Geri alma önce taslağı değiştirir; canlı içeriği değiştirmek için ayrıca yayınlayın. Varsayılan kod içerikleri başlangıç değerleridir; panel kayıtları kod dosyalarını değiştirmez.

## Canlı sunucu ve kalıcı veriler

```bash
npm run build
npm run start
```

İki saklama yöntemi desteklenir: yerel/kalıcı Node.js sunucusunda `.cms/`, Vercel’de ise Supabase veritabanı ve Storage. Vercel’de geçici dosya sistemine içerik veya hesap kaydedilmez. Bağlantı kurulmadıysa yönetim ve kayıt işlemleri yapılandırma ister; ziyaretçi sayfaları başlangıç içeriğiyle görüntülenebilir.

Supabase için `supabase/setup.sql` dosyasını çalıştırın; `SUPABASE_URL` ve `SUPABASE_SERVICE_ROLE_KEY` değerlerini özel sunucu değişkenleri olarak ekleyin. İlk hesabı bootstrap değişkenleriyle veya `npm run admin:setup` ile oluşturabilirsiniz. Yerelde mevcut hesabı/içeriği aktarmak için `npm run cms:import` kullanın. Aşağıdaki disk maddeleri yalnızca yerel yönteme aittir.

- Varsayılan veri klasörü `.cms/`: hesap, oturum imzalama anahtarı, taslak, yayın geçmişi ve `uploads/` dosyalarını içerir.
- İsterseniz `CMS_DATA_DIR=/kalici/disk/kivanc-cms` belirleyin. Kurulum, geliştirme ve üretim komutlarının **aynı dizini** kullanması gerekir. Bu klasör Git'e eklenmez.
- `.cms/` klasörünün tamamını güvenli biçimde yedekleyin. JSON dışa aktarma **yüklenen dosyaları ve yönetici hesabını içermez**.
- Derleme paketi `.cms/` içeriğini bilerek içermez. Mevcut hesabı canlıya taşırken bu klasörü özel bir bağlantı üzerinden sunucunun kalıcı veri dizinine ayrıca aktarın; hesabı, oturum anahtarını ve yüklemeleri herkese açık kaynak arşivine koymayın.
- Canlı ortamda HTTPS kullanın. Üretim oturum çerezi `Secure`, `HttpOnly` ve `SameSite=Strict` olarak ayarlanır.
- Ters proxy arkasında `SITE_ORIGIN=https://alan-adiniz.com` ayarlayın; panelin açıldığı tam origin ile eşleşmelidir. Proxy istek boyutunu en az 11 MB kabul etmelidir.
- Oturumlar 8 saat sürer. Yerelde parola denemeleri uygulama belleğinde, Supabase kullanımında ortak veritabanında sınırlandırılır. Parola değişiklikleri bütün uygulama işlemlerindeki eski oturumları geçersiz kılar.
- Yüklenen dosyaları değiştirerek önbelleği bozmak yerine yeni dosya yüklenir; eski yayınlar bu dosyalara başvurabilir.

## Orijinal ZIP'te olmayan dosyalar

Yüklenen arşivde logo dışında ürün fotoğrafları, 360° kareleri ve PDF'ler yoktur. Klasörler yalnızca `.gitkeep` içerir. Bunları medya panelinden yükleyebilirsiniz. Temsili marka görselleri eklenmiştir; kendi fotoğraflarınızla değiştirebilirsiniz. Eski siteye ağ erişimi bu bulut ortamında 403 yanıtı verdiğinden dış dosyalar indirilemedi. Bu durum admin panelinin çalışmasını engellemez.

İletişim/teklif formunun e-posta göndermesi için mevcut `RESEND_API_KEY`, `CONTACT_FROM` ve isteğe bağlı `CONTACT_TO` ayarları gerekir; admin paneli bu servisten bağımsızdır. Bunlar yapılandırılmadan e-posta gönderimi başarılıymış gibi gösterilmez. Gizli anahtarları panel içeriğine veya Git'e yazmayın.

Ürün, Dokümanlar ve Mevzuat sayfalarında henüz bulunmayan yerel PDF dosyaları “Belge hazırlanıyor” olarak gösterilir. Böylece ziyaretçi eksik dosyaya yönlendirilmez. PDF'yi medya kütüphanesine yükleyip ilgili belgenin bağlantısını değiştirerek yayınlayın; dosya erişilebilir olduğunda indirme bağlantısı otomatik açılır. Bu durumun metni de “Belge bağlantıları” bölümünden düzenlenebilir.

Gelişmiş CSS kod gerektiren özel görünüm ayarları içindir. Mevcut sayfaların bileşen yapısı ve teklif formunun iş mantığı uygulama kodundadır; panel genel amaçlı bir kod editörü değildir. Yeni sayfalarda bloklar eklenip sıralanabilir.

## Doğrulama

```bash
npm run typecheck
npm run build
npm run test:cms
```

Test, geçici veri dizininde ayrı bir üretim sunucusu başlatır; gerçek hesabınıza veya içeriğinize dokunmaz. Kimlik doğrulama, çapraz kaynak engeli, taslak/yayın ayrımı, önizleme, içerik doğrulama, sürüm çakışması, medya yükleme, yeni ürün/özel sayfa, arama/site haritası, geri alma ve mevcut sayfaları kontrol eder.

## Ceket ve pantolon için 360°

Ürün sayfasındaki geniş galeride fotoğraflar ile 360° görünüm arasında geçiş yapılır. Tam ekran açılabilir. Fareyle sürükleme, telefonda yatay dokunma, sol/sağ ok tuşları, kaydırıcı ve başlat/durdur düğmeleri desteklenir. Otomatik dönüş kullanıcının başlatmasıyla çalışır; sayfa yüklenir yüklenmez dönmez. Bozuk kare varsa görüntüleyici hata mesajı verir; sessizce sahte dönüş göstermez.

Koyu ürün sahnesinde elips halka, tıklama ve sürüklemeyle açıyı seçer. Kaydırıcı ile başlat/durdur düğmeleri **Dönüş kontrolleri**, uzun fotoğraf listeleri **Ürün görselleri** başlığı açıldığında görünür. İlk görünümün sade kalması için bu alanlar çok açılı ürünlerde kapalı başlar. Şeffaf PNG/WebP dosyaları koyu sahneyle birleşir; JPEG içine gömülü beyaz fon sayfa rengini değiştirmekle silinmez.

Kareler eşit açılarla çekilmemişse 360° alanındaki **Kare görüş açıları (derece)** listesine her kare için bir değer girin. Değerler 0 dahil, 360 hariç aralıkta ve benzersiz olmalı; açı sayısı kare sayısıyla eşleşmelidir. Örneğin yedi kare için `0, 45, 90, 135, 180, 225, 270` kullanılabilir. Alan eklenmezse kareler eşit aralıklı kabul edilir. Kare listesini değiştirirken açı listesini de güncelleyin. İlk kare açılış görünümüdür; ilk olarak çapraz açı istiyorsanız o kareyi ve ona karşılık gelen açıyı listenin başına alın.

**Tek parça ürün:** Ürün detaylarında “360° görüntü” alanını ekleyin. “360° karelerini seç” düğmesiyle tüm kareleri topluca yükleyin. Fotoğraflar `1.jpg`, `2.jpg`, … `36.jpg` biçiminde adlandırılırsa doğal sayısal sıraya konur. Açıklamayı yazıp taslağı önizleyin. Listede tek tek kareleri sıralamak da mümkündür.

**Ceket + pantolon:** Ürün detaylarında “Ceket / pantolon ve diğer parçalar” listesini ekleyin. İki kayıt oluşturun:

- Kimlik `ceket`, etiket `Ceket`.
- Kimlik `pantolon`, etiket `Pantolon`.

Her kaydın kendi fotoğrafları, açıklaması ve 360° alanı vardır. Kareleri her parçanın kendi 360° alanına yükleyin. Kimlikleri benzersiz tutun. Seçilen parça teklif sepetine ürün adıyla birlikte eklenir.

Diziler için 24–72 kare önerilir (36 kare = her 10°'de bir çekim); aynı yükseklik, kadraj, ışık ve arka planı kullanın. Desteklenen üst sınır 500 karedir. Maximus 2.0 için kullanıcının sağladığı yedi açılı takım görselleri canlı CMS'ye eklendi; az kareli dizilerde geçiş kademelidir. Teknik testlerde kullanılan geçici renk kareleri projeye veya canlı içeriğe kaydedilmez.

Paylaşılan Texport ekran görüntüsündeki koyu ürün alanı, solda büyük ürün ve elips biçimli açı seçimi, sağda açıklama/seçenekler ve oval teklif düğmesi esas alınmıştır. Referanstaki rakip ürün fotoğrafı projeye kopyalanmamıştır; kendi görsellerinizi yükleyin.

## Referanstaki ürün seçeneklerini yönetme

“Ürün detayları” bölümünde ilgili ürünü seçin:

- **Ürün serisi:** başlığın altında küçük altı çizgili etiketi belirler.
- **Malzeme ve dış katman seçenekleri:** her kayıt benzersiz kimlik, malzeme bileşimi, dış katman, beden aralığı, bileşim kodu ve ürün kodu içerir. Aynı malzeme için birden fazla dış katman ekleyebilirsiniz; sitede ilk seçim ikinci listeyi filtreler. Teknik bilgiler seçilen kayıtla birlikte değişir. Ceket ve pantolonun farklı kodları varsa her parçanın içindeki seçenek listesini kullanın.
- **Renk seçenekleri ve 360° kareleri:** renk adı, örnek rengi (#rrggbb), fotoğraf ve gerçek 360° kareleri içerir. Rengi seçmek ilgili galeriyi açar. Ceket/pantolon varsa renkleri ilgili parçanın içine ekleyin; böylece birinin kareleri diğerine uygulanmaz.
- **Görüş açısı noktaları:** ürünün altındaki elips üzerinde bir noktaya basarak belirli açıya geçilir. Sürükleme, kaydırıcı ve klavye de kullanılabilir.
- **İlgili ürün:** ceket/pantolon seçimi varsa diğer parçaya geçer; tek parçada aynı gruptan başka ürüne yönlendirir.

Seçilen parça, renk ve malzeme/dış katman bileşimi teklif sepetindeki ürün adına eklenir. Eksik malzeme ve renk bilgileri uydurulmaz; ilgili alanlar panelden eklenene kadar sitede gösterilmez.

Ürün alanının arka planı, metin, vurgu ve ışık renkleri “Ürün sayfası · Galeri ve 360°” bölümünden düzenlenebilir. Gösterilen tüm seçim ve paylaşım etiketleri de aynı bölümde bulunur.

## Texport görsel diline göre yenilenen site

Ana sayfa, üst/alt menüler, sayfa başlıkları, faaliyet alanları, kurumsal alan, kalite, haberler ve iş ortakları bölümleri koyu gri, beyaz ve kırmızı vurgularla yenilendi. Kıvanç Group adı, logosu ve mevcut içerikleri korunur.

Üst menüde İş Güvenliği, Mühendislik ve Madencilik düğmeleri geniş gri ürün menüsünü açar. Ürün grupları ve bağlantıları doğrudan “Bölümler ve ürün listesi” bölümünden alınır. Fareyle üzerine gelerek veya düğmeye tıklayarak açılır; Escape ile kapanır. Telefonda odak yönetimi olan ayrı menü kullanılır.

- “Üst menü ve duyurular” bölümünde kayan duyuruların görünürlüğü, arama ve menü etiketleri yönetilir.
- “Ana sayfa · Faaliyet alanları” bölümündeki kart görselleri ve açıklamaları değiştirilebilir.
- “Ana sayfa · Haberler”, “Haberler” kayıtlarından en yeni üç haberi gösterir; ana sayfa sırası ve görünürlük listesinden taşınabilir veya gizlenebilir.
- “Alt bilgi ve sosyal medya” bölümünde iletişim çağrısı, düğmesi, kurumsal açıklama ve bağlantılar düzenlenebilir.
- Renkler, yazı tipleri ve düğme yuvarlaklığı Tasarım bölümündedir. Open Sans dosyaları yerel olarak sunulur; yazı tipi için dış hizmete erişim gerekmez. Font lisansı `public/fonts/` içindedir.

Ana sayfa ve kurumsal bölümde kullanılan itfaiyeci sahnesi marka tasarımı için hazırlanmış temsili bir görseldir; gerçek Kıvanç ürünü veya tesis fotoğrafı olarak sunulmaz. Mühendislik ve madencilik kartları temsili teknik illüstrasyonlardır. Kendi görsellerinizi panelden yükleyip yerlerine seçebilirsiniz. Ürün sayfalarındaki gerçek ürün fotoğrafları ve 360° kareleri ayrıca yüklenmelidir.

## Görselliği öne çıkaran yeni bölümler

- **Açılış hikâyeleri:** Ana sayfanın açılışında İş Güvenliği, Mühendislik ve Madencilik arasında gerçek seçim yapılır. İlk hikâye mevcut karşılama alanlarından; diğerleri “Diğer açılış hikâyeleri” listesinden yönetilir. Her hikâyenin etiketi, başlığı, açıklaması, görseli ve bağlantısı ayrı düzenlenir. Kendi kendine içerik değiştirmez; kullanıcı seçim yapar. Klavyede sol/sağ oklarla da kullanılabilir.
- **Faaliyet vitrini:** “Ana sayfa · Faaliyet alanları” bölümündeki kayıtlar sekmeli, büyük görselli bir vitrin oluşturur. Seçimle fotoğraf, açıklama, çözüm listesi ve bağlantı birlikte değişir.
- **Ürün keşif vitrini:** Gerçek ürün kataloğundan beslenir; faaliyet alanı ve metinle filtreleme, daha fazla kayıt gösterme ve boş sonuç durumunda filtre temizleme sunar. İlk gösterim sayısını ve öncelikli ürün adreslerini ilgili bölümden ayarlayın. Ürünün fotoğrafı yüklüyse kartta görünür; fotoğraf olmayan ürünlerde dekoratif teknik grafik kullanılır. 360° etiketi yalnızca en az iki karelik görüntü yapılandırılmış ürünlerde gösterilir.
- **Marka mesajı:** Büyük tipografili kırmızı bölüm; başlık, açıklama, kayan metin ve bağlantısı panelden düzenlenir.
- **Hareketler ve gezinme:** Sabit üst menü, sayfa ilerleme çizgisi, sayfa başına dönüş ve yumuşak bölüm geçişleri eklendi. Tasarım bölümündeki hareket ayarıyla geçişleri kapatabilirsiniz. Cihazın “azaltılmış hareket” tercihi her durumda önceliklidir.

Yeni bölümleri “Ana sayfa sırası ve görünürlük” alanından taşıyabilir veya gizleyebilirsiniz. Daha eski bir içerik kaydında bulunmayan yeni bölümler aynı ekrandaki “Ana sayfaya ekle” düğmesiyle eklenebilir; mevcut bölüm sıranız zorla değiştirilmez.

Koruyucu giyim, mühendislik ve madencilik için oluşturulan geniş sahneler temsili marka görselleridir. Gerçek tesis, gerçek çekilmiş ürün fotoğrafı veya ürünün 360° kareleri değildir. Admin panelinden kendi çekimlerinizle değiştirilebilir.

## Yeni tasarım ve talep akışları

Ürün listeleri fotoğraflı kartlar kullanır. Ürün fotoğrafı seçildiğinde ana sayfa ve bölüm kataloğuna yansır. Mobilde ürün başlığı galerinin önünde, teklif düğmesi ekranın altında görünür. “Teklif iste” seçilen parça, renk ve bileşimi genel teklif formuna taşır. Sepet üzerinden çoklu ürün talebi de korunmuştur.

Kurumsal ve Ar-Ge sayfalarının açılış görselleri, alt yazıları ve metinleri kendi sayfa bölümlerinden düzenlenir. Haber kayıtlarında isteğe bağlı **Görsel**, **Görsel açıklaması**, **Görsel alt yazısı**, **Adres** ve **İçerik paragrafları** alanlarını ekleyebilirsiniz. Her haberin site içinde kendi detay sayfası vardır. Gerçek haber fotoğrafı yoksa tarih temalı dekoratif grafik kullanılır.

Gelen talepler e-posta ayarı olmadan da kalıcı olarak saklanır. Panelde kaydın okundu durumunu değiştirebilir ve gerektiğinde kaydı silebilirsiniz. E-posta bildirimi yapılandırılmışsa iletim durumu görünür; bildirimin başarısız olması talebi silmez.

## Aktarılan içerikleri düzenleme

Mevcut sitenin 54 katalog/bilgi başlığı ve 133 modeli hazır gelir. Ürün listesindeki `Ana ürün ailesinin adresi` alanı bir modelin hangi aileye bağlı olduğunu belirler; ek aile ilişkileri aynı modeli farklı serilerde gösterir. Ana aile kayıtlarında bu alan boş bırakılır. Ürün detaylarında galeri, açıklama, teknik bilgiler, belgeler ve video bağlantıları düzenlenebilir.

Kurumsal ve Ar-Ge bölümündeki kaynak metin, tesis/belge fotoğrafları ve bağlantılar `Kurumsal içerik, fotoğraflar ve belgeler` bloklarındadır. Üst menünün alt bağlantıları da düzenlenebilir. Belgeler bölümündeki 136 PDF başlangıç paketine dahildir. Kapsam ve kaynaklar [AKTARIM-RAPORU.md](AKTARIM-RAPORU.md) içinde açıklanır.

## Koyu zemin ve ışık tonu

Tasarım bölümündeki Sayfa arka planı, Bölüm arka planı, Ana metin ve İkincil metin alanları bütün ortak zemin ve metinleri yönetir. Arka plan ışık tonu, ürün sahnesine benzer yumuşak radyal ışığın rengini belirler. Varsayılan görünüm antrasit zemin, açık metin ve sıcak vurgu renkleridir. Ürün sahnesinin ayrı renkleri Ürün deneyimi bölümünde düzenlenebilir. Ürün fotoğrafının dosyasına gömülü beyaz fon, sayfa zemin ayarından bağımsızdır; şeffaf PNG/WebP ürün fotoğrafı ışıklı zeminle birleşir.

## Ana sayfa banner videosu

**Ana sayfa · Karşılama** bölümünde **Karşılama videosu** alanının “Medya kütüphanesinden seç” düğmesini kullanın. MP4 veya WebM dosyanızı yükleyip listeden seçin. Aynı yerdeki karşılama görselini videonun kapak/yedek fotoğrafı olarak koruyun. Taslağı önizleyip yayınlayın. **Diğer açılış hikâyeleri** içindeki her faaliyet için ayrı “Arka plan videosu” seçilebilir. Video adresini boşaltmak yalnızca görseli gösterir. Oynatma/durdurma düğmesi etiketleri de panelden değişir.

Video sessiz, döngüde ve telefonda sayfa içinde oynar; görüntü başladıktan sonra fotoğrafın üzerine yumuşak geçişle açılır. Ziyaretçi durdurabilir. Banner ekran dışında veya sekme gizliyken durur. Azaltılmış hareket/veri tasarrufu tercihlerinde kendiliğinden indirilmez ve oynatılmaz; ziyaretçi isterse başlatır. Otomatik oynatma engellenirse veya dosya açılmazsa kapak görseli kalır.

Yükleme sınırı dosya başına **10 MB**. Banner için 8–15 saniyelik, 16:9, web için sıkıştırılmış, tercihen ses kanalı çıkarılmış bir MP4 (H.264, yuv420p, faststart) önerilir. 1280×720 çoğu çekim için yeterlidir. WebM de desteklenir; MP4 telefonlarda daha geniş uyumluluk sağlar. YouTube sayfa bağlantısı banner arka planına uygun değildir; doğrudan `.mp4`/`.webm` dosya adresi gerekir. Daha büyük dosyalar harici bir video/CDN deposundan doğrudan adresle kullanılabilir.

Hazır kurumsal video verilmediği için varsayılan içerikte video seçili değildir; mevcut fotoğraflar görünür. Daha önce kurulan Supabase deposunda video yüklemeyi açmak için güncel `supabase/setup.sql` yeniden çalıştırılmalıdır; mevcut içerikler korunur.

Video uçtan uca testi için FFmpeg ve Playwright gerekir: `CMS_BROWSER_MODULE=/tam/yol/playwright/index.mjs npm run test:video`. Testler kendi geçici hesabını ve renk desenli kliplerini oluşturup temizler; gerçek yönetici hesabına veya içeriklerine dokunmaz.
