
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
const supabase = createClient();
import LoadingState from '@/components/ui/LoadingState';
import { useRole } from '@/context/RoleContext';

export function HistoryTab() {
  const { currentRole, userData } = useRole();
  const [movements, setMovements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [currentRole, userData]);

  const fetchHistory = async () => {
    setIsLoading(true);
    let query = supabase
      .from('inventory_movements')
      .select('*, inventory_items(name, unit), users(full_name, region), events(event_name)')
      .order('created_at', { ascending: false });

    // RLS will filter natively, but we can also apply frontend filters if we want.
    
    const { data, error } = await query;
    if (data) setMovements(data);
    setIsLoading(false);
  };

  if (isLoading) return <LoadingState />;

  return (
    <div className="card">
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Hareket Geçmişi</h2>
      <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th>Tarih</th>
              <th>Tür</th>
              <th>Malzeme</th>
              <th>Miktar</th>
              <th>Bölge / Etkinlik</th>
              <th>İşlemi Yapan</th>
              <th>Not</th>
            </tr>
          </thead>
          <tbody>
            {movements.map(m => (
              <tr key={m.id}>
                <td>{new Date(m.created_at).toLocaleString('tr-TR')}</td>
                <td>
                  <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: m.movement_type === 'giris' ? 'var(--bg-success-light)' : 'var(--bg-danger-light)', color: m.movement_type === 'giris' ? 'var(--status-success)' : 'var(--status-danger)' }}>
                    {m.movement_type === 'giris' ? 'Giriş' : 'Çıkış'}
                  </span>
                </td>
                <td>{m.inventory_items?.name}</td>
                <td style={{ fontWeight: 600 }}>{m.movement_type === 'giris' ? '+' : '-'}{m.quantity} {m.inventory_items?.unit}</td>
                <td>
                  <div>{m.destination_region || 'Merkez'}</div>
                  {m.events && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.events.event_name}</div>}
                </td>
                <td>{m.users?.full_name}</td>
                <td style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{m.notes || '-'}</td>
              </tr>
            ))}
            {movements.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Geçmiş bulunamadı.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
