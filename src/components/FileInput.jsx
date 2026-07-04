import React, { useRef, useState } from 'react';

export default function FileInput({ id, accept = 'image/*', onFile, currentUrl, labelEn, labelAr, lang = 'en' }) {
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
    <div className="file-input-row">
      <div className="file-input-preview" aria-hidden>
        {currentUrl ? <img src={currentUrl} alt="" /> : <span className="file-input-placeholder">{lang === 'ar' ? 'لا توجد صورة' : 'No Image'}</span>}
      </div>
      <div className="file-input-controls">
        <input
          id={id}
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          style={{ display: 'none' }}
        />
        <button type="button" className="file-input-btn" onClick={() => inputRef.current?.click()}>
          {label || (lang === 'ar' ? 'اختر ملف' : 'Choose file')}
        </button>
        <span className="file-input-name">{fileName || (lang === 'ar' ? 'لم يتم اختيار ملف' : 'No file chosen')}</span>
      </div>
    </div>
  );
}
