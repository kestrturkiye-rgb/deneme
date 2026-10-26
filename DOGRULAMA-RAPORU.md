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
- Playwright destekli `npm run test:cloud`: **12 kontrol başarılı**. Gerçek PostgreSQL motoru PGlite ve yerel Supabase REST/Storage sözleşme servisi kullanıldı. Anonim erişim engeli, iki uygulama işlemi arasında kalıcılık, eşzamanlı yazma koruması, ortak giriş sınırı, şifre değişikliği, bootstrap, imzalı yükleme, bozuk dosyanın reddi ve 5 MB dosyanın API'ye taşınmadan tarayıcıdan yüklenmesi doğrulandı. **Bu testler gerçek Supabase/Vercel hesabına bağlanmaz.**
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
