'use client';

import { useState, useCallback } from 'react';

export function usePrompt() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [resolver, setResolver] = useState<{ resolve: (value: string | null) => void } | null>(null);

  const prompt = useCallback((msg: string): Promise<string | null> => {
    setMessage(msg);
    setInputValue('');
    setIsOpen(true);
    return new Promise((resolve) => {
      setResolver({ resolve });
    });
  }, []);

  const handleConfirm = () => {
    if (resolver) resolver.resolve(inputValue);
    setIsOpen(false);
  };

  const handleCancel = () => {
    if (resolver) resolver.resolve(null);
    setIsOpen(false);
  };

  const PromptModal = isOpen ? (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ backgroundColor: 'var(--bg-card)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '400px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', border: '1px solid var(--border-color)' }}>
        <p style={{ marginBottom: '1rem', color: 'var(--text-main)', fontSize: '0.95rem', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{message}</p>
        <textarea 
          className="input" 
          rows={3}
          value={inputValue} 
          onChange={(e) => setInputValue(e.target.value)} 
          style={{ width: '100%', marginBottom: '1.5rem', resize: 'vertical' }}
          autoFocus
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button onClick={handleCancel} className="btn btn-outline" style={{ flex: 1 }}>İptal</button>
          <button onClick={handleConfirm} className="btn btn-primary" style={{ flex: 1, backgroundColor: 'var(--color-primary)', color: 'white' }}>Onayla</button>
        </div>
      </div>
    </div>
  ) : null;

  return { PromptModal, prompt };
}
