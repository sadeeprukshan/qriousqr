import { supabase, isMockMode } from '../supabaseClient.js';

// Converts a URL-safe base64 VAPID public key into the Uint8Array that pushManager.subscribe wants.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function isPushSupported() {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;
}

export function isIOSSafari() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { iOS: false, standalone: false };
  }
  const ua = navigator.userAgent || '';
  const iOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  // iOS 16.4+ supports Web Push only after the page is added to the Home Screen (standalone mode).
  const standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
    || window.navigator.standalone === true;
  return { iOS, standalone };
}

export async function ensureServiceWorker() {
  if (!('serviceWorker' in navigator)) throw new Error('sw_unsupported');
  const reg = (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.register('/sw.js'));
  await navigator.serviceWorker.ready;
  return reg;
}

export async function subscribeForOrder(qrToken) {
  if (!isPushSupported()) throw new Error('push_unsupported');

  const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!publicKey && !isMockMode) throw new Error('vapid_public_key_missing');

  // Ask for permission (iOS requires standalone mode to even show the prompt)
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('permission_denied');

  if (isMockMode) {
    // In mock mode, increment push_subs_count in mock quick orders
    try {
      const list = JSON.parse(localStorage.getItem('qriousqr:mock_quick_orders') || '[]');
      const idx = list.findIndex(o => o.qr_token === qrToken);
      if (idx !== -1) {
        list[idx].push_subs_count = (list[idx].push_subs_count || 0) + 1;
        localStorage.setItem('qriousqr:mock_quick_orders', JSON.stringify(list));
        window.dispatchEvent(new Event('storage'));
      }
    } catch {}
    return true;
  }

  const reg = await ensureServiceWorker();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const json = sub.toJSON();
  const endpoint = json.endpoint;
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!endpoint || !p256dh || !auth) throw new Error('bad_subscription');

  const { error } = await supabase.rpc('quick_order_push_subscribe', {
    p_qr_token: qrToken,
    p_endpoint: endpoint,
    p_p256dh: p256dh,
    p_auth: auth,
    p_user_agent: navigator.userAgent.slice(0, 500),
  });
  if (error) throw error;
  return true;
}
