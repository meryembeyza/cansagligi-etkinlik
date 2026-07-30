
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
const supabase = createClient();
import { toast } from 'react-hot-toast';
import { useRole } from '@/context/RoleContext';

export function StockMovementTab() {
  const { user } = useRole();
  const [items, setItems] = useState<any[]>([]);
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    supabase.from('inventory_items').select('*').order('name').then(({data}: {data: any}) => {
      if(data) setItems(data);
    });
  }, []);

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemId || !quantity) return;

    setIsSubmitting(true);
    try {
      // 1. Update items stock
      const item = items.find(i => i.id === itemId);
      const newStock = (item?.current_stock || 0) + parseInt(quantity);
      
      await supabase.from('inventory_items').update({ current_stock: newStock }).eq('id', itemId);

      // 2. Add movement record
      await supabase.from('inventory_movements').insert([{
        item_id: itemId,
        movement_type: 'giris',
        quantity: parseInt(quantity),
        notes,
        created_by: user?.id
      }]);

      toast.success('Stok girişi başarılı!');
      setItemId('');
      setQuantity('');
      setNotes('');
    } catch(err) {
      toast.error('Hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: '600px' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Merkez Stok Girişi Yap</h2>
      <form onSubmit={handleAddStock} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label className="label">Malzeme</label>
          <select className="input" value={itemId} onChange={e => setItemId(e.target.value)} required>
            <option value="">Seçiniz...</option>
            {items.map(i => <option key={i.id} value={i.id}>{i.name} (Mevcut: {i.current_stock})</option>)}
          </select>
        </div>
        <div>
          <label className="label">Eklenecek Miktar</label>
          <input type="number" min="1" className="input" value={quantity} onChange={e => setQuantity(e.target.value)} required />
        </div>
        <div>
          <label className="label">Notlar</label>
          <input type="text" className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Örn: X firmasından teslim alındı" />
        </div>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>Stok Ekle</button>
      </form>
    </div>
  );
}
