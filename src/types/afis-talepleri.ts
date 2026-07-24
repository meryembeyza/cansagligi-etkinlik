export type AfisDurumu = 'Bekliyor' | 'Hazırlanıyor' | 'Tamamlandı' | 'Revizyon';

export interface AfisTalebi {
  id: string;
  eventId?: string;
  eventCreatorId?: string;
  aciklama?: string;
  etkinlikAdi: string;
  universiteAdi: string;
  birim: 'Sosyal' | 'Mesleki' | 'Eğitim' | 'Diğer';
  etkinlikTarihi: string; // ISO 8601 string
  talepTarihi: string; // ISO 8601 string
  durum: AfisDurumu;
  
  // Hazırlanıyor ve Tamamlandı için
  tasarimciAdi?: string;
  baslangicTarihi?: string; // ISO 8601 string
  ilerlemeYuzdesi?: number; // 0-100
  
  // Tamamlandı için
  onayTarihi?: string; // ISO 8601 string
  dosyaUrl?: string;
  onayDurumu?: 'Bekliyor' | 'Onaylandı';
  
  // Revizyon için
  revizyonNotu?: string;
  revizyonİsteyen?: string;
  creator?: {
    full_name?: string;
    phone?: string;
  };
}
