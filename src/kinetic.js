/* ============================================================
   MAC ZAAB — kinetic engine (shared by both builds)
   Handles: split-word reveals, scroll reveals, count-ups,
   marquee sizing, parallax, and the Scroll <-> Slide mode toggle.
   ============================================================ */
(function () {
  'use strict';

  // Motion is ON by default (this is a kinetic presentation). The OS
  // "reduce motion" setting no longer forces it off — the user controls it
  // with the Motion toggle (button / "A" key). reduceMotion is mutable.
  var reduceMotion = false;
  var doc = document;
  var body = doc.body;
  var panels = [].slice.call(doc.querySelectorAll('.panel'));
  var mode = 'scroll';                // 'scroll' | 'slide'
  var current = 0;                    // active slide index

  /* ---------- 1. Split words into animatable spans ---------- */
  function splitWords(el) {
    if (el.dataset.split === 'done') return;
    var html = el.innerHTML;
    // keep explicit <br> as separators
    var parts = html.split(/(<br\s*\/?>)/i);
    var out = '';
    var i = 0;
    parts.forEach(function (chunk) {
      if (/<br/i.test(chunk)) { out += chunk; return; }
      chunk.split(/\s+/).forEach(function (w) {
        if (!w) return;
        out += '<span class="word" style="--i:' + (i++) + '"><span>' + w + '</span></span> ';
      });
    });
    el.innerHTML = out;
    el.dataset.split = 'done';
  }
  [].forEach.call(doc.querySelectorAll('.kinetic'), splitWords);

  /* ---------- 2. Count-up numbers ---------- */
  function fmt(n, sep, dec) {
    var s = dec > 0 ? n.toFixed(dec) : String(Math.round(n));
    if (sep) {
      var p = s.split('.');
      p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      s = p.join('.');
    }
    return s;
  }
  function countUp(el) {
    if (el.dataset.counted) return;
    el.dataset.counted = '1';
    var target = parseFloat(el.dataset.count);
    var dec = parseInt(el.dataset.decimals || '0', 10);
    var sep = el.dataset.nosep == null;          // separators unless data-nosep present
    var pre = el.dataset.prefix || '';
    var suf = el.dataset.suffix || '';
    if (reduceMotion || isNaN(target)) { el.textContent = pre + fmt(target || 0, sep, dec) + suf; return; }
    var dur = 1500, t0 = null;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      var e = 1 - Math.pow(1 - p, 3);            // easeOutCubic
      el.textContent = pre + fmt(target * e, sep, dec) + suf;
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = pre + fmt(target, sep, dec) + suf;
    }
    requestAnimationFrame(step);
  }

  /* ---------- 3. Reveal a panel's contents ---------- */
  function revealIn(scope) {
    [].forEach.call(scope.querySelectorAll('.kinetic,.reveal,.reveal-l,.reveal-pop'), function (el) {
      el.classList.add('in');
    });
    [].forEach.call(scope.querySelectorAll('[data-count]'), countUp);
    if (window.MZ3D && window.MZ3D.onPanelShown) window.MZ3D.onPanelShown(scope);
  }

  // Replay reveals + count-ups from scratch (used when landing on a slide)
  function replayReveal(scope) {
    if (window.MZ3D && window.MZ3D.onPanelShown) window.MZ3D.onPanelShown(scope);
    if (reduceMotion) { revealIn(scope); return; }
    var els = scope.querySelectorAll('.kinetic,.reveal,.reveal-l,.reveal-pop');
    [].forEach.call(els, function (el) { el.classList.remove('in'); });
    [].forEach.call(scope.querySelectorAll('[data-count]'), function (el) {
      el.removeAttribute('data-counted'); el.textContent = '0';
    });
    void scope.offsetWidth;                       // reflow so the animation restarts
    [].forEach.call(els, function (el) { el.classList.add('in'); });
    [].forEach.call(scope.querySelectorAll('[data-count]'), countUp);
  }

  /* ---------- 4. Scroll-mode reveal observer ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        if (e.target.hasAttribute('data-count')) countUp(e.target);
        if (e.target.classList.contains('panel') && window.MZ3D && window.MZ3D.onPanelShown) {
          window.MZ3D.onPanelShown(e.target);
        }
      }
    });
  }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });

  function observeAll() {
    [].forEach.call(doc.querySelectorAll('.kinetic,.reveal,.reveal-l,.reveal-pop,[data-count]'), function (el) {
      io.observe(el);
    });
    panels.forEach(function (p) { io.observe(p); });
  }

  /* ---------- 5. Marquee: duplicate content for seamless loop ---------- */
  [].forEach.call(doc.querySelectorAll('.marquee__track'), function (tr) {
    tr.innerHTML = tr.innerHTML + tr.innerHTML;   // 2x => translateX(-50%) loops
  });

  /* ---------- 6. Parallax ---------- */
  var plx = [].slice.call(doc.querySelectorAll('[data-parallax]'));
  var ticking = false;
  function onScroll() {
    // progress bar
    var h = doc.documentElement;
    var sc = h.scrollTop || body.scrollTop;
    var max = (h.scrollHeight - h.clientHeight) || 1;
    if (progressBar) progressBar.style.width = (sc / max * 100) + '%';
    if (!reduceMotion && mode === 'scroll') {
      var vh = window.innerHeight;
      plx.forEach(function (el) {
        var r = el.getBoundingClientRect();
        var off = (r.top + r.height / 2 - vh / 2) / vh;
        var f = parseFloat(el.dataset.parallax) || 0.12;
        el.style.transform = 'translate3d(0,' + (off * f * -100).toFixed(2) + 'px,0)';
      });
    }
    ticking = false;
  }
  function reqScroll() { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }
  window.addEventListener('scroll', reqScroll, { passive: true });
  window.addEventListener('resize', reqScroll);

  /* ---------- 7. Mode toggle: Scroll <-> Slide ---------- */
  var progressBar = doc.querySelector('.progress__bar');
  var toggleBtn = doc.getElementById('modeToggle');
  var motionBtn = doc.getElementById('motionToggle');
  var slidenav = doc.querySelector('.slidenav');
  var counter = doc.querySelector('.slidenav .count');
  var prevBtn = doc.getElementById('prevSlide');
  var nextBtn = doc.getElementById('nextSlide');
  var dotsWrap = doc.querySelector('.dots');

  // build dots
  if (dotsWrap) {
    panels.forEach(function (p, i) {
      var b = doc.createElement('button');
      b.setAttribute('aria-label', 'Go to slide ' + (i + 1));
      b.addEventListener('click', function () { goTo(i); });
      dotsWrap.appendChild(b);
    });
  }
  var dots = dotsWrap ? [].slice.call(dotsWrap.children) : [];

  function nearestPanel() {
    var mid = window.innerHeight / 2, best = 0, bestD = Infinity;
    panels.forEach(function (p, i) {
      var r = p.getBoundingClientRect();
      var d = Math.abs(r.top + r.height / 2 - mid);
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  }

  function clearAnim(p) { p.classList.remove('is-active', 'is-leaving', 'from-next', 'from-prev', 'from-init', 'leave-next', 'leave-prev'); }

  function setActive(i, dir) {
    var target = Math.max(0, Math.min(panels.length - 1, i));
    if (typeof dir === 'undefined') dir = target === current ? 0 : (target > current ? 1 : -1);
    var old = current;
    current = target;

    // reset every panel except the one that's about to animate out
    panels.forEach(function (p, k) { if (k !== old || dir === 0) clearAnim(p); });

    // outgoing panel plays a directional exit
    if (dir !== 0 && old !== current) {
      var lp = panels[old];
      clearAnim(lp);
      lp.classList.add('is-leaving', dir > 0 ? 'leave-next' : 'leave-prev');
      (function (el) {
        setTimeout(function () { if (!el.classList.contains('is-active')) clearAnim(el); }, 540);
      })(lp);
    }

    // incoming panel plays a directional entrance (restart the animation)
    var ap = panels[current];
    clearAnim(ap);
    void ap.offsetWidth;
    ap.classList.add('is-active', dir > 0 ? 'from-next' : (dir < 0 ? 'from-prev' : 'from-init'));
    ap.scrollTop = 0;

    if (counter) counter.textContent = (current + 1) + ' / ' + panels.length;
    if (prevBtn) prevBtn.disabled = current === 0;
    if (nextBtn) nextBtn.disabled = current === panels.length - 1;
    dots.forEach(function (d, k) { d.classList.toggle('on', k === current); });

    replayReveal(ap);
    if (window.MZ3D && window.MZ3D.setActiveModel) window.MZ3D.setActiveModel(ap);
  }

  function goTo(i) { if (mode === 'slide') setActive(i, i > current ? 1 : (i < current ? -1 : 0)); }
  function next() { if (mode === 'slide' && current < panels.length - 1) setActive(current + 1, 1); }
  function prev() { if (mode === 'slide' && current > 0) setActive(current - 1, -1); }

  function enterSlide() {
    var start = nearestPanel();
    mode = 'slide';
    body.classList.add('mode-slide');
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-pressed', 'true');
      toggleBtn.querySelector('.lbl').textContent = 'Scroll mode';
      toggleBtn.querySelector('.ico').textContent = '☰';
    }
    if (slidenav) slidenav.setAttribute('aria-hidden', 'false');
    setActive(start);
  }
  function enterScroll() {
    mode = 'scroll';
    var idx = current;
    body.classList.remove('mode-slide');
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-pressed', 'false');
      toggleBtn.querySelector('.lbl').textContent = 'Slide mode';
      toggleBtn.querySelector('.ico').textContent = '▦';
    }
    if (slidenav) slidenav.setAttribute('aria-hidden', 'true');
    panels.forEach(clearAnim);
    if (window.MZ3D && window.MZ3D.setActiveModel) window.MZ3D.setActiveModel(null);
    // jump to where we were
    requestAnimationFrame(function () {
      panels[idx].scrollIntoView({ behavior: 'auto', block: 'start' });
    });
  }
  function toggleMode() { if (mode === 'scroll') enterSlide(); else enterScroll(); }

  if (toggleBtn) toggleBtn.addEventListener('click', toggleMode);
  if (nextBtn) nextBtn.addEventListener('click', next);
  if (prevBtn) prevBtn.addEventListener('click', prev);

  /* ---------- 7b. Motion toggle ---------- */
  function applyMotion() {
    body.classList.toggle('reduce-motion', reduceMotion);
    window.MZ_REDUCED = reduceMotion;
    if (motionBtn) {
      motionBtn.setAttribute('aria-pressed', String(!reduceMotion));
      var lbl = motionBtn.querySelector('.lbl');
      if (lbl) lbl.textContent = reduceMotion ? 'Motion: Off' : 'Motion: On';
    }
    try { doc.dispatchEvent(new CustomEvent('mz:motion', { detail: { reduced: reduceMotion } })); } catch (e) {}
  }
  function setMotion(on) {
    reduceMotion = !on;
    applyMotion();
    if (on) {
      if (mode === 'slide') replayReveal(panels[current]);
      else panels.forEach(function (p) {
        var r = p.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) revealIn(p);
      });
    }
  }
  if (motionBtn) motionBtn.addEventListener('click', function () { setMotion(reduceMotion); });
  applyMotion();   // sync initial state (motion on)

  /* ---------- 8. Keyboard ---------- */
  doc.addEventListener('keydown', function (e) {
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (e.key === 'm' || e.key === 'M') { toggleMode(); return; }
    if (e.key === 'a' || e.key === 'A') { setMotion(reduceMotion); return; }
    if (mode === 'slide') {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prev(); }
      else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
      else if (e.key === 'End') { e.preventDefault(); setActive(panels.length - 1); }
    }
  });

  /* ---------- 9. Init ---------- */
  observeAll();
  // reveal whatever is already on-screen at load
  requestAnimationFrame(function () {
    onScroll();
    panels.forEach(function (p) {
      var r = p.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.9 && r.bottom > 0) revealIn(p);
    });
  });

  // expose a tiny API (used by 3D layer if needed)
  window.MZKinetic = { goTo: goTo, next: next, prev: prev, toggleMode: toggleMode, getMode: function () { return mode; } };
})();
