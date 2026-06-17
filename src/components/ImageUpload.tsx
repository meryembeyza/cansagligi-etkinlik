'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
const supabase = createClient();
import { Upload, X, Loader2 } from 'lucide-react';

interface ImageUploadProps {
  bucket: 'avatars' | 'posters';
  value: string | null;
  onChange: (url: string) => void;
  width?: string;
  height?: string;
  label?: string;
}

export default function ImageUpload({
  bucket,
  value,
  onChange,
  width = '150px',
  height = '150px',
  label = 'Fotoğraf Yükle'
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setError(null);
      setIsUploading(true);

      const file = e.target.files?.[0];
      if (!file) return;

      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
      if (file.size > MAX_FILE_SIZE) {
        throw new Error('Dosya boyutu en fazla 5MB olabilir.');
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Lütfen sadece görsel dosyaları yükleyin.');
      }

      // Create a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      onChange(publicUrl);
    } catch (err) {
      console.error('Error uploading image:', err);
      setError((err as Error).message || 'Görsel yüklenirken bir hata oluştu.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    // Note: We don't delete from storage here to prevent accidental deletion 
    // of images if the form is not saved. Only the reference is removed.
    onChange('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {label && <label style={{ fontSize: '14px', fontWeight: 'bold' }}>{label}</label>}
      
      <div style={{
        width,
        height,
        borderRadius: bucket === 'avatars' ? '50%' : '8px',
        border: '2px dashed #ccc',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        backgroundColor: '#f9f9f9',
        flexShrink: 0
      }}>
        {value ? (
          <>
            <img 
              src={value} 
              alt="Uploaded file" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
            <button
              onClick={handleRemove}
              style={{
                position: 'absolute',
                top: '5px',
                right: '5px',
                background: 'rgba(255, 0, 0, 0.7)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Kaldır"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <label style={{
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            color: '#666',
            width: '100%',
            height: '100%',
            justifyContent: 'center'
          }}>
            {isUploading ? (
              <Loader2 className="animate-spin" size={24} />
            ) : (
              <>
                <Upload size={24} style={{ marginBottom: '8px' }} />
                <span style={{ fontSize: '12px' }}>Yükle</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleUpload}
              disabled={isUploading}
              style={{ display: 'none' }}
            />
          </label>
        )}
      </div>
      
      {error && <div style={{ color: 'red', fontSize: '12px' }}>{error}</div>}
    </div>
  );
}



