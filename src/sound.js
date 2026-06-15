/* ============================================================
   MAC ZAAB — cinematic sound design (procedural, asset-free)
   Synthesizes everything with the Web Audio API: an ambient
   bed, slide-change whooshes, count-up impacts and reveal ticks.
   No audio files => the offline file:// build stays self-contained.
   Off by default; the AudioContext is created on first user
   gesture (the Sound toggle), per browser autoplay rules.
   ============================================================ */
(function () {
  'use strict';
  var AC = window.AudioContext || window.webkitAudioContext;
  var btn = document.getElementById('soundToggle');
  var enabled = false;
  var ctx = null, master = null, ambient = null, noiseBuf = null;
  var lastTick = 0;

  function now() { return ctx ? ctx.currentTime : 0; }

  function makeNoise() {
    var len = Math.floor((ctx.sampleRate || 44100) * 1);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function ensureCtx() {
    if (ctx) return true;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    noiseBuf = makeNoise();
    return true;
  }

  /* ---- ambient bed: a low breathing drone + faint shimmer ---- */
  function startAmbient() {
    if (ambient) return;
    var g = ctx.createGain(); g.gain.value = 0.0; g.connect(master);
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.connect(g);

    var o1 = ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = 55;
    var o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = 82.5; // a fifth up
    o1.connect(lp); o2.connect(lp);

    var sh = ctx.createGain(); sh.gain.value = 0.012; sh.connect(master);
    var o3 = ctx.createOscillator(); o3.type = 'triangle'; o3.frequency.value = 220; o3.connect(sh);

    // slow "breathing" LFO on the drone level
    var lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.08;
    var lfoG = ctx.createGain(); lfoG.gain.value = 0.018;
    lfo.connect(lfoG); lfoG.connect(g.gain);

    o1.start(); o2.start(); o3.start(); lfo.start();
    g.gain.setTargetAtTime(0.05, now(), 2.0);
    ambient = { g: g, nodes: [o1, o2, o3, lfo] };
  }

  /* ---- one-shot cues ---- */
  function whoosh(dir) {
    if (!enabled || !ctx) return;
    var t = now();
    var src = ctx.createBufferSource(); src.buffer = noiseBuf;
    var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.8;
    var g = ctx.createGain();
    var f0 = dir < 0 ? 1600 : 320, f1 = dir < 0 ? 320 : 1700;
    bp.frequency.setValueAtTime(f0, t);
    bp.frequency.exponentialRampToValueAtTime(f1, t + 0.34);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
    src.connect(bp); bp.connect(g); g.connect(master);
    src.start(t); src.stop(t + 0.42);
  }

  function thump() {
    if (!enabled || !ctx) return;
    var t = now();
    var o = ctx.createOscillator(); o.type = 'sine';
    var g = ctx.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(58, t + 0.16);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.11, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 0.3);
  }

  function tick() {
    if (!enabled || !ctx) return;
    var t = now();
    if (t - lastTick < 0.05) return;       // throttle bursts of reveals
    lastTick = t;
    var o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 1200;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.03, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 0.1);
  }

  /* ---- enable / disable ---- */
  function setSound(on) {
    if (on && !ensureCtx()) return;        // no Web Audio support
    enabled = on;
    if (on) {
      if (ctx.state === 'suspended') ctx.resume();
      startAmbient();
      master.gain.setTargetAtTime(0.9, now(), 0.4);
    } else if (ctx) {
      master.gain.setTargetAtTime(0.0, now(), 0.3);
    }
    if (btn) {
      btn.setAttribute('aria-pressed', String(on));
      var lbl = btn.querySelector('.lbl');
      if (lbl) lbl.textContent = on ? 'Sound: On' : 'Sound: Off';
    }
  }

  if (btn) btn.addEventListener('click', function () { setSound(!enabled); });
  document.addEventListener('keydown', function (e) {
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (e.key === 's' || e.key === 'S') setSound(!enabled);
  });

  /* ---- react to the presentation ---- */
  document.addEventListener('mz:slidechange', function (e) { whoosh(e.detail && e.detail.dir); });
  document.addEventListener('mz:countdone', function () { thump(); });
  document.addEventListener('mz:reveal', function () { tick(); });
})();
