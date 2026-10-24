/* WebKit sim only: this VM's headless WebKit renderer crashes the moment a page creates an <audio> with a src (even a 404),
   so any tap that plays a sound kills the page. Loaded by tools/check-scan-hold.cjs on WebKit: media becomes a silent stub.
   Not shipped, not a real iPhone problem. */
(() => { try {
  const F = function (src) { this.src = src || ''; this.paused = true; this.currentTime = 0; this.duration = 1; this.volume = 1; this.muted = false; this.loop = false; this.readyState = 4; this._l = {}; };
  F.prototype.play = function () { this.paused = false; return Promise.resolve(); };
  F.prototype.pause = function () { this.paused = true; };
  F.prototype.load = function () { };
  F.prototype.addEventListener = function () { }; F.prototype.removeEventListener = function () { };
  F.prototype.canPlayType = function () { return 'maybe'; };
  F.prototype.setAttribute = function () { }; F.prototype.removeAttribute = function () { };
  window.Audio = F;
  const d = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
  Object.defineProperty(HTMLMediaElement.prototype, 'src', { get() { return this.__src || ''; }, set(v) { this.__src = v; }, configurable: true });
  HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
  HTMLMediaElement.prototype.load = function () { };
  window.__noMedia = true;
} catch (e) { } })();
