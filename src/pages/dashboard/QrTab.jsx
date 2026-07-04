import React, { useState, useRef, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

// Helper to pre-convert remote image URLs to local Data URLs to bypass CORS constraints on canvas
async function urlToDataUrl(url) {
  if (!url) return null;
  // If it's already a data URL, return as-is
  if (url.startsWith('data:')) return url;
  try {
    const res = await fetch(url, { mode: 'cors', cache: 'force-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('[QR card] logo pre-fetch failed:', err);
    return null;
  }
}

// sizePx is the target width (card fits inside sizePx wide). Card ratio is 5:7 (A6-ish, portrait).
function buildCardSVG({ id, company, url, sizePx, includeQrColor = 'brand', qrSvgElement, title, omitLogo = false, logoHref }) {
  const W = sizePx;
  const H = Math.round(sizePx * 7 / 5);
  const primary = company.theme_color || '#FF5722';
  const nameEn = company.name_en || '';
  const nameAr = company.name_ar || '';
  const resolvedLogoHref = (omitLogo || !logoHref) ? '' : logoHref;
  const qrColor = includeQrColor === 'black' ? '#000000' : primary;

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('xmlns', svgNS);
  svg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  svg.setAttribute('width', W);
  svg.setAttribute('height', H);
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('fill', 'none');

  // white background with rounded corners
  const bg = document.createElementNS(svgNS, 'rect');
  bg.setAttribute('x', 0); bg.setAttribute('y', 0);
  bg.setAttribute('width', W); bg.setAttribute('height', H);
  bg.setAttribute('rx', W * 0.035);
  bg.setAttribute('fill', '#FFFFFF');
  svg.appendChild(bg);

  // Logo circle (top center)
  const logoR = W * 0.13;
  const logoCX = W / 2;
  const logoCY = H * 0.14;
  if (resolvedLogoHref) {
    const defs = document.createElementNS(svgNS, 'defs');
    const clip = document.createElementNS(svgNS, 'clipPath');
    // Ensure unique clip path ID per card instance and resolution to prevent DOM collision
    const clipId = `logoClip-${id}-${W}`;
    clip.setAttribute('id', clipId);
    const clipC = document.createElementNS(svgNS, 'circle');
    clipC.setAttribute('cx', logoCX); clipC.setAttribute('cy', logoCY); clipC.setAttribute('r', logoR);
    clip.appendChild(clipC);
    defs.appendChild(clip);
    svg.appendChild(defs);

    const img = document.createElementNS(svgNS, 'image');
    img.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', resolvedLogoHref);
    img.setAttribute('href', resolvedLogoHref); // both spellings for compatibility
    img.setAttribute('x', logoCX - logoR);
    img.setAttribute('y', logoCY - logoR);
    img.setAttribute('width', logoR * 2);
    img.setAttribute('height', logoR * 2);
    img.setAttribute('clip-path', `url(#${clipId})`);
    img.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    svg.appendChild(img);
  }
  // logo ring - stroke-width bumped to 0.008 per specification
  const ring = document.createElementNS(svgNS, 'circle');
  ring.setAttribute('cx', logoCX);
  ring.setAttribute('cy', logoCY);
  ring.setAttribute('r', logoR);
  ring.setAttribute('fill', 'none');
  ring.setAttribute('stroke', primary);
  ring.setAttribute('stroke-width', Math.max(3, W * 0.008));
  svg.appendChild(ring);

  // Name (EN)
  const nameY = H * 0.30;
  const nameText = document.createElementNS(svgNS, 'text');
  nameText.setAttribute('x', W / 2);
  nameText.setAttribute('y', nameY);
  nameText.setAttribute('text-anchor', 'middle');
  nameText.setAttribute('font-family', "'Inter', system-ui, sans-serif");
  nameText.setAttribute('font-weight', '800');
  nameText.setAttribute('font-size', W * 0.075);
  nameText.setAttribute('fill', '#14110F');
  nameText.textContent = nameEn;
  svg.appendChild(nameText);

  // Name (AR)
  if (nameAr) {
    const nameArText = document.createElementNS(svgNS, 'text');
    nameArText.setAttribute('x', W / 2);
    nameArText.setAttribute('y', nameY + W * 0.075);
    nameArText.setAttribute('text-anchor', 'middle');
    nameArText.setAttribute('font-family', "'Cairo', system-ui, sans-serif");
    nameArText.setAttribute('font-weight', '700');
    nameArText.setAttribute('font-size', W * 0.06);
    nameArText.setAttribute('fill', '#6b6b6b');
    nameArText.setAttribute('direction', 'rtl');
    nameArText.textContent = nameAr;
    svg.appendChild(nameArText);
  }

  // Heading in brand color (Category/Branch Title)
  const headingY = nameY + W * 0.155;
  const heading = document.createElementNS(svgNS, 'text');
  heading.setAttribute('x', W / 2);
  heading.setAttribute('y', headingY);
  heading.setAttribute('text-anchor', 'middle');
  heading.setAttribute('font-family', "'Inter', system-ui, sans-serif");
  heading.setAttribute('font-weight', '700');
  heading.setAttribute('font-size', W * 0.045);
  heading.setAttribute('fill', primary);
  heading.textContent = title || 'Restaurant Menu QR';
  svg.appendChild(heading);

  // Tagline EN
  const taglineY = headingY + W * 0.048;
  const tag = document.createElementNS(svgNS, 'text');
  tag.setAttribute('x', W / 2);
  tag.setAttribute('y', taglineY);
  tag.setAttribute('text-anchor', 'middle');
  tag.setAttribute('font-family', "'Inter', system-ui, sans-serif");
  tag.setAttribute('font-size', W * 0.036);
  tag.setAttribute('fill', '#6b6b6b');
  tag.textContent = 'Scan to view our menu';
  svg.appendChild(tag);

  // Tagline AR
  const tagArY = taglineY + W * 0.045;
  const tagAr = document.createElementNS(svgNS, 'text');
  tagAr.setAttribute('x', W / 2);
  tagAr.setAttribute('y', tagArY);
  tagAr.setAttribute('text-anchor', 'middle');
  tagAr.setAttribute('font-family', "'Cairo', system-ui, sans-serif");
  tagAr.setAttribute('font-size', W * 0.036);
  tagAr.setAttribute('fill', '#8a8a8a');
  tagAr.setAttribute('direction', 'rtl');
  tagAr.textContent = 'امسح لمشاهدة قائمتنا';
  svg.appendChild(tagAr);

  // QR box (centered, ~55% of card width)
  const qrSize = W * 0.55;
  const qrX = (W - qrSize) / 2;
  const qrY = tagArY + W * 0.05;

  if (qrSvgElement) {
    const qrClone = qrSvgElement.cloneNode(true);
    qrClone.setAttribute('x', qrX);
    qrClone.setAttribute('y', qrY);
    qrClone.setAttribute('width', qrSize);
    qrClone.setAttribute('height', qrSize);
    
    // Force fg color on any path children with the chosen color:
    qrClone.querySelectorAll('path').forEach(p => {
      const fill = p.getAttribute('fill');
      if (fill && fill.toLowerCase() !== '#ffffff' && fill.toLowerCase() !== 'white') {
        p.setAttribute('fill', qrColor);
      }
    });
    svg.appendChild(qrClone);
  }

  // URL text (below QR)
  const urlY = qrY + qrSize + W * 0.05;
  const urlText = document.createElementNS(svgNS, 'text');
  urlText.setAttribute('x', W / 2);
  urlText.setAttribute('y', urlY);
  urlText.setAttribute('text-anchor', 'middle');
  urlText.setAttribute('font-family', 'ui-monospace, "SF Mono", Consolas, monospace');
  urlText.setAttribute('font-size', W * 0.028);
  urlText.setAttribute('fill', '#8a8a8a');
  // Truncate if too long
  const displayUrl = url.length > 48 ? url.substring(0, 45) + '…' : url;
  urlText.textContent = displayUrl;
  svg.appendChild(urlText);

  return svg;
}

function QrCardItem({ id, company, title, url, filename, qrColor, resolvedColor, showToast, isLocked }) {
  const containerRef = useRef(null);
  const qrRef = useRef(null);

  // Pre-resolved base64 logo source
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const [logoResolving, setLogoResolving] = useState(false);

  // Convert company logo to data URL on mount or whenever it changes
  useEffect(() => {
    let cancelled = false;
    if (!company?.logo_url) {
      setLogoDataUrl(null);
      return;
    }
    setLogoResolving(true);
    urlToDataUrl(company.logo_url).then(dataUrl => {
      if (cancelled) return;
      setLogoDataUrl(dataUrl); // null on failure — buildCardSVG will draw an empty ring
      setLogoResolving(false);
    });
    return () => { cancelled = true; };
  }, [company?.logo_url]);

  // Composed SVG preview inside QrCardItem
  useEffect(() => {
    if (!containerRef.current || !qrRef.current) return;
    containerRef.current.innerHTML = '';
    
    const svg = buildCardSVG({
      id,
      company,
      url,
      sizePx: 320,
      includeQrColor: qrColor,
      qrSvgElement: qrRef.current,
      title,
      logoHref: logoDataUrl
    });
    containerRef.current.appendChild(svg);
  }, [id, company, url, qrColor, resolvedColor, title, logoDataUrl]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      showToast(`Link copied: ${title}`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadSVG = () => {
    if (!qrRef.current) return;
    const svg = buildCardSVG({ id, company, url, sizePx: 1024, includeQrColor: qrColor, qrSvgElement: qrRef.current, title, logoHref: logoDataUrl });
    const s = new XMLSerializer().serializeToString(svg);
    const blob = new Blob(['<?xml version="1.0" encoding="UTF-8"?>\n' + s], { type: 'image/svg+xml;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${filename}-card.svg`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleDownloadPNG = async (sizePx = 1024, isPrint = false) => {
    showToast(isPrint ? `Generating high-res card...` : `Generating PNG card...`);
    await document.fonts.ready;
    
    const generate = async (omitLogo) => {
      const svg = buildCardSVG({
        id,
        company,
        url,
        sizePx,
        includeQrColor: qrColor,
        qrSvgElement: qrRef.current,
        title,
        omitLogo,
        logoHref: logoDataUrl
      });
      const svgStr = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      const img = new Image();
      
      return new Promise((resolve, reject) => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = sizePx;
          canvas.height = Math.round(sizePx * 7 / 5);
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          try {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(svgUrl);
            canvas.toBlob((blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Canvas blob generation failed'));
              }
            }, 'image/png');
          } catch (err) {
            URL.revokeObjectURL(svgUrl);
            reject(err);
          }
        };
        img.onerror = (e) => {
          URL.revokeObjectURL(svgUrl);
          reject(e);
        };
        img.src = svgUrl;
      });
    };

    try {
      // Try generating card with logo
      const blob = await generate(false);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = isPrint ? `${filename}-card-print.png` : `${filename}-card.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      console.warn("Retrying PNG generation without logo due to CORS restriction:", err);
      try {
        // Fallback: generate without logo and alert user
        const blob = await generate(true);
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = isPrint ? `${filename}-card-print.png` : `${filename}-card.png`;
        a.click();
        URL.revokeObjectURL(a.href);
        showToast("Logo omitted from PNG (cross-origin block)");
      } catch (err2) {
        console.error("Failed to generate PNG even without logo:", err2);
        showToast("Failed to generate PNG image.");
      }
    }
  };

  return (
    <div className="qr-branch-card-item">
      {/* Hidden QRCodeSVG to copy vector paths from */}
      <div style={{ display: 'none' }}>
        <QRCodeSVG
          ref={qrRef}
          value={url}
          size={256}
          fgColor={resolvedColor}
          bgColor="#FFFFFF"
          level="M"
          includeMargin={false}
        />
      </div>

      <div className="qr-branch-preview-box" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Composed SVG Card Preview Mount Container */}
        <div className="qr-card-container" ref={containerRef} style={{ width: '320px', height: '448px' }} />
        
        {/* Helpful warning if data URL came back null and company.logo_url was set */}
        {!logoResolving && !logoDataUrl && company?.logo_url && (
          <div className="qr-logo-warning" style={{ color: '#d35400', fontSize: '11px', marginTop: '12px', maxWidth: '320px', textAlign: 'center', lineHeight: '1.4' }}>
            ⚠️ Couldn't embed your logo (image server blocked cross-origin download). Uploading a logo through the Profile tab fixes this.
          </div>
        )}
      </div>

      <div className="qr-branch-info-controls">
        <h4 className="qr-branch-title-text">{title}</h4>
        
        <div className="control-group" style={{ marginBottom: '12px' }}>
          <div className="url-copy-box" style={{ gap: '4px' }}>
            <input type="text" readOnly value={url} className="url-copy-input" style={{ fontSize: '11px', padding: '6px' }} />
            <button className="btn-copy-url" onClick={handleCopyLink} style={{ fontSize: '11px', padding: '6px 12px' }}>
              Copy
            </button>
          </div>
        </div>

        {!isLocked && (
          <div className="qr-branch-actions-row">
            <button 
              className="btn-qr-download" 
              onClick={() => handleDownloadPNG(1024, false)} 
              style={{ fontSize: '11px', padding: '6px' }}
              disabled={logoResolving}
            >
              PNG
            </button>
            <button 
              className="btn-qr-download" 
              onClick={handleDownloadSVG} 
              style={{ fontSize: '11px', padding: '6px' }}
              disabled={logoResolving}
            >
              SVG
            </button>
            <button 
              className="btn-qr-download primary" 
              onClick={() => handleDownloadPNG(1748, true)} 
              style={{ fontSize: '11px', padding: '6px' }}
              disabled={logoResolving}
            >
              Print Card
            </button>
          </div>
        )}
        
        {logoResolving && (
          <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-soft)', marginTop: '8px' }}>
            Preparing card…
          </div>
        )}
      </div>
    </div>
  );
}

export default function QrTab({ company, branches, isLocked }) {
  const [qrColor, setQrColor] = useState('brand'); // 'brand' | 'black'
  const [toastMessage, setToastMessage] = useState('');
  
  const baseUrl = import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin;
  const resolvedColor = qrColor === 'brand' ? (company?.theme_color || '#C0392B') : '#000000';

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  // Compile QR codes list depending on branches count
  const qrConfigs = [];
  if (!branches || branches.length <= 1) {
    qrConfigs.push({
      id: 'default',
      title: 'Restaurant Menu QR',
      url: `${baseUrl}/menu/${company?.slug}`,
      filename: `${company?.slug}-menu`
    });
  } else {
    // Master QR first
    qrConfigs.push({
      id: 'master',
      title: 'Master QR (Branch Picker)',
      url: `${baseUrl}/menu/${company?.slug}`,
      filename: `${company?.slug}-master`
    });
    // Individual branches
    branches.forEach(b => {
      qrConfigs.push({
        id: b.id,
        title: `${b.name_en} / ${b.name_ar} (Branch)`,
        url: `${baseUrl}/menu/${company?.slug}/${b.slug}`,
        filename: `${company?.slug}-${b.slug}`
      });
    });
  }

  return (
    <div className="qr-tab-layout">
      {toastMessage && <div className="detail-toast">{toastMessage}</div>}

      <div className="settings-card qr-global-color-picker-card" style={{ marginBottom: '20px' }}>
        <div className="qr-color-picker-flex" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 style={{ margin: 0 }}>QR Code Palette</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#7f8c8d' }}>
              Choose whether to style your QR codes using your brand color or standard black.
            </p>
          </div>
          <div className="qr-color-toggle-group" style={{ margin: 0 }}>
            <label className="qr-radio-label">
              <input
                type="radio"
                name="qrColor"
                value="brand"
                checked={qrColor === 'brand'}
                onChange={() => setQrColor('brand')}
                disabled={isLocked}
              />
              <span>Brand Color ({company?.theme_color || '#C0392B'})</span>
            </label>
            <label className="qr-radio-label">
              <input
                type="radio"
                name="qrColor"
                value="black"
                checked={qrColor === 'black'}
                onChange={() => setQrColor('black')}
                disabled={isLocked}
              />
              <span>Black</span>
            </label>
          </div>
        </div>
      </div>

      <div className="qr-multi-branches-grid">
        {qrConfigs.map(config => (
          <QrCardItem
            key={config.id}
            id={config.id}
            company={company}
            title={config.title}
            url={config.url}
            filename={config.filename}
            qrColor={qrColor}
            resolvedColor={resolvedColor}
            showToast={showToast}
            isLocked={isLocked}
          />
        ))}
      </div>
    </div>
  );
}
