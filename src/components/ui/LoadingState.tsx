import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  minHeight?: string;
}

export default function LoadingState({ message = 'YҼkleniyor...', minHeight = '300px' }: LoadingStateProps) {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight,
      gap: '1rem',
      backgroundColor: 'var(--bg-card)',
      borderRadius: 'var(--radius-lg)',
      padding: '2rem'
    }}>
      <Loader2 className="animate-spin" color="var(--color-primary)" size={32} />
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>
        {message}
      </p>
    </div>
  );
}
