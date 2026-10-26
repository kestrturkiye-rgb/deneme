# kivancgroup.com içerik aktarımı

26 Ekim 2026 tarihinde kaynak sitenin açık ana sayfası, menüsü, WordPress sayfa listesi ve site haritaları incelendi. 237 kaynak sayfa HTTP 200 ile alındı. HTML ve ekli belge metinleri içerik olarak işlendi; kaynak sitenin betikleri, izleme kodları veya formları yeni uygulamada çalıştırılmadı.

## Yeni sitede bulunanlar

| Alan | Sonuç |
| --- | --- |
| Ana menü | Hakkımızda, Ürünlerimiz, Ar-Ge, Haberler, Satış Kanalları, Dokümanlar, Kariyer, İletişim |
| Hakkımızda | Kurumsal ve Tarihçe; kaynak şirket metni, misyon/vizyon, belge görselleri ve yönetim politikası |
| Ürünlerimiz | İş Güvenliği, Mühendislik ve Madencilik için ortak giriş ve alt menüler |
| Katalog | 54 aile/bilgi başlığı ve bunların altında 133 ayrı model sayfası |
| Ürün içeriği | Mevcut açıklamalar, öne çıkan özellikler, kaynakta varsa teknik tablolar, galeri ve broşür bağlantıları |
| Haberler | 16 haberin tam metni ve kaynak fotoğrafları |
| Belgeler | 136 doğrulanmış PDF; kataloglar, modele özel teknik föyler, mevzuat ve politika belgesi |
| Görseller | Kaynak siteden kopyalanmış 509 dosya |
| Videolar | Kaynak YouTube bağlantıları; ortak kütüphanede 24 bağlantı, ilgili ürün/kurumsal sayfalarda erişim |
| Eski adresler | 322 kalıcı yönlendirme; eski ürün, alt bölüm ve PDF adresleri yeni karşılıklarına gider |

PDF dosyaları ve fotoğraflar yeni projenin `public/` klasöründedir. DNS değiştiğinde eski WordPress sunucusunun açık kalmasına ihtiyaç duymazlar. Videolar YouTube bağlantısı olarak korunur; üçüncü taraf servisindeki yayın durumu bu aktarımın kapsamı dışında kalır.

Belgelerde başlık araması yapılır. Birden fazla seride kullanılan modellerin aile ilişkileri korunur. Aile sayfasındaki model kartı gerçek modelin ayrı galeri ve teknik bilgi sayfasını açar. Panelden bu içerikler düzenlenebilir; yeni görsel, PDF ve gerçek dönüş kareleri eklenebilir.

## Aktarım dışında bırakılanlar

20 kaynak kayıt: örnek/test/boş sayfalar, içeriği olmayan üç ürün kaydı, bağlantısız eski yazı parçası ve temanın ayrı müşteri/logo kayıtları. Eski `/dokumanlar-2/` arşivi, güncel belge sayfasına yönlenir. Yalnızca bu arşivden eski `kivanc.irmtest.net` test alan adına giden 28 PDF bağlantısı güncel kütüphaneye eklenmedi. Aktif belge sayfasındaki katalogların tamamı kopyalandı.

Kaynakta Paulson Gözlük 510-ARC-SN 12 ve eski Yangın Battaniyesi model kaydının fotoğraf adresleri boştu. Bu iki modele fotoğraf uydurulmadı; içerikleri ve mevcut belgeleri aktarıldı. Aynı battaniyenin güncel PROTEK sayfasındaki mevcut fotoğraflar korunur.

Kaynakta gerçek bir 360° kare dizisi bulunmadı. Ön/arka fotoğraflar normal galeride gösterilir. 360° altyapısı ayrı parça/renk kareleriyle çalışır; gerçek dönüş görselleri panelden yüklendiğinde etkinleşir. Açılıştaki temsili marka sahneleri [görsel kaynak notunda](PUBLIC-ASSET-NOTES.md) açıklanmıştır.

## Teknik doğrulama ve izlenebilirlik

- Tüm PDF'ler pypdf ile açıldı ve sayfa sayıları okundu; tüm kaynak görsellerinin dosya bütünlüğü kontrol edildi.
- `SOURCE-MIGRATION.json`: kaynak sayfa → yeni adres, hariç bırakma gerekçesi, dosya kaynağı, boyut ve SHA-256 envanteri.
- `src/cms/bundled-documents.json`: derlemede doğrulanan 136 PDF'nin Vercel'de kullanılabilirlik envanteri.
- `src/cms/legacy-paths.json`: kalıcı yönlendirmeler.
- Büyük sabit dosyalar Vercel sunucu fonksiyonlarına dahil edilmez. İşlev bağımlılıklarında özel hesap/veri, PDF veya kaynak fotoğrafı bulunmadığı doğrulandı.
- [Doğrulama raporu](DOGRULAMA-RAPORU.md): uygulama ve bulut sözleşme testleri. Gerçek Vercel/Supabase yayını kullanıcı hesabında [kurulum rehberiyle](VERCEL-KURULUM.md) tamamlanır.
