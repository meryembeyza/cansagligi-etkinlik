
'use client';
import { LegacyLogisticsTab } from './LegacyLogisticsTab';
import { useRole } from '@/context/RoleContext';

export default function LogisticsPage() {
  const { currentRole } = useRole();

  const isManager = currentRole === 'resource_manager' || currentRole === 'general_admin';

  if (!isManager) {
    return <div className="dashboard-container">Yetkisiz Erişim</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="header-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="dashboard-title">Lojistik ve Kargo Takibi</h1>
          <p className="dashboard-subtitle">Merkezden şehirlere malzeme kargolarını ve etkinlik lojistiklerini yönetin.</p>
        </div>
      </div>

      <div>
        <LegacyLogisticsTab />
      </div>
    </div>
  );
}
