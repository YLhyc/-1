(function () {
  'use strict';

  class ActivityTimer {
    constructor(options) {
      const config = options || {};
      this.idleMs = config.idleMs || 90000;
      this.onTick = config.onTick || function () {};
      this.seconds = Number(config.initialSeconds || 0);
      this.running = false;
      this.lastActivity = Date.now();
      this.lastTick = Date.now();
      this.interval = null;
      this.boundActivity = () => this.activity();
      this.events = ['pointerdown', 'touchstart', 'keydown', 'scroll'];
    }

    activity() {
      this.lastActivity = Date.now();
    }

    start(initialSeconds) {
      if (Number.isFinite(initialSeconds)) this.seconds = Number(initialSeconds);
      if (this.running) return;
      this.running = true;
      this.lastActivity = Date.now();
      this.lastTick = Date.now();
      this.events.forEach(name => window.addEventListener(name, this.boundActivity, { passive: true }));
      this.interval = setInterval(() => this.tick(), 1000);
    }

    tick(nowValue) {
      if (!this.running) return this.seconds;
      const now = Number(nowValue || Date.now());
      const delta = Math.max(0, Math.min(2, (now - this.lastTick) / 1000));
      this.lastTick = now;
      if (document.visibilityState === 'visible' && now - this.lastActivity <= this.idleMs) {
        this.seconds += delta;
        this.onTick(this.seconds);
      }
      return this.seconds;
    }

    pause() {
      if (!this.running) return;
      this.tick();
      this.running = false;
      clearInterval(this.interval);
      this.interval = null;
      this.events.forEach(name => window.removeEventListener(name, this.boundActivity));
    }

    stop() {
      this.pause();
      return Math.round(this.seconds);
    }

    getSeconds() {
      return Math.round(this.seconds);
    }
  }

  window.CardsTimer = { ActivityTimer };
})();
