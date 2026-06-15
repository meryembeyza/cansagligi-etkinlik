import { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  actionHref?: string;
  actionOnClick?: () => void;
  minHeight?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionText,
  actionHref,
  actionOnClick,
  minHeight = '300px'
}: EmptyStateProps) {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight,
      padding: '3rem 2rem',
      textAlign: 'center',
      backgroundColor: 'var(--bg-card)',
      borderRadius: 'var(--radius-lg)',
      border: '1px dashed #e2e8f0'
    }}>
      <div style={{ 
        width: '64px', 
        height: '64px', 
        borderRadius: '50%', 
        backgroundColor: 'var(--bg-main)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        marginBottom: '1.5rem',
        color: 'var(--text-muted)'
      }}>
        <Icon size={32} strokeWidth={1.5} />
      </div>
      
      <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
        {title}
      </h3>
      
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: '400px', marginBottom: (actionText || actionHref || actionOnClick) ? '2rem' : '0' }}>
        {description}
      </p>

      {(actionText && actionHref) ? (
        <Link href={actionHref} className="btn btn-primary">
          {actionText}
        </Link>
      ) : (actionText && actionOnClick) ? (
        <button onClick={actionOnClick} className="btn btn-primary">
          {actionText}
        </button>
      ) : null}
    </div>
  );
}
