/* ============================================================
   MAC ZAAB — "Backrooms" end-of-deck prank (auto)
   Auto-armed: when the final slide has been on screen for 5s, the
   page glitches into a liminal / 90s-handcam backrooms scene with a
   low fluorescent hum, then returns to the closing slide.
   Type the secret "boo" to disable it (e.g. during rehearsal) and
   "boo" again to re-enable.
   Pure CSS scene + procedural Web Audio => offline file://-safe.
   ============================================================ */
(function () {
  'use strict';
  var doc = document, body = doc.body;
  var panels = [].slice.call(doc.querySelectorAll('.panel'));
  if (!panels.length) return;
  var lastPanel = panels[panels.length - 1];
  var lastIdx = panels.length - 1;

  var armed = true, firing = false, fired = false, curIdx = 0;
  var timer = null, overlay = null;
  var DELAY = 5000;     // time on the last slide before it fires
  var DURATION = 2600;  // how long the end scene stays before returning
  var INTRO = 3000;     // opening "cold open" length on page load

  function reduced() { return body.classList.contains('reduce-motion'); }

  /* ---------- tiny presenter-only toast ---------- */
  var toast = null, toastTo = null;
  function showToast(msg) {
    if (!toast) { toast = doc.createElement('div'); toast.className = 'prank-toast'; body.appendChild(toast); }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTo);
    toastTo = setTimeout(function () { toast.classList.remove('show'); }, 1300);
  }

  /* ---------- audio: fluorescent hum + low drone (no scream) ---------- */
  var AC = window.AudioContext || window.webkitAudioContext;
  var actx = null, master = null, hum = null;
  function ensureCtx() {
    if (actx || !AC) return;
    actx = new AC();
    master = actx.createGain(); master.gain.value = 0; master.connect(actx.destination);
  }
  function unlock() { ensureCtx(); if (actx && actx.state === 'suspended') actx.resume(); }
  doc.addEventListener('pointerdown', unlock, true);
  doc.addEventListener('keydown', unlock, true);

  function startHum() {
    if (!actx) return;
    if (actx.state === 'suspended') actx.resume();
    var g = actx.createGain(); g.gain.value = 0; g.connect(master);
    var lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(g);
    var o1 = actx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 60; o1.connect(lp);
    var o2 = actx.createOscillator(); o2.type = 'square'; o2.frequency.value = 120; o2.connect(lp);
    var dg = actx.createGain(); dg.gain.value = 0.5; dg.connect(g);
    var d = actx.createOscillator(); d.type = 'sine'; d.frequency.value = 42; d.connect(dg);
    // flicker tremolo so the hum "buzzes" like a dying tube
    var lfo = actx.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 8;
    var lfoG = actx.createGain(); lfoG.gain.value = 0.22; lfo.connect(lfoG); lfoG.connect(g.gain);
    o1.start(); o2.start(); d.start(); lfo.start();
    var t = actx.currentTime;
    master.gain.setTargetAtTime(0.9, t, 0.04);
    g.gain.setTargetAtTime(0.2, t, 0.06);
    hum = { g: g, nodes: [o1, o2, d, lfo] };
  }
  function stopHum() {
    if (!actx || !hum) return;
    var t = actx.currentTime, h = hum; hum = null;
    h.g.gain.setTargetAtTime(0, t, 0.12);
    master.gain.setTargetAtTime(0, t, 0.18);
    setTimeout(function () { h.nodes.forEach(function (n) { try { n.stop(); } catch (e) {} }); }, 600);
  }

  /* ---------- the scene ---------- */
  function buildOverlay() {
    overlay = doc.createElement('div');
    overlay.className = 'br';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML =
      '<div class="br__cam"><div class="br__shake"><div class="br__scene">' +
        '<div class="br__wall-l"></div><div class="br__wall-r"></div>' +
        '<div class="br__ceiling"></div><div class="br__floor"></div>' +
        '<div class="br__back"></div>' +
        '<div class="br__light l1"></div><div class="br__light l2"></div>' +
        '<div class="br__light l3"></div><div class="br__light l4"></div>' +
      '</div></div></div>' +
      '<div class="br__track"></div>' +
      '<div class="br__grain"></div><div class="br__scan"></div>' +
      '<div class="br__vig"></div><div class="br__flicker"></div>' +
      '<div class="br__hud">' +
        '<div class="br__rec"><b></b>REC</div>' +
        '<div class="br__bat">▮▮▮ 89%</div>' +
        '<div class="br__time">PM&nbsp;11:58&nbsp;&nbsp;06&nbsp;15&nbsp;1996</div>' +
      '</div>';
    body.appendChild(overlay);
  }

  function onLast() {
    var mode = (window.MZKinetic && window.MZKinetic.getMode) ? window.MZKinetic.getMode() : 'scroll';
    if (mode === 'slide') return curIdx === lastIdx;
    var r = lastPanel.getBoundingClientRect();
    return r.top < window.innerHeight * 0.6 && r.bottom > window.innerHeight * 0.2;
  }

  function schedule() {
    if (!armed || firing || fired) return;
    clearTimeout(timer);
    if (onLast()) timer = setTimeout(fire, DELAY);
  }
  function cancel() { clearTimeout(timer); timer = null; }

  function runScene(duration, skippable) {
    if (firing) return;
    firing = true;
    buildOverlay();
    body.classList.add('backrooms-on');
    startHum();
    var to = setTimeout(endScene, duration);
    if (skippable && overlay) {
      overlay.addEventListener('pointerdown', function () { clearTimeout(to); endScene(); }, { once: true });
    }
  }
  function endScene() {
    stopHum();
    if (overlay) overlay.classList.add('br--out');
    setTimeout(function () {
      if (overlay) { overlay.parentNode && overlay.parentNode.removeChild(overlay); overlay = null; }
      body.classList.remove('backrooms-on');
      firing = false;
    }, 650);
  }

  function fire() {
    if (firing || fired || !armed || !onLast()) return;
    fired = true;                            // one-shot per page load
    runScene(DURATION, false);
  }

  /* ---------- secret arm / disarm: type "boo" ---------- */
  function toggleArm() {
    armed = !armed;
    if (armed) fired = false;                // allow another run after re-enabling
    showToast(armed ? '👻 prank: AUTO (on)' : '⏹ prank: off');
    if (armed) schedule(); else cancel();
  }
  var seq = '';
  doc.addEventListener('keydown', function (e) {
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    var k = (e.key || '').toLowerCase();
    if (k.length !== 1) return;
    seq = (seq + k).slice(-6);
    if (seq.indexOf('boo') >= 0) { seq = ''; toggleArm(); }
  });

  /* ---------- react to navigation ---------- */
  doc.addEventListener('mz:slidechange', function (e) {
    curIdx = (e.detail && typeof e.detail.index === 'number') ? e.detail.index : curIdx;
    if (curIdx === lastIdx) schedule(); else cancel();
  });
  doc.addEventListener('mz:reveal', function (e) {
    if (e.detail && e.detail.panel === lastPanel) schedule(); else cancel();
  });

  /* ---------- opening cold-open: flash the backrooms on load ---------- */
  function intro() { runScene(INTRO, true); }    // tap/click to skip (also unlocks audio)
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', intro);
  else intro();
})();
