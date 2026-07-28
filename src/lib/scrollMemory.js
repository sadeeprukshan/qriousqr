const KEY_PREFIX = 'menu-scroll:';

export function saveMenuScroll(tenantSlug) {
  try {
    sessionStorage.setItem(`${KEY_PREFIX}${tenantSlug}`, String(window.scrollY));
  } catch {}
}

export function restoreMenuScroll(tenantSlug) {
  try {
    const y = Number(sessionStorage.getItem(`${KEY_PREFIX}${tenantSlug}`) || 0);
    if (y > 0) {
      // Two rAFs — one for the DOM to lay out, one for images to reserve space
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo({ top: y, behavior: 'auto' });
        });
      });
    }
  } catch {}
}

export function clearMenuScroll(tenantSlug) {
  try {
    sessionStorage.removeItem(`${KEY_PREFIX}${tenantSlug}`);
  } catch {}
}
