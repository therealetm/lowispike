/* Sim only (tools/check-scan-photo.cjs): a fake back camera. getUserMedia returns a moving canvas stream and counts the calls in
   window.__gum, so a check can prove one camera stream serves Barcode and Essen-Foto. Not shipped, not a real iPhone camera. */
(() => { try {
  window.__gum = 0; window.__gumStops = 0;
  const fake = async function () {
    window.__gum++;
    const cv = document.createElement('canvas'); cv.width = 640; cv.height = 480; const g = cv.getContext('2d'); let f = 0;
    const draw = () => { f++; g.fillStyle = '#2a6'; g.fillRect(0, 0, 640, 480); g.fillStyle = '#fff'; g.beginPath(); g.arc(320 + 60 * Math.sin(f / 15), 240, 120, 0, 7); g.fill(); g.fillStyle = '#c33'; g.fillRect(260, 200, 120, 80); };
    draw(); const iv = setInterval(draw, 66);
    const s = cv.captureStream(15);
    s.getTracks().forEach(t => { const st = t.stop.bind(t); t.stop = () => { window.__gumStops++; clearInterval(iv); st(); }; });
    return s;
  };
  if (window.MediaDevices && MediaDevices.prototype) MediaDevices.prototype.getUserMedia = fake;
  try { if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = fake; } catch (e) { }
} catch (e) { } })();
