/* ============================================================
   MAC ZAAB — CDN build 3D controller (<model-viewer>)
   Adds the real 360 "Spin" button + reveal-time scale-in.
   model-viewer handles orbit / auto-rotate / lighting itself.
   ============================================================ */
(function () {
  'use strict';
  function reduced() { return document.body.classList.contains('reduce-motion'); }

  function toDeg(rad) { return rad * 180 / Math.PI; }

  function spin(mv, btn) {
    if (!mv || btn.classList.contains('spinning')) return;
    btn.classList.add('spinning');
    var paused = mv.getAttribute('auto-rotate') !== null;
    mv.removeAttribute('auto-rotate');
    var o;
    try { o = mv.getCameraOrbit(); } catch (e) { o = null; }
    if (!o) { btn.classList.remove('spinning'); return; }
    var phi = toDeg(o.phi), base = toDeg(o.theta);
    // full 360 in two 180-degree interpolated steps
    mv.cameraOrbit = (base + 180) + 'deg ' + phi + 'deg auto';
    setTimeout(function () { mv.cameraOrbit = (base + 360) + 'deg ' + phi + 'deg auto'; }, 760);
    setTimeout(function () {
      btn.classList.remove('spinning');
      if (paused && !reduced()) mv.setAttribute('auto-rotate', '');
    }, 1620);
  }

  [].forEach.call(document.querySelectorAll('.spin-btn'), function (btn) {
    var mv = document.querySelector(btn.getAttribute('data-target'));
    btn.addEventListener('click', function () { spin(mv, btn); });
  });

  // Auto-rotate follows the Motion toggle (default ON)
  function applyMotion(isReduced) {
    [].forEach.call(document.querySelectorAll('model-viewer'), function (mv) {
      if (isReduced) mv.removeAttribute('auto-rotate');
      else mv.setAttribute('auto-rotate', '');
    });
  }
  applyMotion(reduced());
  document.addEventListener('mz:motion', function (e) { applyMotion(e.detail.reduced); });

  // Entrance: model-viewer reveals itself; we just toggle the .ready loader off
  [].forEach.call(document.querySelectorAll('model-viewer'), function (mv) {
    mv.addEventListener('load', function () {
      var stage = mv.closest('.stage-frame');
      if (stage) stage.classList.add('mv-loaded');
    });
  });

  // No-op hooks so kinetic.js can call them uniformly
  window.MZ3D = {
    onPanelShown: function () {},
    setActiveModel: function () {}
  };
})();
