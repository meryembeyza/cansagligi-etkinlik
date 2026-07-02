
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
const supabase = createClient();
import LoadingState from '@/components/ui/LoadingState';

export function CurrentStockTab() {
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('inventory_items').select('*').order('name');
    if (data) setItems(data);
    setIsLoading(false);
  };

  if (isLoading) return <LoadingState />;

  return (
    <div className="card">
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Anlık Stok Durumu</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
        {items.map(item => (
          <div key={item.id} style={{ padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '12px', backgroundColor: 'var(--bg-main)', textAlign: 'center' }}>
            <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>{item.name}</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-primary)' }}>{item.current_stock}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.unit}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
