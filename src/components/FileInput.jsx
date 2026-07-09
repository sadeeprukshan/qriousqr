import React, { useRef, useState } from 'react';

function Spinner() {
  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fileInputRotate {
          100% { transform: rotate(360deg); }
        }
        .file-input-spinner-svg {
          animation: fileInputRotate 0.8s linear infinite;
          color: var(--primary-color, #FF5722);
        }
      `}} />
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" className="file-input-spinner-svg">
        <circle cx="12" cy="12" r="10" stroke="rgba(0,0,0,0.1)" />
        <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
      </svg>
    </>
  );
}

export default function FileInput({ id, accept = 'image/*', onFile, currentUrl, labelEn, labelAr, lang = 'en', uploading = false }) {
  const inputRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const label = lang === 'ar' ? labelAr : labelEn;

  const handleChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    onFile(f);
  };

  return (
    <div className="file-input-row" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div className="file-input-preview" style={{ position: 'relative', width: '64px', height: '64px', borderRadius: '50%', border: '1px solid var(--border)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB', flexShrink: 0 }} aria-hidden>
        {uploading && (
          <div className="file-input-spinner" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifycontent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.75)', backdropFilter: 'blur(1px)', zIndex: 2 }}>
            <Spinner />
          </div>
        )}
        {currentUrl ? <img src={currentUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span className="file-input-placeholder" style={{ fontSize: '11px', color: 'var(--text-soft)' }}>{lang === 'ar' ? 'لا توجد صورة' : 'No Image'}</span>}
      </div>
      <div className="file-input-controls" style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
        <input
          id={id}
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          style={{ display: 'none' }}
          disabled={uploading}
        />
        <button type="button" className="file-input-btn" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {label || (lang === 'ar' ? 'اختر ملف' : 'Choose file')}
        </button>
        <span className="file-input-name" style={{ fontSize: '11px', color: 'var(--text-soft)' }}>{fileName || (lang === 'ar' ? 'لم يتم اختيار ملف' : 'No file chosen')}</span>
      </div>
    </div>
  );
}
