
'use client';
import { useState } from 'react';
import { LegacyInventoryTab } from './LegacyInventoryTab';
import { CurrentStockTab } from './CurrentStockTab';
import { StockMovementTab } from './StockMovementTab';
import { HistoryTab } from './HistoryTab';
import { Package, Plus, ClipboardList, Clock } from 'lucide-react';
import { useRole } from '@/context/RoleContext';

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState('stock'); // 'stock', 'movement', 'history', 'legacy'
  const { currentRole } = useRole();

  const isManager = currentRole === 'resource_manager' || currentRole === 'general_admin';

  return (
    <div className="dashboard-container">
      <div className="header-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="dashboard-title">Envanter Yönetimi</h1>
          <p className="dashboard-subtitle">Merkez ve bölgelerdeki malzeme stoklarını yönetin.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '2rem', overflowX: 'auto' }}>
        <button 
          className={`tab-button ${activeTab === 'stock' ? 'active' : ''}`} 
          onClick={() => setActiveTab('stock')}
          style={{ padding: '0.75rem 1rem', borderBottom: activeTab === 'stock' ? '2px solid var(--color-primary)' : 'none', color: activeTab === 'stock' ? 'var(--color-primary)' : 'var(--text-muted)', fontWeight: activeTab === 'stock' ? 600 : 400, display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', borderBottomWidth: '2px', borderBottomStyle: 'solid', borderBottomColor: activeTab === 'stock' ? 'var(--color-primary)' : 'transparent', cursor: 'pointer' }}
        >
          <Package size={18} />
          Anlık Stok
        </button>
        {isManager && (
          <button 
            className={`tab-button ${activeTab === 'movement' ? 'active' : ''}`} 
            onClick={() => setActiveTab('movement')}
            style={{ padding: '0.75rem 1rem', color: activeTab === 'movement' ? 'var(--color-primary)' : 'var(--text-muted)', fontWeight: activeTab === 'movement' ? 600 : 400, display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', borderBottomWidth: '2px', borderBottomStyle: 'solid', borderBottomColor: activeTab === 'movement' ? 'var(--color-primary)' : 'transparent', cursor: 'pointer' }}
          >
            <Plus size={18} />
            Stok Girişi
          </button>
        )}
        <button 
          className={`tab-button ${activeTab === 'history' ? 'active' : ''}`} 
          onClick={() => setActiveTab('history')}
          style={{ padding: '0.75rem 1rem', color: activeTab === 'history' ? 'var(--color-primary)' : 'var(--text-muted)', fontWeight: activeTab === 'history' ? 600 : 400, display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', borderBottomWidth: '2px', borderBottomStyle: 'solid', borderBottomColor: activeTab === 'history' ? 'var(--color-primary)' : 'transparent', cursor: 'pointer' }}
        >
          <Clock size={18} />
          Hareket Geçmişi
        </button>
        <button 
          className={`tab-button ${activeTab === 'legacy' ? 'active' : ''}`} 
          onClick={() => setActiveTab('legacy')}
          style={{ padding: '0.75rem 1rem', color: activeTab === 'legacy' ? 'var(--color-primary)' : 'var(--text-muted)', fontWeight: activeTab === 'legacy' ? 600 : 400, display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', borderBottomWidth: '2px', borderBottomStyle: 'solid', borderBottomColor: activeTab === 'legacy' ? 'var(--color-primary)' : 'transparent', cursor: 'pointer' }}
        >
          <ClipboardList size={18} />
          Envanter Talepleri (Eski)
        </button>
      </div>

      <div>
        {activeTab === 'stock' && <CurrentStockTab />}
        {activeTab === 'movement' && isManager && <StockMovementTab />}
        {activeTab === 'history' && <HistoryTab />}
        {activeTab === 'legacy' && <LegacyInventoryTab />}
      </div>
    </div>
  );
}
