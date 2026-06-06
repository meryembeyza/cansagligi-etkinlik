'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRole } from '@/context/RoleContext';
import { Package, Truck, Info, Settings2 } from 'lucide-react';
import Link from 'next/link';

export default function LogisticsPage() {
  const { currentRole, userData } = useRole();
  const [isLoading, setIsLoading] = useState(true);
  const [logisticsData, setLogisticsData] = useState<any[]>([]);

  // Filtreler
  const [filterType, setFilterType] = useState('All'); // All, Shuttle, Aroma, Maket, Custom

  useEffect(() => {
    if (currentRole === 'general_admin' || currentRole === 'resource_manager') {
      fetchLogistics();
    }
  }, [currentRole]);

  const fetchLogistics = async () => {
    setIsLoading(true);
    try {
      // Sadece lojistik talebi (budget_request) null olmayan ve onay bekleyen / onaylanmış etkinlikleri çekelim
      let query = supabase
        .from('events')
        .select('id, event_name, university, region, event_date, status, budget_request, unit_name')
        .not('budget_request', 'is', null)
        .order('event_date', { ascending: true });

      if (currentRole === 'resource_manager' && userData?.unit_name) {
        query = query.eq('unit_name', userData.unit_name);
      }

      const { data, error } = await query;

      if (error) throw error;

      const parsedData: any[] = [];

      data?.forEach(event => {
        try {
          const logData = JSON.parse(event.budget_request);
          if (!logData) return;

          // Servis Talebi
          if (logData.hasShuttle && logData.shuttle) {
            parsedData.push({
              eventId: event.id,
              eventName: event.event_name,
              university: event.university,
              region: event.region,
              date: event.event_date,
              status: event.status,
              type: 'Servis',
              details: `${logData.shuttle.description} | Kalkış: ${logData.shuttle.departurePoint} (${logData.shuttle.departureTime}) - Dönüş: ${logData.shuttle.returnPoint} (${logData.shuttle.returnTime}) | Sorumlu: ${logData.shuttle.vehicleManager}`
            });
          }

          // Aromaterapi Talebi
          if (logData.hasAroma && logData.aroma && logData.aroma.length > 0) {
            logData.aroma.forEach((a: any, idx: number) => {
              parsedData.push({
                eventId: event.id,
                eventName: event.event_name,
                university: event.university,
                region: event.region,
                date: event.event_date,
                status: event.status,
                type: 'Aromaterapi',
                details: `Formül ${idx + 1}: ${a.oils} (${a.amount}) - ${a.peopleCount} Kişilik. Not: ${a.notes || '-'}`
              });
            });
          }

          // Temel Yaşam Desteği Talebi
          if (logData.hasBasicLifeSupport) {
            parsedData.push({
              eventId: event.id,
              eventName: event.event_name,
              university: event.university,
              region: event.region,
              date: event.event_date,
              status: logData.basicLifeSupportDetailsObj?.status || 'Bekliyor',
              type: 'Temel Yaşam Desteği',
              details: logData.basicLifeSupportDetails || 'Temel Yaşam Desteği Malzemeleri Talebi'
            });
          }

          // İleri Yaşam Desteği Talebi
          if (logData.hasAdvancedLifeSupport) {
            parsedData.push({
              eventId: event.id,
              eventName: event.event_name,
              university: event.university,
              region: event.region,
              date: event.event_date,
              status: logData.advancedLifeSupportDetailsObj?.status || 'Bekliyor',
              type: 'İleri Yaşam Desteği',
              details: logData.advancedLifeSupportDetails || 'İleri Yaşam Desteği Malzemeleri Talebi'
            });
          }

          // Sütur Eğitimi Talebi
          if (logData.hasSutureTraining) {
            parsedData.push({
              eventId: event.id,
              eventName: event.event_name,
              university: event.university,
              region: event.region,
              date: event.event_date,
              status: logData.sutureTrainingDetailsObj?.status || 'Bekliyor',
              type: 'Sütur Eğitimi',
              details: logData.sutureTrainingDetails || 'Sütur Eğitimi Malzemeleri Talebi'
            });
          }

          // Özel Talepler
          if (logData.customRequests && logData.customRequests.length > 0) {
            logData.customRequests.forEach((cr: any) => {
              parsedData.push({
                eventId: event.id,
                eventName: event.event_name,
                university: event.university,
                region: event.region,
                date: event.event_date,
                status: event.status,
                type: 'Özel Talep',
                details: `[${cr.name}] ${cr.note}`
              });
            });
          }

        } catch (e) {
          // JSON parse error, ignore
        }
      });

      setLogisticsData(parsedData);
    } catch (err: any) {
      console.error('Lojistik verisi çekilemedi:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (currentRole !== 'general_admin' && currentRole !== 'resource_manager') {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Yetkisiz Erişim</div>;
  }

  const filteredData = logisticsData.filter(d => filterType === 'All' || d.type === filterType);

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'Servis': return 'badge-primary';
      case 'Aromaterapi': return 'badge-success';
      case 'Temel Yaşam Desteği': return 'badge-warning';
      case 'İleri Yaşam Desteği': return 'badge-danger';
      case 'Sütur Eğitimi': return 'badge-info';
      default: return 'badge-neutral';
    }
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Truck size={24} color="var(--color-primary)" /> Lojistik ve Kaynak Yönetimi
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Okullardan gelen tüm malzeme, servis ve özel taleplerin birleştirilmiş listesi.</p>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid #eaeaea', paddingBottom: '1rem', flexWrap: 'wrap' }}>
          {['All', 'Servis', 'Aromaterapi', 'Temel Yaşam Desteği', 'İleri Yaşam Desteği', 'Sütur Eğitimi', 'Özel Talep'].map(t => (
            <button 
              key={t}
              onClick={() => setFilterType(t)}
              className={`btn ${filterType === t ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.825rem' }}
            >
              {t === 'All' ? 'Tüm Talepler' : t}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Lojistik verileri derleniyor...</div>
        ) : filteredData.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#f9fafb', borderRadius: 'var(--radius-md)' }}>
            <Package size={48} color="#d1d5db" style={{ margin: '0 auto 1rem' }} />
            <p style={{ color: 'var(--text-muted)' }}>Şu anda görüntülenmesi gereken bir lojistik talebi bulunmuyor.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', color: 'var(--text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #eaeaea' }}>Talep Tipi</th>
                  <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #eaeaea' }}>Üniversite & Etkinlik</th>
                  <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #eaeaea', width: '40%' }}>Talep Detayları</th>
                  <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #eaeaea' }}>Etkinlik Durumu</th>
                  <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #eaeaea', textAlign: 'right' }}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #eaeaea' }}>
                    <td style={{ padding: '1rem' }}>
                      <span className={`badge ${getBadgeColor(item.type)}`} style={{ fontWeight: 600 }}>{item.type}</span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 600 }}>{item.university} ({item.region})</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.eventName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(item.date).toLocaleDateString('tr-TR')}</div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                        <Info size={16} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                        <span style={{ lineHeight: '1.4' }}>{item.details}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span className="badge badge-neutral">{item.status}</span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <Link href={`/dashboard/events/${item.eventId}`} className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>
                        Etkinliğe Git
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
