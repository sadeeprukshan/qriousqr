// Media Session API helper — powers the lock-screen notification banner
// that appears on BOTH iOS Safari and Android Chrome, same as when you
// play a video in Chrome. No install, no permission prompt required.
// Only constraint: the browser tab must stay alive (background is fine).

const SILENT_SRC = '/silent-loop.wav';

export class OrderTrackingSession {
  constructor() {
    this.audio = null;
    this.audioCtx = null;
    this.started = false;
    this.orderData = null;
    this._visibilityHandler = null;
  }

  isMediaSessionSupported() {
    return typeof navigator !== 'undefined' && 'mediaSession' in navigator;
  }

  /**
   * Start the silent audio loop and register the Media Session metadata.
   * MUST be called from inside a user gesture handler (click/tap) — browsers
   * won't allow audio playback otherwise.
   */
  async start({ orderNumber, restaurantName, logoUrl }) {
    if (this.started) {
      this.orderData = { orderNumber, restaurantName, logoUrl };
      return true;
    }

    this.audio = new Audio(SILENT_SRC);
    this.audio.loop = true;
    this.audio.volume = 0.0001; // essentially silent but counts as "playing audio"
    this.audio.preload = 'auto';

    try {
      await this.audio.play();
    } catch (err) {
      console.warn('[mediaSession] audio.play() failed', err);
      throw new Error('audio_play_failed');
    }

    this.orderData = { orderNumber, restaurantName, logoUrl };

    if (this.isMediaSessionSupported()) {
      this._applyMetadata('pending');

      // Lock-screen control handlers. We keep audio playing regardless of
      // pause presses — the "notification" is the point, not actual playback.
      try {
        navigator.mediaSession.setActionHandler('play', () => {
          this.audio && this.audio.play().catch(() => {});
          navigator.mediaSession.playbackState = 'playing';
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          // Allow pause but keep the metadata visible
          navigator.mediaSession.playbackState = 'paused';
        });
      } catch {}
    }

    // Some mobile browsers suspend audio when the tab is hidden, which kills
    // the Media Session. Resume audio when the tab is restored.
    this._visibilityHandler = () => {
      if (!document.hidden && this.audio && this.audio.paused) {
        this.audio.play().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', this._visibilityHandler);

    this.started = true;
    return true;
  }

  _applyMetadata(status) {
    if (!this.isMediaSessionSupported() || !this.orderData) return;
    const { orderNumber, restaurantName, logoUrl } = this.orderData;

    let title;
    let album;
    switch (status) {
      case 'ready':
        title = `✓ READY — Order #${orderNumber}`;
        album = 'Please head to the counter';
        break;
      case 'delivered':
        title = `Delivered — Order #${orderNumber}`;
        album = 'Enjoy your meal!';
        break;
      case 'cancelled':
        title = `Cancelled — Order #${orderNumber}`;
        album = 'Your order was cancelled';
        break;
      default:
        title = `Preparing — Order #${orderNumber}`;
        album = 'We will alert you here when ready';
    }

    try {
      const artwork = logoUrl
        ? [
            { src: logoUrl, sizes: '96x96', type: 'image/jpeg' },
            { src: logoUrl, sizes: '192x192', type: 'image/jpeg' },
            { src: logoUrl, sizes: '512x512', type: 'image/jpeg' },
          ]
        : [];
      // eslint-disable-next-line no-undef
      navigator.mediaSession.metadata = new MediaMetadata({
        title,
        artist: restaurantName || 'QriousQR',
        album,
        artwork,
      });
      navigator.mediaSession.playbackState = 'playing';
    } catch (err) {
      console.warn('[mediaSession] setMetadata failed', err);
    }
  }

  /**
   * Notify the session that the order status changed. Updates the lock-screen
   * banner title; also triggers chime + vibration when flipping to 'ready'.
   */
  updateStatus(status) {
    if (!this.started) return;
    this._applyMetadata(status);
    if (status === 'ready') {
      this._fireReadyAlert();
    }
  }

  _fireReadyAlert() {
    // Vibration (works on Android even when page is backgrounded if session is active)
    try {
      if (navigator.vibrate) navigator.vibrate([400, 150, 400, 150, 400]);
    } catch {}

    // Audible chime via Web Audio API (bypasses the silent-loop volume)
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!this.audioCtx) this.audioCtx = new AC();
      const ctx = this.audioCtx;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      const notes = [660, 880, 1100, 880, 1320];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const start = ctx.currentTime + idx * 0.18;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.4, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.32);
      });
    } catch (err) {
      console.warn('[mediaSession] chime failed', err);
    }
  }

  stop() {
    if (this.audio) {
      try {
        this.audio.pause();
        this.audio.src = '';
        this.audio.load();
      } catch {}
      this.audio = null;
    }
    if (this.isMediaSessionSupported()) {
      try {
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.playbackState = 'none';
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
      } catch {}
    }
    if (this._visibilityHandler) {
      document.removeEventListener('visibilitychange', this._visibilityHandler);
      this._visibilityHandler = null;
    }
    this.started = false;
  }
}

export function createTrackingSession() {
  return new OrderTrackingSession();
}
