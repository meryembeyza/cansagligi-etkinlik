'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Check } from 'lucide-react';
import expertiseData from '@/data/expertiseFields.json';

interface ExpertiseMultiSelectProps {
  selectedFields: string[];
  onChange: (fields: string[]) => void;
  otherExpertise?: string;
  onOtherChange?: (val: string) => void;
}

export default function ExpertiseMultiSelect({ selectedFields, onChange, otherExpertise = '', onOtherChange }: ExpertiseMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleField = (field: string) => {
    if (selectedFields.includes(field)) {
      onChange(selectedFields.filter(f => f !== field));
    } else {
      onChange([...selectedFields, field]);
    }
  };

  const hasOther = selectedFields.includes('Diğer');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }} ref={containerRef}>
      <label className="label">Uzmanlık Alanı / Alanları</label>
      
      <div style={{ position: 'relative' }}>
        <div 
          onClick={() => setIsOpen(!isOpen)}
          style={{ 
            minHeight: '42px', 
            padding: '0.5rem 2.5rem 0.5rem 0.75rem', 
            border: '1px solid #d1d5db', 
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'white',
            cursor: 'pointer',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
            alignItems: 'center'
          }}
        >
          {selectedFields.length === 0 ? (
            <span style={{ color: 'var(--text-muted)' }}>Uzmanlık alanı seçin...</span>
          ) : (
            selectedFields.map(f => (
              <span key={f} style={{ 
                backgroundColor: 'var(--color-primary-light)', 
                color: 'var(--color-primary)', 
                padding: '0.1rem 0.5rem', 
                borderRadius: '12px', 
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                {f}
                <X 
                  size={12} 
                  style={{ cursor: 'pointer' }} 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleField(f);
                  }} 
                />
              </span>
            ))
          )}
          <ChevronDown size={18} style={{ position: 'absolute', right: '0.75rem', color: 'var(--text-muted)' }} />
        </div>

        {isOpen && (
          <div style={{ 
            position: 'absolute', 
            top: '100%', 
            left: 0, 
            right: 0, 
            marginTop: '0.25rem',
            backgroundColor: 'white', 
            border: '1px solid #eaeaea', 
            borderRadius: 'var(--radius-md)', 
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
            zIndex: 50,
            maxHeight: '300px',
            overflowY: 'auto',
            padding: '0.5rem'
          }}>
            {Object.entries(expertiseData).map(([category, subs]) => (
              <div key={category} style={{ marginBottom: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '0.25rem 0.5rem', backgroundColor: '#f9fafb' }}>
                  {category}
                </div>
                {subs.map(sub => {
                  const isSelected = selectedFields.includes(sub);
                  return (
                    <div 
                      key={sub}
                      onClick={() => toggleField(sub)}
                      style={{ 
                        padding: '0.5rem 0.75rem', 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.875rem',
                        backgroundColor: isSelected ? 'var(--color-primary-light)' : 'transparent',
                        color: isSelected ? 'var(--color-primary)' : 'var(--text-main)',
                        borderRadius: '4px'
                      }}
                    >
                      {sub}
                      {isSelected && <Check size={16} />}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {hasOther && onOtherChange && (
        <div style={{ marginTop: '0.5rem' }}>
          <input 
            type="text" 
            className="input" 
            placeholder="Lütfen diğer uzmanlık alanını belirtin..." 
            value={otherExpertise}
            onChange={(e) => onOtherChange(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
