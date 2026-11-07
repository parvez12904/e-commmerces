import './index.css';
import {
  NATIVE_CATALOG,
  validateCatalog,
  sanitizeBagEntries,
  addItemsToBagEntries,
  findVariantInCatalog,
  formatMoney,
  formatShortlistText,
  type BagEntry,
  type CatalogData,
  type Variant,
} from './catalog';
import {
  clamp,
  wrapN,
  shortestDelta,
  computeRingRank,
  computeRingPose,
  stepRingSpring,
  stepClassicBodySpring,
  computeClassicPose,
  computePhoneSwipeTarget,
  computeDesktopMomentumTarget,
  type ClassicBodyState,
} from './runway-math';

const STORAGE_KEY = 'runway-styling-bag-v3';

class StylingBag {
  private entries: BagEntry[] = [];
  private catalog: CatalogData | null = null;
  private toastTimer = 0;

  constructor() {
    this.loadFromStorage();
    this.updateCounts();
    this.bindDialog();
  }

  private getCatalog(): CatalogData {
    if (!this.catalog) {
      let raw: unknown;
      try {
        raw = NATIVE_CATALOG;
      } catch {
        throw new Error('The product list could not load.');
      }
      this.catalog = validateCatalog(raw);
    }
    return this.catalog;
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.entries = sanitizeBagEntries(JSON.parse(raw));
      }
    } catch {
      this.entries = [];
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.entries));
    } catch {
      // Ignore storage quota / privacy errors
    }
  }

  public updateCounts(): void {
    const totalQty = this.entries.reduce((sum, e) => sum + e.quantity, 0);
    document.querySelectorAll<HTMLElement>('[data-cart-count]').forEach((el) => {
      el.textContent = String(totalQty);
    });
  }

  public showToast(msg: string): void {
    const statusEl = document.getElementById('bag-status');
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.classList.add('is-on');
    if (this.toastTimer) window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      statusEl.classList.remove('is-on');
    }, 2500);
  }

  public async add(items: { id: number; quantity: number }[]): Promise<void> {
    const catalog = this.getCatalog();
    this.entries = addItemsToBagEntries(this.entries, items, catalog);
    this.saveToStorage();
    this.updateCounts();
    this.renderDialog();
    this.showToast(
      items.length > 1 ? 'Look saved to your styling bag' : 'Piece saved to your styling bag'
    );
  }

  public remove(variantId: number): void {
    this.entries = this.entries.filter((e) => e.id !== variantId);
    this.saveToStorage();
    this.updateCounts();
    this.renderDialog();
  }

  public renderDialog(): void {
    const itemsContainer = document.getElementById('bag-items');
    const totalEl = document.getElementById('bag-total');
    const exportBtn = document.getElementById('export-bag') as HTMLButtonElement | null;
    if (!itemsContainer || !totalEl || !exportBtn) return;

    const catalog = this.getCatalog();
    itemsContainer.innerHTML = '';

    if (this.entries.length === 0) {
      const emptyNote = document.createElement('p');
      emptyNote.className = 'bag-note';
      emptyNote.textContent = 'Your styling bag is empty. Choose a size beside a piece to save it.';
      itemsContainer.appendChild(emptyNote);
      totalEl.textContent = '';
      exportBtn.disabled = true;
      return;
    }

    let subtotal = 0;
    for (const entry of this.entries) {
      const match = findVariantInCatalog(catalog, entry.id);
      if (!match) continue;
      const { item, variant } = match;
      const parsedUrl = new URL(item.url);
      if (parsedUrl.hostname !== 'nike-makknzjs.myshopify.com') {
        throw new Error('Invalid product URL hostname.');
      }

      subtotal += item.price * entry.quantity;

      const row = document.createElement('div');
      row.className = 'bag-row';

      const img = document.createElement('img');
      img.src = item.image;
      img.width = 60;
      img.height = 80;
      img.alt = item.name;

      const info = document.createElement('div');
      const h3 = document.createElement('h3');
      h3.textContent = item.name;

      const meta = document.createElement('p');
      const sizeStr = variant.o.join(' / ');
      meta.textContent = `Size ${sizeStr} · Quantity ${entry.quantity} · ${formatMoney(item.price)}`;

      const link = document.createElement('a');
      link.href = item.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'View original piece ↗';

      info.append(h3, meta, link);

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'bag-remove';
      removeBtn.setAttribute('aria-label', `Remove ${item.name}`);
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', () => {
        this.remove(entry.id);
      });

      row.append(img, info, removeBtn);
      itemsContainer.appendChild(row);
    }

    totalEl.textContent = subtotal > 0 ? `Reference subtotal ${formatMoney(subtotal)}` : '';
    exportBtn.disabled = this.entries.length === 0;
  }

  private exportShortlist(): void {
    if (this.entries.length === 0) return;
    const catalog = this.getCatalog();
    const content = formatShortlistText(this.entries, catalog);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'runway-outfit-shortlist.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  private bindDialog(): void {
    const openBtn = document.getElementById('open-bag');
    const closeBtn = document.getElementById('close-bag');
    const exportBtn = document.getElementById('export-bag');
    const dialog = document.getElementById('bag-dialog') as HTMLDialogElement | null;

    openBtn?.addEventListener('click', () => {
      if (!dialog) return;
      this.renderDialog();
      dialog.showModal();
    });

    closeBtn?.addEventListener('click', () => {
      dialog?.close();
    });

    exportBtn?.addEventListener('click', () => {
      this.exportShortlist();
    });

    dialog?.addEventListener('click', (e) => {
      if (e.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      const inside =
        e.clientX >= r.left &&
        e.clientX <= r.right &&
        e.clientY >= r.top &&
        e.clientY <= r.bottom;
      if (!inside) {
        dialog.close();
      }
    });
  }
}

const bag = new StylingBag();

interface BodyRecord extends ClassicBodyState {
  el: HTMLElement;
  hit: HTMLButtonElement | null;
  look: number;
  lastBlur: number;
}

class RunwaySection extends HTMLElement {
  private stage!: HTMLElement;
  private actorsEl!: HTMLElement;
  private heroes: HTMLElement[] = [];
  private ticks: HTMLButtonElement[] = [];
  private panels: HTMLElement[] = [];
  private liveEl: HTMLElement | null = null;
  private piecesLabelEl: HTMLElement | null = null;
  private autoBtn: HTMLButtonElement | null = null;
  private cursorEl: HTMLElement | null = null;
  private lbEl: HTMLElement | null = null;
  private lbStageEl: HTMLElement | null = null;
  private lbKickerEl: HTMLElement | null = null;
  private lbNameEl: HTMLElement | null = null;
  private lbCloseBtn: HTMLButtonElement | null = null;

  private bodies: BodyRecord[] = [];
  private n = 6;
  private N = 12;

  private index = 0;
  private target = 0;
  private cur = 0;
  private vel = 0;
  private K = 95;
  private lag = 0.04;

  private isMobile = false;
  private mode: 'ring' | 'classic' = 'ring';
  private W = 800;
  private H = 600;
  private fs = 1.08;
  private unit = 240;
  private still = false;

  private lastVw = 0;
  private lastVh = 0;

  private rafId = 0;
  private rafFallbackTimer = 0;
  private lastFrameTime = 0;
  private visible = true;
  private playing = false;
  private autoTimer = 0;
  private panelHover = false;
  private zoomed = false;
  private engaged = false;
  private dragging = false;
  private suppressClickUntil = 0;

  // Pointer drag state
  private ptrDown = false;
  private ptrId = -1;
  private startX = 0;
  private startY = 0;
  private startTarget = 0;
  private samples: { x: number; time: number }[] = [];

  // Wheel state
  private wheelAcc = 0;
  private wheelLockUntil = 0;

  // Custom cursor state
  private hasFineCursor = false;
  private curX = 0;
  private curY = 0;
  private curTX = 0;
  private curTY = 0;
  private curRaf = 0;
  private curInit = false;

  // Mobile sheet state
  private sheetHost: HTMLElement | null = null;
  private activeSheetCard: HTMLElement | null = null;
  private activeSheetPicker: HTMLElement | null = null;

  // Lightbox state
  private lbCleanTimer = 0;

  // Observers & listeners
  private ioVis: IntersectionObserver | null = null;
  private ioRev: IntersectionObserver | null = null;
  private roStage: ResizeObserver | null = null;
  private resizeTimer = 0;

  private onWinResize = () => {
    if (this.resizeTimer) window.clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(() => {
      this.measure();
      this.kick();
    }, 120);
  };

  private onDocVis = () => {
    if (document.hidden) {
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = 0;
      }
      if (this.rafFallbackTimer) {
        window.clearTimeout(this.rafFallbackTimer);
        this.rafFallbackTimer = 0;
      }
    } else {
      this.restartAutoBar();
      this.kick();
    }
  };

  connectedCallback(): void {
    this.stage = this.querySelector<HTMLElement>('[data-rw-stage]')!;
    this.actorsEl = this.querySelector<HTMLElement>('[data-rw-actors]')!;
    this.heroes = Array.from(this.querySelectorAll<HTMLElement>('[data-rw-hero]'));
    this.ticks = Array.from(this.querySelectorAll<HTMLButtonElement>('[data-rw-tick]'));
    this.panels = Array.from(this.querySelectorAll<HTMLElement>('[data-rw-panel]'));
    this.liveEl = this.querySelector<HTMLElement>('[data-rw-live]');
    this.piecesLabelEl = this.querySelector<HTMLElement>('[data-rw-pieces]');
    this.autoBtn = this.querySelector<HTMLButtonElement>('[data-rw-auto]');
    this.cursorEl = this.querySelector<HTMLElement>('[data-rw-cursor]');
    this.lbEl = this.querySelector<HTMLElement>('[data-rw-lb]');
    this.lbStageEl = this.querySelector<HTMLElement>('[data-rw-lb-stage]');
    this.lbKickerEl = this.querySelector<HTMLElement>('[data-rw-lb-kicker]');
    this.lbNameEl = this.querySelector<HTMLElement>('[data-rw-lb-name]');
    this.lbCloseBtn = this.querySelector<HTMLButtonElement>('[data-rw-zoom-close]');

    const origModels = Array.from(this.actorsEl.querySelectorAll<HTMLElement>('[data-rw-model]'));
    this.n = origModels.length || 6;
    this.N = this.n * Math.ceil(8 / this.n);

    // Clone bodies 0..5 into 6..11
    const allModels: HTMLElement[] = [...origModels];
    for (let a = this.n; a < this.N; a++) {
      const src = origModels[a % this.n];
      const clone = src.cloneNode(true) as HTMLElement;
      clone.setAttribute('data-rw-clone', '');
      clone.setAttribute('data-index', String(a));
      clone.querySelectorAll('img').forEach((img) => {
        img.setAttribute('loading', 'lazy');
      });
      this.actorsEl.appendChild(clone);
      allModels.push(clone);
    }

    const startOffset = this.reducedMotion() ? 0 : 1.15;
    this.target = 0;
    this.cur = -startOffset;
    this.vel = 0;

    this.bodies = allModels.map((el, a) => {
      const initX = wrapN(a, this.N) + startOffset;
      return {
        el,
        hit: el.querySelector<HTMLButtonElement>('[data-rw-go]'),
        a,
        look: a % this.n,
        w: 0,
        x: initX,
        g: initX,
        v: 0,
        from: initX,
        trip: false,
        lastBlur: -1,
      };
    });

    // Decode all model images
    this.querySelectorAll<HTMLImageElement>('img[data-model-image]').forEach((img) => {
      this.watchImageDecode(img);
    });

    // Probe feet for each hero
    this.heroes.forEach((hero, i) => {
      const probeUrl = hero.getAttribute('data-probe');
      if (probeUrl) {
        this.probeFootOffset(i, probeUrl);
      }
    });

    // Initialize pickers
    this.querySelectorAll<HTMLElement>('[data-rw-card]').forEach((card) => {
      this.syncCardOptions(card, false);
    });

    // Setup custom cursor or remove it
    this.hasFineCursor = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (this.hasFineCursor && this.cursorEl) {
      this.classList.add('rw--cursor');
      this.bindCursor();
    } else if (this.cursorEl) {
      this.cursorEl.remove();
      this.cursorEl = null;
    }

    // Intro reveal
    this.classList.add('rw--js');
    if (this.reducedMotion()) {
      this.classList.add('is-revealed');
    } else {
      this.ioRev = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            this.ioRev?.disconnect();
            this.ioRev = null;
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                this.classList.add('is-revealed');
              });
            });
          }
        },
        { threshold: 0, rootMargin: '0px 0px -22% 0px' }
      );
      this.ioRev.observe(this);
    }

    // Visibility observer for rAF loop & autoplay
    this.ioVis = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        this.visible = entry.isIntersecting;
        if (this.visible) {
          this.restartAutoBar();
          this.kick();
        }
      },
      { threshold: 0 }
    );
    this.ioVis.observe(this);

    // Stage ResizeObserver
    this.roStage = new ResizeObserver(() => {
      this.measure();
      this.kick();
    });
    this.roStage.observe(this.stage);

    window.addEventListener('resize', this.onWinResize);
    document.addEventListener('visibilitychange', this.onDocVis);

    this.bindInteractions();
    this.measure();
    this.setIndex(0, true);

    if (this.dataset.autoplay === 'true' && !this.reducedMotion()) {
      this.play(true);
    }

    this.kick();
  }

  disconnectedCallback(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.rafFallbackTimer) window.clearTimeout(this.rafFallbackTimer);
    if (this.curRaf) cancelAnimationFrame(this.curRaf);
    if (this.autoTimer) window.clearTimeout(this.autoTimer);
    if (this.resizeTimer) window.clearTimeout(this.resizeTimer);
    if (this.lbCleanTimer) window.clearTimeout(this.lbCleanTimer);
    this.ioVis?.disconnect();
    this.ioRev?.disconnect();
    this.roStage?.disconnect();
    window.removeEventListener('resize', this.onWinResize);
    document.removeEventListener('visibilitychange', this.onDocVis);
    this.dockSheet(false);
    this.sheetHost?.remove();
    this.sheetHost = null;
  }

  private reducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private watchImageDecode(img: HTMLImageElement): void {
    const mark = () => img.classList.add('is-decoded');
    if (img.complete && img.naturalWidth > 0) {
      if (typeof img.decode === 'function') {
        img.decode().then(mark).catch(mark);
      } else {
        mark();
      }
      return;
    }
    const onLoad = () => {
      if (typeof img.decode === 'function') {
        img
          .decode()
          .then(mark)
          .catch(() => {
            if (img.naturalWidth > 0) mark();
          });
      } else if (img.naturalWidth > 0) {
        mark();
      }
    };
    img.addEventListener('load', onLoad, { once: true });
    if (typeof img.decode === 'function') {
      img
        .decode()
        .then(mark)
        .catch(() => {
          if (img.naturalWidth > 0) mark();
        });
    }
  }

  private probeFootOffset(lookIndex: number, url: string): void {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const w = 48;
        const h = Math.max(1, Math.round((w * img.naturalHeight) / (img.naturalWidth || 1)));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;
        let lastRow = h - 1;
        outer: for (let y = h - 1; y >= 0; y--) {
          const rowStart = y * w * 4;
          for (let x = 0; x < w; x++) {
            if (data[rowStart + x * 4 + 3] > 40) {
              lastRow = y;
              break outer;
            }
          }
        }
        const foot = clamp((h - 1 - lastRow) / h, 0, 0.4);
        const val = foot.toFixed(4);
        const hero = this.heroes[lookIndex];
        if (hero) hero.style.setProperty('--rw-foot', val);
        this.bodies.forEach((b) => {
          if (b.look === lookIndex) {
            b.el.style.setProperty('--rw-foot', val);
          }
        });
      } catch {
        // Tainted canvas or security error keeps offset 0
      }
    };
    img.src = url;
  }

  private measure(): void {
    const vw = window.innerWidth;
    const vhNow = window.innerHeight;
    const wasMobile = this.isMobile;
    this.isMobile = vw <= 749;

    if (!this.isMobile && wasMobile && this.activeSheetPicker) {
      this.dockSheet(true);
    }

    this.mode = this.isMobile
      ? ((this.dataset.mstyle as 'ring' | 'classic') || 'classic')
      : ((this.dataset.style as 'ring' | 'classic') || 'ring');

    let frameH: number;
    if (!this.isMobile) {
      let headerH = 0;
      document
        .querySelectorAll<HTMLElement>(
          '.shopify-section-group-header-group, #shopify-section-header, #shopify-section-announcement-bar'
        )
        .forEach((el) => {
          if (!el.contains(this)) {
            const r = el.getBoundingClientRect();
            if (r.height > 0) headerH += r.height;
          }
        });
      frameH = Math.max(380, Math.round(vhNow - headerH));
    } else {
      if (!this.lastVh || vw !== this.lastVw || Math.abs(vhNow - this.lastVh) >= 160) {
        this.lastVw = vw;
        this.lastVh = vhNow;
      }
      const mvh = clamp(Number(this.dataset.mheightVh) || 109, 50, 120);
      frameH = Math.round((this.lastVh * mvh) / 100);
    }
    this.style.setProperty('--rw-frame-h', `${frameH}px`);

    const sr = this.stage.getBoundingClientRect();
    this.W = Math.max(1, sr.width || this.stage.clientWidth || vw);
    this.H = Math.max(1, sr.height || this.stage.clientHeight || 500);

    this.fs = this.mode === 'ring' ? 1.08 : 1;
    this.style.setProperty('--rw-fs', String(this.fs));

    let modelH: number;
    let hx: number;
    let hy: number;
    if (this.mode === 'ring') {
      modelH = Math.max(200, Math.round((this.H - 34 - 18) / 1.08));
      hx = 0.5 * this.W;
      hy = 34;
      this.unit = Math.max(this.isMobile ? 90 : 120, 0.3 * this.W);
    } else {
      const ay = this.isMobile ? 22 : 36;
      const padBottom = this.isMobile ? 24 : 36;
      modelH = Math.max(200, Math.round(this.H - padBottom - 18));
      hx = (this.isMobile ? 0.3 : 0.4) * this.W;
      hy = ay;
      const sx = this.isMobile ? 0.32 : 0.125;
      this.unit = Math.max(90, this.W * sx * 1.6);
    }

    this.stage.style.setProperty('--rw-model-h', `${modelH}px`);
    this.stage.style.setProperty('--rw-hx', `${hx.toFixed(1)}px`);
    this.stage.style.setProperty('--rw-hy', `${hy}px`);
    this.style.setProperty('--rw-ax', `${((hx / this.W) * 100).toFixed(1)}%`);

    const fallbackW = Math.round(modelH * 0.5625);
    this.bodies.forEach((b) => {
      b.w = b.el.offsetWidth || fallbackW;
    });

    this.renderAll();
  }

  private setStill(val: boolean): void {
    if (this.still === val) return;
    this.still = val;
    this.classList.toggle('rw--still', val);
  }

  private scheduleNextFrame(): void {
    if (!this.rafId) {
      this.rafId = requestAnimationFrame(this.tickFrame);
    }
    if (this.rafFallbackTimer) {
      window.clearTimeout(this.rafFallbackTimer);
    }
    this.rafFallbackTimer = window.setTimeout(() => {
      this.rafFallbackTimer = 0;
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = 0;
      }
      this.tickFrame(performance.now());
    }, 34);
  }

  private kick(): void {
    if (!this.visible || document.hidden) return;
    if (!this.rafId && !this.rafFallbackTimer) {
      this.lastFrameTime = 0;
      this.scheduleNextFrame();
    }
  }

  private tickFrame = (now: number): void => {
    this.rafId = 0;
    if (this.rafFallbackTimer) {
      window.clearTimeout(this.rafFallbackTimer);
      this.rafFallbackTimer = 0;
    }
    if (!this.visible || document.hidden) return;

    const dt = this.lastFrameTime ? Math.min(0.034, (now - this.lastFrameTime) / 1000) : 1 / 60;
    this.lastFrameTime = now;

    if (this.reducedMotion()) {
      this.cur = this.target;
      this.vel = 0;
      this.bodies.forEach((b) => {
        const g = wrapN(b.a - this.target, this.N);
        b.x = g;
        b.g = g;
        b.v = 0;
        b.trip = false;
      });
      this.setStill(!this.dragging);
      this.renderAll();
      return;
    }

    let allSettled = false;
    if (this.mode === 'ring') {
      const res = stepRingSpring(this.cur, this.vel, this.target, dt, this.K);
      this.cur = res.cur;
      this.vel = res.vel;
      allSettled = res.settled && !this.dragging;
    } else {
      let settledCount = 0;
      for (const b of this.bodies) {
        const s = stepClassicBodySpring(
          b,
          this.target,
          this.N,
          dt,
          this.dragging,
          this.lag,
          this.K
        );
        if (s) settledCount++;
      }
      this.cur = this.target;
      allSettled = settledCount === this.bodies.length && !this.dragging;
    }

    if (allSettled) {
      this.setStill(true);
      this.renderAll();
    } else {
      this.setStill(false);
      this.renderAll();
      this.scheduleNextFrame();
    }
  };

  private renderAll(): void {
    const blurEnabled = this.dataset.blur === 'true';
    for (const b of this.bodies) {
      const pose =
        this.mode === 'ring'
          ? computeRingPose(
              b.a,
              this.cur,
              this.W,
              this.H,
              this.fs,
              this.isMobile,
              this.still,
              blurEnabled,
              this.N
            )
          : computeClassicPose(
              b,
              this.target,
              this.W,
              this.isMobile,
              this.still,
              blurEnabled,
              this.N
            );
      this.put(b, pose.x, pose.bottom, pose.scale, pose.opacity, pose.blur, pose.z);
    }
  }

  private put(
    s: BodyRecord,
    x: number,
    bottom: number,
    scale: number,
    opacity: number,
    blur: number,
    z: number
  ): void {
    let op = opacity;
    const halfW = (s.w * scale) / 2;
    if (x + halfW < -4 || x - halfW > this.W + 4) {
      op = 0;
    }
    s.el.style.transform = `translate3d(${x.toFixed(2)}px, ${(-bottom).toFixed(2)}px, 0) translateX(-50%) scale(${scale.toFixed(4)})`;
    s.el.style.opacity = op.toFixed(3);
    s.el.style.zIndex = String(z);
    s.el.style.visibility = op < 0.01 ? 'hidden' : 'visible';
    s.el.style.pointerEvents = op < 0.5 ? 'none' : 'auto';

    const b = Math.round(blur * 10) / 10;
    if (b !== s.lastBlur) {
      s.lastBlur = b;
      s.el.style.filter = b <= 0.05 ? '' : `blur(${b}px)`;
    }
  }

  private updateBodyAccessibility(): void {
    for (const b of this.bodies) {
      let accessible = false;
      if (this.mode === 'ring') {
        const k = computeRingRank(b.a, this.target, this.N);
        accessible = k !== 0 && Math.abs(k) <= 2;
      } else {
        const k = Math.round(wrapN(b.a - Math.round(this.target), this.N));
        accessible = k !== 0 && k <= 3;
      }
      if (accessible) {
        b.el.removeAttribute('aria-hidden');
        if (b.hit) {
          b.hit.tabIndex = 0;
          b.hit.removeAttribute('aria-hidden');
        }
      } else {
        b.el.setAttribute('aria-hidden', 'true');
        if (b.hit) {
          b.hit.tabIndex = -1;
          b.hit.setAttribute('aria-hidden', 'true');
        }
      }
    }
  }

  private setIndex(nextIdx: number, silent = false): void {
    const i = wrapN(nextIdx, this.n);
    const prevIdx = this.index;
    const changed = i !== prevIdx || silent;
    this.index = i;
    this.updateBodyAccessibility();
    this.kick();

    if (!changed) return;

    if (!silent) {
      this.closePopup();
      if (this.isMobile) {
        this.dockSheet(false);
      }
    }

    const progress = ((i + 1) / this.n).toFixed(3);
    this.style.setProperty('--rw-progress', progress);

    // Toggle heroes
    this.heroes.forEach((h, idx) => {
      const isOn = idx === i;
      const wasOn = !silent && idx === prevIdx && prevIdx !== i;
      h.classList.toggle('is-on', isOn);
      h.classList.toggle('was', wasOn);
      h.setAttribute('aria-hidden', isOn ? 'false' : 'true');
      const zoomBtn = h.querySelector<HTMLButtonElement>('[data-rw-zoom]');
      if (zoomBtn) zoomBtn.tabIndex = isOn ? 0 : -1;
    });

    // Ticks
    this.ticks.forEach((t, idx) => {
      t.setAttribute('aria-current', idx === i ? 'true' : 'false');
      t.classList.toggle('is-past', idx < i);
    });

    // Panels
    this.panels.forEach((p, idx) => {
      if (idx === i) {
        p.hidden = false;
        if (!silent) {
          p.classList.remove('is-in');
          void p.offsetWidth;
          p.classList.add('is-in');
        }
      } else {
        p.hidden = true;
        p.classList.remove('is-in');
      }
    });

    // Pieces label
    const activePanel = this.panels[i];
    const tpl = activePanel?.querySelector<HTMLTemplateElement>('[data-rw-pieces-text]');
    if (this.piecesLabelEl && tpl) {
      this.piecesLabelEl.textContent = tpl.content.textContent?.trim() || '3 pieces';
      if (!silent) {
        this.piecesLabelEl.classList.remove('is-swap');
        void this.piecesLabelEl.offsetWidth;
        this.piecesLabelEl.classList.add('is-swap');
      }
    }

    if (!silent) {
      // Replay sweep
      if (!this.reducedMotion()) {
        this.stage.classList.remove('is-sweep');
        void this.stage.offsetWidth;
        this.stage.classList.add('is-sweep');
      }

      // Live announcement
      const activeHero = this.heroes[i];
      if (this.liveEl && activeHero) {
        this.liveEl.textContent = activeHero.dataset.label || '';
      }
    }

    this.hot(null);
    this.restartAutoBar();
  }

  public moveTo(T: number): void {
    this.target = T;
    this.setStill(false);
    this.setIndex(wrapN(Math.round(T), this.n), false);
  }

  public next(): void {
    this.moveTo(Math.round(this.target) + 1);
  }

  public prev(): void {
    this.moveTo(Math.round(this.target) - 1);
  }

  public go(i: number): void {
    const d = shortestDelta(this.index, i, this.n);
    this.moveTo(Math.round(this.target) + d);
  }

  private play(on: boolean): void {
    this.playing = on;
    this.classList.toggle('is-playing', on);
    if (this.autoBtn) {
      this.autoBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    this.restartAutoBar();
  }

  private engage(): void {
    this.engaged = true;
    if (this.playing) {
      this.play(false);
    }
  }

  private restartAutoBar(): void {
    if (this.autoTimer) {
      window.clearTimeout(this.autoTimer);
      this.autoTimer = 0;
    }
    this.ticks.forEach((t) => t.classList.remove('is-run'));
    if (!this.playing) return;

    const currentTick = this.ticks[this.index];
    if (currentTick) {
      void currentTick.offsetWidth;
      currentTick.classList.add('is-run');
    }

    const speed = Number(this.dataset.speed) || 5000;
    this.autoTimer = window.setTimeout(() => {
      if (
        this.playing &&
        this.visible &&
        !this.dragging &&
        !document.hidden &&
        !this.panelHover &&
        !this.zoomed &&
        !this.engaged
      ) {
        this.next();
      } else {
        this.restartAutoBar();
      }
    }, speed);
  }

  private hot(n: string | number | null, scroll = false): void {
    this.querySelectorAll('.is-hot').forEach((el) => el.classList.remove('is-hot'));
    if (n === null || n === undefined || n === '') return;

    const key = String(n);
    const pinScope = this.zoomed && this.lbStageEl ? this.lbStageEl : this.heroes[this.index];
    const pin = pinScope?.querySelector<HTMLElement>(`[data-rw-pin="${key}"]`);
    pin?.classList.add('is-hot');

    const activePanel = this.panels[this.index];
    const card = activePanel?.querySelector<HTMLElement>(`[data-rw-card="${key}"]`);
    if (card) {
      card.classList.add('is-hot');
      if (scroll) {
        this.revealCard(card);
      }
    }
  }

  private revealCard(card: HTMLElement): void {
    const list = card.closest<HTMLElement>('.rw__items');
    if (!list) return;
    const behavior: ScrollBehavior = this.reducedMotion() ? 'auto' : 'smooth';

    if (list.scrollWidth > list.clientWidth + 4) {
      const cardRect = card.getBoundingClientRect();
      const listRect = list.getBoundingClientRect();
      list.scrollBy({ left: cardRect.left - listRect.left - 20, behavior });
    } else if (list.scrollHeight > list.clientHeight + 4) {
      list.scrollTo({ top: card.offsetTop - list.offsetTop - 12, behavior });
    } else {
      const r = card.getBoundingClientRect();
      if (r.top < 0 || r.bottom > window.innerHeight - 140) {
        window.scrollBy({ top: r.top - 0.3 * window.innerHeight, behavior });
      }
    }
  }

  private openPopup(): void {
    if (this.zoomed || !this.lbEl || !this.lbStageEl) return;
    this.engage();
    this.hot(null);

    if (this.lbCleanTimer) {
      window.clearTimeout(this.lbCleanTimer);
      this.lbCleanTimer = 0;
    }

    const activeHero = this.heroes[this.index];
    if (!activeHero) return;

    const heroFigure = activeHero.querySelector<HTMLElement>('.rw__figure');
    const heroShadow = activeHero.querySelector<HTMLElement>('.rw__shadow');
    if (!heroFigure) return;

    const aRect = heroFigure.getBoundingClientRect();

    this.lbStageEl.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'rw__lb-model';
    const footVal = activeHero.style.getPropertyValue('--rw-foot');
    if (footVal) wrapper.style.setProperty('--rw-foot', footVal);

    if (heroShadow) {
      wrapper.appendChild(heroShadow.cloneNode(true));
    }
    const figClone = heroFigure.cloneNode(true) as HTMLElement;
    figClone.querySelector('[data-rw-zoom]')?.remove();
    figClone.querySelectorAll<HTMLButtonElement>('[data-rw-pin]').forEach((pin) => {
      pin.tabIndex = 0;
    });
    wrapper.appendChild(figClone);
    this.lbStageEl.appendChild(wrapper);

    const stageRect = this.lbStageEl.getBoundingClientRect();
    const stW = stageRect.width || this.W - 96;
    const stH = stageRect.height || this.H - 136;
    const h = Math.max(160, Math.min(stH, stW / 0.5625));
    wrapper.style.setProperty('--rw-model-h', `${Math.round(h)}px`);

    figClone.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
      img.loading = 'eager';
      img.sizes = `${Math.round(h * 0.5625)}px`;
      img.classList.add('is-decoded');
    });

    const word = this.lbEl.dataset.word || 'Look';
    const numStr = String(this.index + 1).padStart(2, '0');
    if (this.lbKickerEl) this.lbKickerEl.textContent = `${word} ${numStr}`;
    if (this.lbNameEl) this.lbNameEl.textContent = activeHero.dataset.name || '';

    this.zoomed = true;
    this.classList.add('rw--zoom');
    this.lbEl.setAttribute('aria-hidden', 'false');

    if (!this.reducedMotion() && aRect.height > 0) {
      const bRect = figClone.getBoundingClientRect();
      if (bRect.height > 0) {
        const dx = aRect.left - bRect.left;
        const dy = aRect.bottom - bRect.bottom;
        const sc = aRect.height / bRect.height;
        wrapper.style.transition = 'none';
        wrapper.style.transformOrigin = '0 100%';
        wrapper.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) scale(${sc.toFixed(4)})`;
        void wrapper.offsetWidth;
        wrapper.style.transition = '';
        wrapper.style.transform = '';
      }
    }

    this.lbCloseBtn?.focus({ preventScroll: true });
  }

  private closePopup(): void {
    if (!this.zoomed || !this.lbEl || !this.lbStageEl) return;
    this.zoomed = false;
    const focusInside = this.lbEl.contains(document.activeElement);

    const wrapper = this.lbStageEl.querySelector<HTMLElement>('.rw__lb-model');
    const figClone = wrapper?.querySelector<HTMLElement>('.rw__figure');
    const activeHero = this.heroes[this.index];
    const heroFigure = activeHero?.querySelector<HTMLElement>('.rw__figure');

    if (!this.reducedMotion() && wrapper && figClone && heroFigure) {
      const aRect = heroFigure.getBoundingClientRect();
      const bRect = figClone.getBoundingClientRect();
      if (aRect.height > 0 && bRect.height > 0) {
        const dx = aRect.left - bRect.left;
        const dy = aRect.bottom - bRect.bottom;
        const sc = aRect.height / bRect.height;
        wrapper.style.transformOrigin = '0 100%';
        wrapper.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) scale(${sc.toFixed(4)})`;
      }
    }

    this.classList.remove('rw--zoom');
    this.lbEl.setAttribute('aria-hidden', 'true');
    this.hot(null);

    if (this.lbCleanTimer) window.clearTimeout(this.lbCleanTimer);
    this.lbCleanTimer = window.setTimeout(
      () => {
        if (!this.zoomed && this.lbStageEl) {
          this.lbStageEl.innerHTML = '';
        }
      },
      this.reducedMotion() ? 0 : 950
    );

    if (focusInside) {
      this.stage.focus({ preventScroll: true });
    }
  }

  private ensureSheetHost(): HTMLElement {
    if (!this.sheetHost) {
      const host = document.createElement('div');
      host.className = 'rw-sheet-host';
      const scrim = document.createElement('button');
      scrim.type = 'button';
      scrim.className = 'rw__pick-scrim';
      scrim.setAttribute('data-rw-pick-close', '');
      scrim.tabIndex = -1;
      scrim.setAttribute('aria-hidden', 'true');
      host.appendChild(scrim);

      host.addEventListener('click', (e) => this.handleSectionClick(e));
      host.addEventListener('change', (e) => {
        const target = e.target as HTMLElement;
        if (target.matches('[data-rw-option]') && this.activeSheetCard) {
          this.engage();
          this.syncCardOptions(this.activeSheetCard, true);
        }
      });
      host.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.activeSheetCard) {
          e.preventDefault();
          const addBtn = this.activeSheetCard.querySelector<HTMLButtonElement>('[data-rw-add]');
          this.dockSheet(false);
          addBtn?.focus({ preventScroll: true });
        }
      });

      document.body.appendChild(host);
      this.sheetHost = host;
    }

    const cs = getComputedStyle(this);
    const vars = [
      '--rw-panel',
      '--rw-text',
      '--rw-muted',
      '--rw-line',
      '--rw-accent',
      '--rw-on-accent',
      '--rw-btn-bg',
      '--rw-btn-fg',
      '--rw-btn-radius',
      '--rw-pill-radius',
      '--rw-bar-r',
      '--rw-thumb-radius',
      '--rw-pt-size',
      '--rw-price',
      '--rw-opt',
      '--rw-ease',
      '--rw-ease-sheet',
      '--rw-ease-spring',
    ];
    for (const v of vars) {
      this.sheetHost.style.setProperty(v, cs.getPropertyValue(v));
    }
    this.sheetHost.style.fontFamily = cs.fontFamily;
    this.sheetHost.style.color = cs.color;
    return this.sheetHost;
  }

  private dockSheet(keepOpen = false): void {
    if (!this.activeSheetCard || !this.activeSheetPicker) return;
    const card = this.activeSheetCard;
    const picker = this.activeSheetPicker;
    const addBtn = card.querySelector<HTMLButtonElement>('[data-rw-add]');

    card.appendChild(picker);
    if (!keepOpen) {
      picker.hidden = true;
      card.classList.remove('is-picking');
      addBtn?.setAttribute('aria-expanded', 'false');
    } else {
      picker.hidden = false;
      card.classList.add('is-picking');
      addBtn?.setAttribute('aria-expanded', 'true');
    }

    this.activeSheetCard = null;
    this.activeSheetPicker = null;
    this.sheetHost?.classList.remove('is-open');
    this.classList.remove('rw--picking');
  }

  private openCardPicker(card: HTMLElement, focusRadio = true): void {
    if (card.classList.contains('is-added')) return;
    const picker =
      card.querySelector<HTMLElement>('[data-rw-picker]') ||
      (this.activeSheetCard === card ? this.activeSheetPicker : null);
    if (!picker) return;

    const addBtn = card.querySelector<HTMLButtonElement>('[data-rw-add]');
    this.syncCardOptions(card, false);

    if (this.isMobile) {
      if (this.activeSheetCard && this.activeSheetCard !== card) {
        this.dockSheet(false);
      }
      const host = this.ensureSheetHost();
      this.activeSheetCard = card;
      this.activeSheetPicker = picker;
      picker.hidden = false;
      host.appendChild(picker);
      card.classList.add('is-picking');
      addBtn?.setAttribute('aria-expanded', 'true');
      this.classList.add('rw--picking');
      requestAnimationFrame(() => {
        host.classList.add('is-open');
      });
    } else {
      picker.hidden = false;
      card.classList.add('is-picking');
      addBtn?.setAttribute('aria-expanded', 'true');
      this.revealCard(card);
    }

    if (focusRadio) {
      const checked = picker.querySelector<HTMLInputElement>('input[type="radio"]:checked');
      checked?.focus({ preventScroll: true });
    }
  }

  private closeCardPicker(card: HTMLElement): void {
    if (this.activeSheetCard === card) {
      this.dockSheet(false);
      return;
    }
    const picker = card.querySelector<HTMLElement>('[data-rw-picker]');
    const addBtn = card.querySelector<HTMLButtonElement>('[data-rw-add]');
    if (picker) picker.hidden = true;
    card.classList.remove('is-picking');
    addBtn?.setAttribute('aria-expanded', 'false');
  }

  private toggleCardPicker(card: HTMLElement): void {
    if (card.classList.contains('is-added')) return;
    if (card.classList.contains('is-picking')) {
      this.closeCardPicker(card);
    } else {
      this.openCardPicker(card, true);
    }
  }

  private getCardVariants(card: HTMLElement, picker: HTMLElement): Variant[] {
    const script = picker.querySelector<HTMLScriptElement>('script[data-rw-variants]');
    if (!script) return [];
    try {
      return JSON.parse(script.textContent || '[]') as Variant[];
    } catch {
      return [];
    }
  }

  private syncCardOptions(card: HTMLElement, userInitiated: boolean): void {
    const picker =
      card.querySelector<HTMLElement>('[data-rw-picker]') ||
      (this.activeSheetCard === card ? this.activeSheetPicker : null);
    if (!picker) return;

    const variants = this.getCardVariants(card, picker);
    const radios = Array.from(picker.querySelectorAll<HTMLInputElement>('input[data-rw-option]'));
    const selectedByGroup = new Map<string, string>();
    for (const r of radios) {
      if (r.checked) {
        selectedByGroup.set(r.dataset.rwOption || '0', r.value);
      }
    }

    const optVal = selectedByGroup.get('0') || '';
    const match = variants.find((v) => v.o[0] === optVal);

    // Update availability per pill
    for (const r of radios) {
      const pill = r.closest<HTMLElement>('.rw__pill');
      const avail = variants.some((v) => v.a && v.o[0] === r.value);
      pill?.classList.toggle('is-unavailable', !avail);
    }

    const confirmBtn = picker.querySelector<HTMLButtonElement>('[data-rw-confirm]');
    const confirmLabel = picker.querySelector<HTMLElement>('[data-rw-confirm-label]');
    if (match && match.a) {
      card.dataset.selected = String(match.id);
      if (confirmBtn) confirmBtn.disabled = false;
      if (confirmLabel) confirmLabel.textContent = confirmLabel.dataset.add || 'Add to bag';
    } else {
      card.dataset.selected = '';
      if (confirmBtn) confirmBtn.disabled = true;
      if (confirmLabel) confirmLabel.textContent = this.dataset.msgSoldout || 'Sold out';
    }

    if (userInitiated) {
      card.dataset.touched = '1';
    }
  }

  private markCardAdded(card: HTMLElement): void {
    this.closeCardPicker(card);
    card.classList.remove('is-loading', 'is-picking');
    card.classList.add('is-added');
    const addBtn = card.querySelector<HTMLButtonElement>('[data-rw-add]');
    if (addBtn) {
      const addedLabel = addBtn.getAttribute('data-added-label');
      if (addedLabel) addBtn.setAttribute('aria-label', addedLabel);
      addBtn.removeAttribute('aria-expanded');
    }
    if (
      this.isMobile &&
      !this.reducedMotion() &&
      typeof navigator !== 'undefined' &&
      typeof navigator.vibrate === 'function'
    ) {
      try {
        navigator.vibrate(12);
      } catch {
        // Ignore vibrate failure
      }
    }
    const panel = card.closest<HTMLElement>('[data-rw-panel]');
    if (panel) {
      this.checkPanelComplete(panel);
    }
  }

  private checkPanelComplete(panel: HTMLElement): void {
    const cards = Array.from(panel.querySelectorAll<HTMLElement>('[data-rw-card]'));
    if (cards.length >= 2 && cards.every((c) => c.classList.contains('is-added'))) {
      panel.classList.add('is-complete');
      const msgEl = panel.querySelector<HTMLElement>('[data-rw-msg]');
      if (msgEl) msgEl.textContent = '';
    }
  }

  private async confirmCardAdd(card: HTMLElement): Promise<void> {
    if (card.classList.contains('is-added') || card.classList.contains('is-loading')) return;
    card.dataset.touched = '1';
    this.syncCardOptions(card, true);
    const variantId = Number(card.dataset.selected);
    const panel = card.closest<HTMLElement>('[data-rw-panel]');
    const msgEl = panel?.querySelector<HTMLElement>('[data-rw-msg]');
    if (msgEl) msgEl.textContent = '';

    if (!variantId) return;

    card.classList.add('is-loading');
    try {
      await bag.add([{ id: variantId, quantity: 1 }]);
      this.markCardAdded(card);
    } catch {
      card.classList.remove('is-loading');
      if (msgEl) {
        msgEl.textContent = this.dataset.msgError || 'Couldn’t add to bag. Please try again.';
      }
    }
  }

  private async handleAddFullLook(panel: HTMLElement, ctaBtn: HTMLButtonElement): Promise<void> {
    if (panel.classList.contains('is-complete') || ctaBtn.classList.contains('is-loading')) {
      return;
    }

    const msgEl = panel.querySelector<HTMLElement>('[data-rw-msg]');
    if (msgEl) msgEl.textContent = '';

    const cards = Array.from(panel.querySelectorAll<HTMLElement>('[data-rw-card]')).filter(
      (c) => !c.classList.contains('is-added')
    );

    const ready: { card: HTMLElement; id: number }[] = [];
    const pending: HTMLElement[] = [];

    for (const card of cards) {
      const directId = Number(card.dataset.variantId);
      const selectedId = Number(card.dataset.selected);
      if (directId) {
        ready.push({ card, id: directId });
      } else if (card.dataset.touched === '1' && selectedId) {
        ready.push({ card, id: selectedId });
      } else {
        pending.push(card);
      }
    }

    if (ready.length > 0) {
      ctaBtn.classList.add('is-loading');
      ready.forEach((r) => r.card.classList.add('is-loading'));
      try {
        await bag.add(ready.map((r) => ({ id: r.id, quantity: 1 })));
        ready.forEach((r) => this.markCardAdded(r.card));
      } catch {
        ready.forEach((r) => r.card.classList.remove('is-loading'));
        ctaBtn.classList.remove('is-loading');
        if (msgEl) {
          msgEl.textContent = this.dataset.msgError || 'Couldn’t add to bag. Please try again.';
        }
        return;
      }
      ctaBtn.classList.remove('is-loading');
    }

    if (pending.length > 0) {
      if (this.isMobile) {
        this.openCardPicker(pending[0], true);
      } else {
        pending.forEach((c, idx) => this.openCardPicker(c, idx === 0));
      }
      this.revealCard(pending[0]);
      if (msgEl) {
        const names = pending.map((c) => c.dataset.title || '').filter(Boolean);
        const tpl = this.dataset.msgChoose || 'Pick a size for: [items]';
        msgEl.textContent = tpl.replace('[items]', names.join(', '));
      }
    }

    this.checkPanelComplete(panel);
  }

  private bindCursor(): void {
    this.stage.addEventListener('pointermove', (e: PointerEvent) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      const r = this.stage.getBoundingClientRect();
      this.curTX = e.clientX - r.left;
      this.curTY = e.clientY - r.top;

      if (!this.curInit) {
        this.curInit = true;
        this.curX = this.curTX;
        this.curY = this.curTY;
        if (this.cursorEl) {
          this.cursorEl.style.transform = `translate3d(${this.curX.toFixed(1)}px, ${this.curY.toFixed(1)}px, 0)`;
        }
      }
      this.cursorEl?.classList.add('is-on');

      const target = e.target as HTMLElement | null;
      if (!this.dragging && target) {
        const isView = Boolean(target.closest('[data-rw-zoom]'));
        const isLink = Boolean(target.closest('[data-rw-pin], [data-rw-go]'));
        this.cursorEl?.classList.toggle('is-view', isView);
        this.cursorEl?.classList.toggle('is-link', isLink);
      }

      if (!this.curRaf) {
        this.curRaf = requestAnimationFrame(this.stepCursor);
      }
    });

    this.stage.addEventListener('pointerleave', () => {
      this.cursorEl?.classList.remove('is-on', 'is-link', 'is-view');
      this.curInit = false;
    });
  }

  private stepCursor = (): void => {
    this.curRaf = 0;
    if (!this.cursorEl) return;
    const factor = this.reducedMotion() ? 1 : 0.18;
    this.curX += (this.curTX - this.curX) * factor;
    this.curY += (this.curTY - this.curY) * factor;
    this.cursorEl.style.transform = `translate3d(${this.curX.toFixed(1)}px, ${this.curY.toFixed(1)}px, 0)`;

    if (Math.hypot(this.curTX - this.curX, this.curTY - this.curY) >= 0.2) {
      this.curRaf = requestAnimationFrame(this.stepCursor);
    }
  };

  private handleSectionClick(e: MouseEvent): void {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    // 1. pick-close
    const pickClose = target.closest<HTMLElement>('[data-rw-pick-close]');
    if (pickClose) {
      e.preventDefault();
      this.engage();
      const card = pickClose.closest<HTMLElement>('[data-rw-card]') || this.activeSheetCard;
      if (card) {
        const addBtn = card.querySelector<HTMLButtonElement>('[data-rw-add]');
        this.closeCardPicker(card);
        addBtn?.focus({ preventScroll: true });
      }
      return;
    }

    // 2. popup close button
    if (target.closest('[data-rw-zoom-close]')) {
      e.preventDefault();
      this.closePopup();
      return;
    }

    // 3. popup backdrop or popup stage beside model
    if (this.zoomed && this.lbEl && this.lbEl.contains(target)) {
      const inModel = target.closest('.rw__lb-model');
      const inTop = target.closest('.rw__lb-top');
      if (!inModel && !inTop) {
        e.preventDefault();
        this.closePopup();
        return;
      }
    }

    // 4. [data-rw-zoom] opens popup
    if (target.closest('[data-rw-zoom]')) {
      e.preventDefault();
      this.openPopup();
      return;
    }

    // 5. next
    if (target.closest('[data-rw-next]')) {
      e.preventDefault();
      this.next();
      return;
    }

    // 6. prev
    if (target.closest('[data-rw-prev]')) {
      e.preventDefault();
      this.prev();
      return;
    }

    // 7. tick: go(i)
    const tickBtn = target.closest<HTMLButtonElement>('[data-rw-tick]');
    if (tickBtn) {
      e.preventDefault();
      const idx = Number(tickBtn.dataset.rwTick);
      if (Number.isFinite(idx)) this.go(idx);
      return;
    }

    // 8. autoplay toggle
    if (target.closest('[data-rw-auto]')) {
      e.preventDefault();
      if (!this.playing) this.engaged = false;
      this.play(!this.playing);
      return;
    }

    // 9. pin: engage, then hot(n, scroll=true)
    const pinBtn = target.closest<HTMLButtonElement>('[data-rw-pin]');
    if (pinBtn) {
      e.preventDefault();
      this.engage();
      this.hot(pinBtn.dataset.rwPin || null, true);
      return;
    }

    // 10. queue body [data-rw-go]
    const goBtn = target.closest<HTMLButtonElement>('[data-rw-go]');
    if (goBtn) {
      e.preventDefault();
      const bodyEl = goBtn.closest<HTMLElement>('[data-rw-model]');
      const a = Number(bodyEl?.dataset.index ?? goBtn.dataset.rwGo ?? 0);
      const k =
        this.mode === 'ring'
          ? computeRingRank(a, this.target, this.N)
          : Math.round(wrapN(a - Math.round(this.target), this.N));
      if (k !== 0 && Math.abs(k) < 6) {
        this.moveTo(Math.round(this.target) + k);
      } else if (k === 0) {
        this.openPopup();
      }
      return;
    }

    // Engage when interacting with panel controls
    const panelEl = this.querySelector('.rw__panel');
    if (
      panelEl &&
      panelEl.contains(target) &&
      target.closest('button, a, input, select, label')
    ) {
      this.engage();
    }

    // 11. size confirm
    const confirmBtn = target.closest<HTMLButtonElement>('[data-rw-confirm]');
    if (confirmBtn) {
      e.preventDefault();
      this.engage();
      const card = confirmBtn.closest<HTMLElement>('[data-rw-card]') || this.activeSheetCard;
      if (card) {
        void this.confirmCardAdd(card);
      }
      return;
    }

    // 12. plus button
    const addBtn = target.closest<HTMLButtonElement>('[data-rw-add]');
    if (addBtn) {
      e.preventDefault();
      this.engage();
      const card = addBtn.closest<HTMLElement>('[data-rw-card]');
      if (card) {
        this.toggleCardPicker(card);
      }
      return;
    }

    // 13. add full look
    const allBtn = target.closest<HTMLButtonElement>('[data-rw-all]');
    if (allBtn) {
      e.preventDefault();
      this.engage();
      const panel = allBtn.closest<HTMLElement>('[data-rw-panel]');
      if (panel) {
        void this.handleAddFullLook(panel, allBtn);
      }
      return;
    }
  }

  private bindInteractions(): void {
    // Suppress click right after drag
    this.addEventListener(
      'click',
      (e) => {
        if (performance.now() < this.suppressClickUntil) {
          e.preventDefault();
          e.stopPropagation();
        }
      },
      true
    );

    this.addEventListener('click', (e) => this.handleSectionClick(e));

    // Option change in panel
    this.addEventListener('change', (e) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.matches('[data-rw-option]')) {
        this.engage();
        const card = target.closest<HTMLElement>('[data-rw-card]') || this.activeSheetCard;
        if (card) {
          this.syncCardOptions(card, true);
        }
      }
    });

    // Panel hover pause & card hot hover
    const panelContainer = this.querySelector<HTMLElement>('.rw__panel');
    panelContainer?.addEventListener('pointerenter', (e: PointerEvent) => {
      if (e.pointerType === 'mouse') {
        this.panelHover = true;
      }
    });
    panelContainer?.addEventListener('pointerleave', (e: PointerEvent) => {
      if (e.pointerType === 'mouse') {
        this.panelHover = false;
        this.restartAutoBar();
      }
    });

    panelContainer?.addEventListener('pointerover', (e: PointerEvent) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      const card = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-rw-card]');
      if (card) {
        this.hot(card.dataset.rwCard || null, false);
      }
    });
    panelContainer?.addEventListener('pointerout', (e: PointerEvent) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      const fromCard = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-rw-card]');
      const toCard = (e.relatedTarget as HTMLElement | null)?.closest<HTMLElement>(
        '[data-rw-card]'
      );
      if (fromCard && fromCard !== toCard) {
        this.hot(null);
      }
    });

    // Stage pointer drag / swipe
    this.stage.addEventListener('pointerdown', (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (this.zoomed) return;
      this.ptrDown = true;
      this.dragging = false;
      this.ptrId = e.pointerId;
      this.startX = e.clientX;
      this.startY = e.clientY;
      this.startTarget = this.target;
      this.samples = [{ x: e.clientX, time: performance.now() }];
    });

    this.stage.addEventListener('pointermove', (e: PointerEvent) => {
      if (!this.ptrDown || e.pointerId !== this.ptrId) return;
      if (e.pointerType === 'mouse' && e.buttons === 0) {
        this.endDrag(e);
        return;
      }
      const dx = e.clientX - this.startX;
      const dy = e.clientY - this.startY;

      if (!this.dragging) {
        if (Math.abs(dy) > 10 && Math.abs(dy) >= Math.abs(dx)) {
          this.ptrDown = false;
          return;
        }
        if (Math.abs(dx) > 8 && Math.abs(dx) > 1.2 * Math.abs(dy)) {
          this.dragging = true;
          this.classList.add('is-dragging');
          this.setStill(false);
          try {
            this.stage.setPointerCapture(e.pointerId);
          } catch {
            // Ignore capture failure
          }
        }
      }

      if (this.dragging) {
        const now = performance.now();
        this.samples.push({ x: e.clientX, time: now });
        if (this.samples.length > 6) this.samples.shift();
        this.target = this.startTarget - dx / this.unit;
        this.kick();
      }
    });

    const onPtrEnd = (e: PointerEvent) => {
      if (!this.ptrDown || e.pointerId !== this.ptrId) return;
      this.endDrag(e);
    };
    this.stage.addEventListener('pointerup', onPtrEnd);
    this.stage.addEventListener('pointercancel', onPtrEnd);

    // Trackpad horizontal wheel
    this.stage.addEventListener(
      'wheel',
      (e: WheelEvent) => {
        if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
        e.preventDefault();
        const now = performance.now();
        if (now < this.wheelLockUntil) return;
        this.wheelAcc += e.deltaX;
        if (Math.abs(this.wheelAcc) > 45) {
          if (this.wheelAcc > 0) {
            this.next();
          } else {
            this.prev();
          }
          this.wheelAcc = 0;
          this.wheelLockUntil = now + 520;
        }
      },
      { passive: false }
    );

    // Keyboard navigation
    this.stage.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.next();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.prev();
      }
    });

    this.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (this.activeSheetCard) {
          e.preventDefault();
          const addBtn = this.activeSheetCard.querySelector<HTMLButtonElement>('[data-rw-add]');
          this.dockSheet(false);
          addBtn?.focus({ preventScroll: true });
        } else if (this.zoomed) {
          e.preventDefault();
          this.closePopup();
        }
      }
    });
  }

  private endDrag(e: PointerEvent): void {
    this.ptrDown = false;
    try {
      if (this.stage.hasPointerCapture(e.pointerId)) {
        this.stage.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore release failure
    }

    if (!this.dragging) return;
    this.dragging = false;
    this.classList.remove('is-dragging');
    this.suppressClickUntil = performance.now() + 60;

    const now = performance.now();
    this.samples.push({ x: e.clientX, time: now });
    if (this.samples.length > 6) this.samples.shift();

    const first = this.samples[0];
    const last = this.samples[this.samples.length - 1];
    const dt = Math.max(1, last.time - first.time);
    const vx = (last.x - first.x) / dt;
    const dx = e.clientX - this.startX;
    const from = Math.round(this.startTarget);

    if (this.isMobile) {
      const nextT = computePhoneSwipeTarget(from, dx, vx, -1);
      this.moveTo(nextT);
    } else {
      const nextT = computeDesktopMomentumTarget(this.target, from, vx, this.unit, -1);
      this.moveTo(nextT);
    }
  }
}

if (!customElements.get('runway-section')) {
  customElements.define('runway-section', RunwaySection);
}
