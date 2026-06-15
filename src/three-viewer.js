/* ============================================================
   MAC ZAAB — OFFLINE build 3D viewer (Three.js, file://-safe)
   Parses base64-embedded GLBs from memory (no fetch), so the
   page renders real 3D when double-clicked. Globals expected:
   THREE, THREE.GLTFLoader, THREE.OrbitControls, THREE.RoomEnvironment,
   and window.MZ_MODELS = { key: "<base64 glb>" }.
   WebGL contexts + GLB parsing are created LAZILY on first visibility
   so the page stays light on lower-end machines.
   ============================================================ */
(function () {
  'use strict';
  if (!window.THREE) { console.error('THREE not loaded'); return; }
  // Motion state is driven by kinetic.js via the body.reduce-motion class
  // (set by the Motion toggle). Read it live so toggling takes effect at once.
  function reduced() { return document.body.classList.contains('reduce-motion'); }
  var IDLE_RPS = THREE.MathUtils.degToRad(18);   // ~18 deg/sec idle auto-rotate

  function perf() { return (window.performance && performance.now) ? performance.now() : Date.now(); }

  function b64ToArrayBuffer(b64) {
    var bin = atob(b64);
    var len = bin.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }

  // soft round contact-shadow texture (shared)
  var shadowTex = (function () {
    var c = document.createElement('canvas'); c.width = c.height = 256;
    var x = c.getContext('2d');
    var g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(0,0,0,0.42)');
    g.addColorStop(0.55, 'rgba(0,0,0,0.18)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    var t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    return t;
  })();

  var loader = new THREE.GLTFLoader();
  var viewers = [];

  /* Lightweight registration — no GL context yet. */
  function makeViewer(host) {
    return {
      host: host,
      key: host.getAttribute('data-model'),
      canvas: host.querySelector('canvas'),
      inited: false, loaded: false, revealed: false, revealStarted: false,
      ioVisible: false, active: false,
      idle: true, spinning: false, revealT: 0
    };
  }

  /* Heavy init — build renderer/scene, parse the GLB. Runs once. */
  function ensureInit(V) {
    if (V.inited) return;
    V.inited = true;
    var b64 = window.MZ_MODELS && window.MZ_MODELS[V.key];

    var renderer = new THREE.WebGLRenderer({ canvas: V.canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    var scene = new THREE.Scene();
    var pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new THREE.RoomEnvironment(), 0.04).texture;

    var key1 = new THREE.DirectionalLight(0xffffff, 1.6); key1.position.set(2.5, 4, 2.5); scene.add(key1);
    var key2 = new THREE.DirectionalLight(0xfff2d8, 0.5); key2.position.set(-3, 2, -2); scene.add(key2);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x9a8f78, 0.35));
    // warm "kicker" rim light that slowly orbits the model (cinematic specular travel)
    var rim = new THREE.DirectionalLight(0xffd9a0, 0.6); rim.position.set(-3, 3.2, -3); scene.add(rim);

    var camera = new THREE.PerspectiveCamera(34, 1, 0.01, 1000);
    camera.position.set(0, 1, 4);

    var controls = new THREE.OrbitControls(camera, V.canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minPolarAngle = THREE.MathUtils.degToRad(22);
    controls.maxPolarAngle = THREE.MathUtils.degToRad(108);
    controls.rotateSpeed = 0.9;
    controls.zoomSpeed = 0.7;

    var pivot = new THREE.Group();
    scene.add(pivot);

    V.renderer = renderer; V.scene = scene; V.camera = camera; V.controls = controls; V.pivot = pivot; V.rim = rim;

    controls.addEventListener('start', function () { V.idle = false; });
    controls.addEventListener('end', function () { V.idle = true; });

    if (!b64) { console.warn('No model data for', V.key); return; }

    loader.parse(b64ToArrayBuffer(b64), '', function (gltf) {
      var model = gltf.scene;
      model.traverse(function (o) {
        if (o.isMesh && o.material) {
          o.material.envMapIntensity = 1.0;
          if (o.material.map) o.material.map.anisotropy = 4;
        }
      });
      var box = new THREE.Box3().setFromObject(model);
      var size = box.getSize(new THREE.Vector3());
      var center = box.getCenter(new THREE.Vector3());
      model.position.x -= center.x;
      model.position.z -= center.z;
      model.position.y -= box.min.y;          // sit on ground (y=0)
      pivot.add(model);

      var h = size.y;
      var radius = 0.5 * Math.sqrt(size.x * size.x + size.y * size.y + size.z * size.z);
      var fov = camera.fov * Math.PI / 180;
      var dist = (radius / Math.sin(fov / 2)) * 1.12;

      var phi = THREE.MathUtils.degToRad(75);   // low angle, like model-viewer
      camera.position.set(0, Math.cos(phi) * dist, Math.sin(phi) * dist);
      controls.target.set(0, h * 0.46, 0);
      camera.position.y += h * 0.46;
      controls.minDistance = dist * 0.55;
      controls.maxDistance = dist * 1.9;
      controls.update();

      // remember the framed "beauty shot" so reveals can dolly into it
      V.beauty = { pos: camera.position.clone(), tgt: controls.target.clone() };

      var sr = Math.max(size.x, size.z) * 0.85 + 0.001;
      var sh = new THREE.Mesh(
        new THREE.PlaneGeometry(sr * 2.2, sr * 2.2),
        new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.9 })
      );
      sh.rotation.x = -Math.PI / 2; sh.position.y = 0.002; sh.renderOrder = -1;
      scene.add(sh);

      V.loaded = true;
      V.host.classList.add('ready');
      if (V.revealStarted) startReveal(V);
      resize(V);
    }, function (err) { console.error('GLB parse error', V.key, err); });
  }

  function resize(V) {
    if (!V.inited || !V.renderer) return;
    var w = V.host.clientWidth, h = V.host.clientHeight;
    if (!w || !h) return;
    V.renderer.setSize(w, h, false);
    V.camera.aspect = w / h;
    V.camera.updateProjectionMatrix();
  }

  function startReveal(V) {
    V.revealStarted = true;
    ensureInit(V);
    if (!V.loaded) return;          // called again on load
    if (reduced()) { V.revealT = 1; if (V.pivot) V.pivot.scale.setScalar(1); return; }
    if (V.revealed) return;
    V.revealed = true;
    V.revealT = 0;
    V.revealStart = perf();
    startDolly(V);
  }

  /* Cinematic push-in: start wide/high, ease into the framed beauty shot. */
  function startDolly(V) {
    if (!V.beauty || reduced()) return;
    var b = V.beauty;
    var dir = b.pos.clone().sub(b.tgt);          // target -> camera
    var dist = dir.length();
    var from = b.tgt.clone().add(dir.multiplyScalar(1.55));
    from.y += dist * 0.10;
    from.x += dist * 0.12;
    V.camFrom = from;
    V.camera.position.copy(from);
    V.camera.lookAt(b.tgt);
    V.controls.enabled = false;
    V.dolly = true; V.dollyStart = perf(); V.dollyDur = 1500;
  }

  function spin(V) {
    ensureInit(V);
    if (!V.loaded) return;
    V.idle = false;
    V.spinFrom = V.pivot.rotation.y;
    V.spinStart = perf();
    V.spinDur = 1150;
    V.spinning = true;
  }

  var last = perf();
  function loop() {
    requestAnimationFrame(loop);
    var now = perf();
    var dt = Math.min((now - last) / 1000, 0.05); last = now;
    var slide = window.MZKinetic && window.MZKinetic.getMode && window.MZKinetic.getMode() === 'slide';

    for (var i = 0; i < viewers.length; i++) {
      var V = viewers[i];
      var visible = slide ? V.active : V.ioVisible;
      if (visible && !V.inited) ensureInit(V);
      if (!visible || !V.loaded) continue;

      if (V.revealed && V.revealT < 1) {
        var rp = Math.min((now - V.revealStart) / 620, 1);
        var e = 1 - Math.pow(1 - rp, 3);
        V.revealT = rp;
        V.pivot.scale.setScalar(0.62 + 0.38 * e);
      }

      if (V.spinning) {
        var sp = Math.min((now - V.spinStart) / V.spinDur, 1);
        var se = sp < 0.5 ? 4 * sp * sp * sp : 1 - Math.pow(-2 * sp + 2, 3) / 2; // easeInOut
        V.pivot.rotation.y = V.spinFrom + Math.PI * 2 * se;
        if (sp >= 1) { V.spinning = false; V.idle = true; }
      } else if (V.idle && !reduced()) {
        V.pivot.rotation.y += IDLE_RPS * dt;
      }

      // orbiting warm rim light + cinema exposure grade
      if (V.rim) {
        if (!reduced()) { var a = now * 0.00035; V.rim.position.set(Math.cos(a) * 4, 3.2, Math.sin(a) * 4); }
        V.rim.intensity = document.body.classList.contains('cinema') ? 0.95 : 0.55;
      }
      V.renderer.toneMappingExposure = document.body.classList.contains('cinema') ? 1.28 : 1.1;

      if (V.dolly && V.camFrom && V.beauty) {
        var dp = Math.min((now - V.dollyStart) / V.dollyDur, 1);
        var de = 1 - Math.pow(1 - dp, 3);
        V.camera.position.lerpVectors(V.camFrom, V.beauty.pos, de);
        V.camera.lookAt(V.beauty.tgt);
        if (dp >= 1) {
          V.dolly = false;
          V.controls.target.copy(V.beauty.tgt);
          V.controls.enabled = true;
          V.controls.update();
        }
      } else {
        V.controls.update();
      }
      V.renderer.render(V.scene, V.camera);
    }
  }

  function init() {
    var hosts = [].slice.call(document.querySelectorAll('.viewer3d[data-model]'));
    hosts.forEach(function (host) {
      var V = makeViewer(host);
      viewers.push(V);

      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { V.ioVisible = e.isIntersecting; });
      }, { threshold: 0.05, rootMargin: '120px' });
      io.observe(host);

      var stage = host.closest('.product__stage') || host.closest('.stage-frame');
      var btn = stage && stage.querySelector ? stage.querySelector('.spin-btn') : null;
      if (!btn) { var sel = host.getAttribute('data-spin'); if (sel) btn = document.querySelector(sel); }
      if (btn) btn.addEventListener('click', function () {
        spin(V);
        btn.classList.add('spinning');
        setTimeout(function () { btn.classList.remove('spinning'); }, 1150);
      });
    });

    window.addEventListener('resize', function () { viewers.forEach(resize); });
    loop();
  }

  window.MZ3D = {
    onPanelShown: function (panel) {
      viewers.forEach(function (V) { if (panel.contains(V.host)) startReveal(V); });
    },
    setActiveModel: function (panel) {
      viewers.forEach(function (V) {
        V.active = !!(panel && panel.contains(V.host));
        if (V.active) startReveal(V);
      });
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
