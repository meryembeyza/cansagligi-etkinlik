import { AfisTalebi } from '../types/afis-talepleri';

// Yardımcı fonksiyon: Bugünden itibaren X gün sonra/önce tarih oluşturur
const addDays = (days: number): string => {
  const date = new Date('2026-07-02T19:19:13+03:00'); // Kullanıcının şu anki tarihi
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

export const mockAfisTalepleri: AfisTalebi[] = [
  // BEKLEYENLER
  {
    id: 'req-1',
    etkinlikAdi: 'Kariyer 360: TUS Branş Tanıtımı',
    universiteAdi: 'İstanbul Üniversitesi',
    birim: 'Mesleki',
    etkinlikTarihi: addDays(5),
    talepTarihi: addDays(-3),
    durum: 'Bekliyor',
  },
  {
    id: 'req-2',
    etkinlikAdi: 'Bahar Şenliği',
    universiteAdi: 'Boğaziçi Üniversitesi',
    birim: 'Sosyal',
    etkinlikTarihi: addDays(12),
    talepTarihi: addDays(-1),
    durum: 'Bekliyor',
  },
  {
    id: 'req-3',
    etkinlikAdi: 'Girişimcilik Zirvesi',
    universiteAdi: 'ODTÜ',
    birim: 'Eğitim',
    etkinlikTarihi: addDays(3), // Yakın tarih
    talepTarihi: addDays(-8), // Eski talep
    durum: 'Bekliyor',
  },
  {
    id: 'req-4',
    etkinlikAdi: 'Yapay Zeka ve Sağlık',
    universiteAdi: 'Hacettepe Üniversitesi',
    birim: 'Eğitim',
    etkinlikTarihi: addDays(20),
    talepTarihi: addDays(-2),
    durum: 'Bekliyor',
  },
  {
    id: 'req-5',
    etkinlikAdi: 'Mezunlar Buluşması',
    universiteAdi: 'Marmara Üniversitesi',
    birim: 'Sosyal',
    etkinlikTarihi: addDays(8),
    talepTarihi: addDays(-5),
    durum: 'Bekliyor',
  },

  // HAZIRLANIYOR
  {
    id: 'req-6',
    etkinlikAdi: 'Bilimsel Basamak Etkinliği',
    universiteAdi: 'YTÜ',
    birim: 'Eğitim',
    etkinlikTarihi: addDays(18),
    talepTarihi: addDays(-7),
    durum: 'Hazırlanıyor',
    tasarimciAdi: 'Ayşe ÖZKAN',
    baslangicTarihi: addDays(-2),
    ilerlemeYuzdesi: 65,
  },
  {
    id: 'req-7',
    etkinlikAdi: 'Sağlıklı Yaşam Semineri',
    universiteAdi: 'Ankara Üniversitesi',
    birim: 'Sosyal',
    etkinlikTarihi: addDays(10),
    talepTarihi: addDays(-5),
    durum: 'Hazırlanıyor',
    tasarimciAdi: 'Mehmet YILMAZ',
    baslangicTarihi: addDays(-1),
    ilerlemeYuzdesi: 30,
  },
  {
    id: 'req-8',
    etkinlikAdi: 'Kariyer Günleri',
    universiteAdi: 'Gazi Üniversitesi',
    birim: 'Mesleki',
    etkinlikTarihi: addDays(25),
    talepTarihi: addDays(-10),
    durum: 'Hazırlanıyor',
    tasarimciAdi: 'Zeynep KOÇAK',
    baslangicTarihi: addDays(-4),
    ilerlemeYuzdesi: 90,
  },

  // TAMAMLANDI
  {
    id: 'req-9',
    etkinlikAdi: 'Dış Ticaret Konferansı',
    universiteAdi: 'Marmara Üniversitesi',
    birim: 'Mesleki',
    etkinlikTarihi: addDays(30),
    talepTarihi: addDays(-15),
    durum: 'Tamamlandı',
    tasarimciAdi: 'Mehmet YILMAZ',
    onayTarihi: addDays(-1),
    dosyaUrl: '/dosyalar/dis-ticaret-afis.pdf',
    onayDurumu: 'Onaylandı',
  },
  {
    id: 'req-10',
    etkinlikAdi: 'Tıp Öğrencileri Sempozyumu',
    universiteAdi: 'Cerrahpaşa Tıp',
    birim: 'Eğitim',
    etkinlikTarihi: addDays(40),
    talepTarihi: addDays(-20),
    durum: 'Tamamlandı',
    tasarimciAdi: 'Ayşe ÖZKAN',
    onayTarihi: addDays(-5),
    dosyaUrl: '/dosyalar/tip-sempozyum-afis.pdf',
    onayDurumu: 'Onaylandı',
  },

  // REVİZYON GEREKLİ
  {
    id: 'req-11',
    etkinlikAdi: 'Ramazan İftar Etkinliği',
    universiteAdi: 'Ege Üniversitesi',
    birim: 'Sosyal',
    etkinlikTarihi: addDays(7),
    talepTarihi: addDays(-12),
    durum: 'Revizyon',
    tasarimciAdi: 'Zeynep KOÇAK',
    revizyonNotu: 'Logo daha büyük olmalı ve üniversite adı daha belirgin yazılmalı.',
    revizyonİsteyen: 'Birim Başkanı',
  }
];
