// Lock-screen "music player" pager — works in a normal browser tab on iPhone
// and Android, no install. While an <audio> element is playing, the phone keeps
// this page running with the screen locked and shows a media card on the lock
// screen. When the order is ready we swap the silence for a ringing alarm.
//
// iPhone ignores audio.volume set from JavaScript, so the silence file is real
// silence and the alarm file has its loudness baked in.

const SILENCE_SRC = '/sounds/silence.wav';
const ALARM_SRC = '/sounds/order-ready.wav';
const RING_LIMIT_MS = 120000; // stop ringing after 2 minutes

const TEXT = {
  en: {
    pending: (n) => `Preparing · Order #${n}`,
    pendingSub: 'We will ring here when it is ready',
    ready: (n) => `✅ READY · Order #${n}`,
    readySub: 'Please come to the counter',
  },
  ar: {
    pending: (n) => `جاري التحضير · طلب #${n}`,
    pendingSub: 'سنرنّ هنا عند جهوزية طلبك',
    ready: (n) => `✅ جاهز · طلب #${n}`,
    readySub: 'يرجى التوجه إلى الكاونتر',
  },
};

export class OrderAlertPlayer {
  constructor() {
    this.audio = null;
    this.info = null;
    this.status = 'pending';
    this.ringing = false;
    this.ringTimer = null;
    this.onRingingChange = null;
  }

  get active() {
    return !!this.audio;
  }

  /**
   * Start the lock-screen player. MUST be called directly inside a tap handler,
   * before any `await`, or the browser blocks playback.
   * @param {{ orderNumber: string, restaurantName: string, logoUrl?: string, lang?: 'en'|'ar' }} info
   */
  start(info) {
    this.info = info;
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.setAttribute('playsinline', '');
      this.audio.preload = 'auto';
      // If the OS pauses us (e.g. another app grabbed audio), try to resume.
      this.audio.addEventListener('pause', () => {
        if (this.audio && !this._stopping) setTimeout(() => this._resume(), 400);
      });
    }
    this.audio.src = SILENCE_SRC;
    this.audio.loop = true;
    const p = this.audio.play();
    this._applyMetadata();
    this._bindMediaKeys();
    return p;
  }

  setLang(lang) {
    if (!this.info) return;
    this.info.lang = lang;
    this._applyMetadata();
  }

  /** Call on every status change. Rings on 'ready', stops on delivered/cancelled. */
  setStatus(status) {
    if (!this.active) return;
    const prev = this.status;
    this.status = status;
    if (status === 'ready' && prev !== 'ready') {
      this.ring();
    } else if (status === 'delivered' || status === 'cancelled') {
      this.stop();
      return;
    }
    this._applyMetadata();
  }

  ring() {
    if (!this.audio) return;
    this.ringing = true;
    this.audio.src = ALARM_SRC;
    this.audio.loop = true;
    this.audio.play().catch(() => {});
    this._applyMetadata();
    try { navigator.vibrate && navigator.vibrate([500, 200, 500, 200, 500, 200, 800]); } catch {}
    clearTimeout(this.ringTimer);
    this.ringTimer = setTimeout(() => this.stopRinging(), RING_LIMIT_MS);
    this.onRingingChange && this.onRingingChange(true);
  }

  /** Silence the alarm but keep the READY card on the lock screen. */
  stopRinging() {
    if (!this.audio || !this.ringing) return;
    this.ringing = false;
    clearTimeout(this.ringTimer);
    this.audio.src = SILENCE_SRC;
    this.audio.loop = true;
    this.audio.play().catch(() => {});
    this._applyMetadata();
    this.onRingingChange && this.onRingingChange(false);
  }

  stop() {
    this._stopping = true;
    clearTimeout(this.ringTimer);
    if (this.audio) {
      try { this.audio.pause(); this.audio.removeAttribute('src'); this.audio.load(); } catch {}
      this.audio = null;
    }
    if (this.ringing) this.onRingingChange && this.onRingingChange(false);
    this.ringing = false;
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.playbackState = 'none';
        ['play', 'pause', 'stop'].forEach((a) => navigator.mediaSession.setActionHandler(a, null));
      } catch {}
    }
    this._stopping = false;
  }

  _resume() {
    if (this.audio && this.audio.paused) this.audio.play().catch(() => {});
  }

  _applyMetadata() {
    if (!('mediaSession' in navigator) || !this.info) return;
    const tx = TEXT[this.info.lang] || TEXT.en;
    const n = this.info.orderNumber;
    const isReady = this.status === 'ready';
    try {
      const artwork = this.info.logoUrl
        ? [96, 192, 512].map((s) => ({ src: this.info.logoUrl, sizes: `${s}x${s}` }))
        : [{ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }];
      // eslint-disable-next-line no-undef
      navigator.mediaSession.metadata = new MediaMetadata({
        title: isReady ? tx.ready(n) : tx.pending(n),
        artist: this.info.restaurantName || 'QriousQR',
        album: isReady ? tx.readySub : tx.pendingSub,
        artwork,
      });
      navigator.mediaSession.playbackState = 'playing';
    } catch {}
  }

  _bindMediaKeys() {
    if (!('mediaSession' in navigator)) return;
    const onPauseLike = () => {
      // While ringing, the lock-screen pause button silences the alarm.
      // While waiting, ignore it so tracking stays alive.
      if (this.ringing) this.stopRinging();
      else this._resume();
    };
    try {
      navigator.mediaSession.setActionHandler('play', () => this._resume());
      navigator.mediaSession.setActionHandler('pause', onPauseLike);
      navigator.mediaSession.setActionHandler('stop', onPauseLike);
    } catch {}
  }
}
