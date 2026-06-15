/* ============================================================
   MAC ZAAB — build generator
   Emits two self-describing HTML files:
     MAC_ZAAB_presentation_cdn.html      (<model-viewer> via CDN, ./models/*.glb)
     MAC_ZAAB_presentation_offline.html  (inlined Three.js + base64 GLBs, file://-safe)
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');
const ASSETS = path.join(ROOT, 'build_assets');
const MODELS = path.join(ROOT, 'models');

const read = (p) => fs.readFileSync(p, 'utf8');
const b64 = (p) => fs.readFileSync(p).toString('base64');

const MV_CDN = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js';

/* ---- assets ---- */
const css = read(path.join(SRC, 'styles.css'))
  .replace('/* @font-face injected by build (Anton, base64) goes here:\n   __FONT_FACE__ */',
    `@font-face{font-family:'Anton';font-style:normal;font-weight:400;font-display:swap;` +
    `src:url(data:font/woff2;base64,${b64(path.join(ASSETS, 'anton.woff2'))}) format('woff2');}`);

const kineticJS = read(path.join(SRC, 'kinetic.js'));
const mvInitJS = read(path.join(SRC, 'mv-init.js'));
const threeViewerJS = read(path.join(SRC, 'three-viewer.js'));
const soundJS = read(path.join(SRC, 'sound.js'));

const THREE_LIB = read(path.join(ASSETS, 'three.min.js'));
const GLTF_LIB = read(path.join(ASSETS, 'GLTFLoader.js'));
const ORBIT_LIB = read(path.join(ASSETS, 'OrbitControls.js'));
const ROOM_LIB = read(path.join(ASSETS, 'RoomEnvironment.js'));

/* ---- product data ---- */
const PRODUCTS = [
  {
    key: 'burger', file: 'Cheeseburger.glb', hero: true, rev: false,
    variant: 'paper', stage: 'linear-gradient(160deg,#fbeede,#efd9b8)',
    eyebrow: 'MAC ZAAB · 01 · Hero',
    title: 'Tom Yum Goong Crispy Chicken Burger',
    thai: 'เบอร์เกอร์ไก่กรอบต้มยำกุ้ง',
    price: 79,
    desc: 'A crispy chicken thigh drenched in creamy tom-yum sauce, finished with a shrimp-cracker crunch. Hits Thailand’s #1 spicy-sour craving.',
    ing: ['crispy chicken thigh', 'creamy tom-yum sauce', 'lemongrass &amp; kaffir lime', 'galangal', 'chili', 'shrimp-cracker crunch']
  },
  {
    key: 'fries', file: 'French_fries.glb', hero: false, rev: true,
    variant: 'yellow', stage: 'linear-gradient(160deg,#fff3c4,#ffd966)',
    eyebrow: 'MAC ZAAB · 02',
    title: 'Som Tam Shaker Fries',
    thai: 'เฟรนช์ฟรายส์ส้มตำ',
    price: 49,
    desc: 'Shake your own papaya-salad seasoning over hot fries — chili, lime, peanut, dried shrimp, palm sugar. Interactive and built for TikTok.',
    ing: ['world-famous fries', 'chili', 'lime', 'peanut', 'dried shrimp', 'palm sugar dust']
  },
  {
    key: 'sundae', file: 'Sundae.glb', hero: false, rev: false,
    variant: 'cream', stage: 'linear-gradient(160deg,#fff0c9,#ffe39e)',
    eyebrow: 'MAC ZAAB · 03',
    title: 'Mango Sticky Rice McFlurry',
    thai: 'แมงโก้ข้าวเหนียว McFlurry',
    price: 45,
    desc: 'Vanilla soft-serve swirled with real mango purée, sweet coconut sauce, and a toasted sticky-rice crunch — the iconic Thai dessert, multisensory.',
    ing: ['vanilla soft-serve', 'mango purée', 'coconut sauce', 'toasted rice crunch']
  },
  {
    key: 'frappe', file: 'Frappe.glb', hero: false, rev: true,
    variant: 'ink', stage: 'linear-gradient(160deg,#1f3a2a,#2c5138)',
    eyebrow: 'MAC ZAAB · 04 · McCafé',
    title: 'Thai Iced Green Milk Tea',
    thai: 'ชาเขียวนมเย็น',
    price: 39,
    desc: 'McCafé’s take on the drink that overtook black coffee in Thailand — riding the matcha / green-milk-tea wave as an everyday “affordable luxury.”',
    ing: ['green tea', 'fresh milk', 'lightly sweet', 'iced']
  }
];

/* ---- helpers ---- */
const pad = (n) => String(n).padStart(2, '0');

function num(value, { prefix = '', suffix = '', nosep = false, decimals = 0, cls = '' } = {}) {
  const attrs = [`data-count="${value}"`];
  if (prefix) attrs.push(`data-prefix="${prefix}"`);
  if (suffix) attrs.push(`data-suffix="${suffix}"`);
  if (nosep) attrs.push('data-nosep');
  if (decimals) attrs.push(`data-decimals="${decimals}"`);
  return `<span class="${cls}" ${attrs.join(' ')}>0</span>`;
}

function viewerEmbed(build, p) {
  if (build === 'cdn') {
    return `<model-viewer id="mv-${p.key}" class="mv"
        src="./models/${p.file}"
        alt="${p.title} — interactive 3D model"
        camera-controls touch-action="pan-y"
        auto-rotate rotation-per-second="18deg" auto-rotate-delay="0" interaction-prompt="none"
        camera-orbit="0deg 75deg auto" min-camera-orbit="auto 25deg auto" max-camera-orbit="auto 112deg auto"
        interpolation-decay="160"
        environment-image="neutral" tone-mapping="neutral" exposure="1.1"
        shadow-intensity="1" shadow-softness="1"
        loading="eager"></model-viewer>`;
  }
  return `<div class="viewer3d" data-model="${p.key}" data-spin="#spin-${p.key}"><canvas></canvas>` +
    `<div class="viewer3d__loading">Loading 3D…</div></div>`;
}

function productPanel(build, p, n) {
  const heroFlag = p.hero ? `<div class="hero-flag">★ Hero</div>` : '';
  const badge = p.hero
    ? `<div class="hero-badge reveal"><span class="chip chip--fill">Limited Edition · Thailand Exclusive</span></div>`
    : '';
  const thai = p.thai ? `<p class="thai reveal" style="--i:1">${p.thai}</p>` : '';
  const stage =
    `<div class="product__stage reveal-pop" data-parallax="0.05">
       <div class="stage-frame" style="--stage:${p.stage}">${heroFlag}${viewerEmbed(build, p)}</div>
       <div class="stage-tools">
         <button id="spin-${p.key}" class="btn btn--solid spin-btn" data-target="#mv-${p.key}"
                 aria-label="Spin ${p.title} a full 360 degrees"><span class="ico">⟳</span> Spin 360°</button>
         <span class="stage-hint">Drag to rotate · scroll to zoom</span>
       </div>
     </div>`;
  const copy =
    `<div class="product__copy">
       ${badge}
       <p class="eyebrow reveal">${p.eyebrow}</p>
       <h2 class="display d-md kinetic">${p.title}</h2>
       ${thai}
       <p class="price reveal" style="--i:1"><span class="cur">฿</span>${num(p.price)}</p>
       <p class="product__desc reveal" style="--i:2">${p.desc}</p>
       <div class="ingredients reveal" style="--i:3">${p.ing.map((x) => `<span class="chip">${x}</span>`).join('')}</div>
     </div>`;
  const inner = p.rev ? stage + copy : copy + stage;
  return `<section class="panel panel--${p.variant}" aria-label="MAC ZAAB product: ${p.title}">
    <span class="panel__index">${pad(n)}</span>
    <div class="wrap"><div class="product ${p.rev ? 'product--rev' : ''}">${inner}</div></div>
  </section>`;
}

/* ---- static panels ---- */
function marquee(words, { rev = false, dur = 26, bare = false } = {}) {
  const items = words.map((w) => `<span>${w}<span class="star">✦</span></span>`).join('');
  return `<div class="marquee ${rev ? 'marquee--rev' : ''} ${bare ? 'marquee--bare' : ''}" aria-hidden="true">
    <div class="marquee__track" style="--dur:${dur}s">${items}</div></div>`;
}

function heroPanel() {
  const tcards = [
    { n: 'Tom Yum Goong Burger', p: '฿79', r: -8, y: 18, bg: 'linear-gradient(160deg,#DA291C,#8f1810)' },
    { n: 'Som Tam Shaker Fries', p: '฿49', r: -3, y: -6, bg: 'linear-gradient(160deg,#FFC72C,#e0a200)', dark: true },
    { n: 'Mango Sticky Rice McFlurry', p: '฿45', r: 3, y: -6, bg: 'linear-gradient(160deg,#f6b73c,#d98a1c)', dark: true },
    { n: 'Thai Iced Green Milk Tea', p: '฿39', r: 8, y: 18, bg: 'linear-gradient(160deg,#2c5138,#16301f)' }
  ].map((c) => `<div class="tcard" style="--r:${c.r}deg;--y:${c.y}px;background:${c.bg};${c.dark ? 'color:#1A1A1A;border-color:rgba(26,26,26,.35);' : ''}">
       <span class="q" aria-hidden="true">?</span>
       <span class="tprice">${c.p}</span>${c.n}</div>`).join('');
  return `<section class="panel panel--ink panel--center" aria-label="Title">
    <span class="panel__index">01</span>
    <div class="wrap">
      <p class="eyebrow reveal">McDonald’s · Thailand</p>
      <h1 class="display d-xl kinetic">Marketing Strategy &amp; SWOT</h1>
      <p class="lead reveal" style="--i:1">A real-world case study, a localized hero product, and a full Thai-market launch plan — built around <b>MAC ZAAB</b>.</p>
      ${marquee(['Glocalization', 'Thai Street Flavor', 'Spicy-Sour', 'Digital-First', 'Value', 'MAC ZAAB'], { dur: 30 })}
      <div class="teaser" aria-hidden="true">${tcards}</div>
      <p class="reveal" style="--i:2;margin-top:26px;font-weight:700;opacity:.7;font-size:13px;letter-spacing:.14em;text-transform:uppercase">
        Tip — press <b>M</b> or use the top-right button to switch Scroll ↔ Slide mode</p>
    </div>
  </section>`;
}

function snapshotPanel() {
  return `<section class="panel panel--paper" aria-label="Company snapshot">
    <span class="panel__index">02</span>
    <div class="wrap">
      <p class="eyebrow reveal">Company snapshot</p>
      <h2 class="display d-lg kinetic">The world’s biggest fast-food brand</h2>
      <div class="stats-row" style="margin-top:clamp(28px,5vw,56px)">
        <div class="stat reveal"><span class="num">${num(40000, { suffix: '+' })}</span><span class="label">Restaurants worldwide</span></div>
        <div class="stat reveal" style="--i:1"><span class="num">${num(100, { suffix: '+' })}</span><span class="label">Countries</span></div>
        <div class="stat reveal" style="--i:2"><span class="num">${num(95, { prefix: '~', suffix: '%' })}</span><span class="label">Franchise-operated</span></div>
        <div class="stat reveal" style="--i:3"><span class="num">${num(1985, { nosep: true })}</span><span class="label">In Thailand since</span></div>
      </div>
      ${marquee(['40,000+ Restaurants', '100+ Countries', '~95% Franchised', 'Since 1985 in Thailand'], { dur: 28, rev: true })}
      <div class="callout reveal" style="--i:1">
        <p class="eyebrow" style="color:var(--yellow)">The current playbook</p>
        <h3 class="display d-sm">“Accelerating the Arches”</h3>
        <p class="lead" style="margin-top:10px">Doubles down on <b>Value</b>, <b>Digital</b>, and <b>Delivery</b> worldwide.</p>
      </div>
    </div>
  </section>`;
}

function swotPanel() {
  const block = (cls, letter, title, sub, items) =>
    `<div class="card ${cls} reveal-pop">
       <span class="tag">${sub}</span>
       <h3>${letter} — ${title}</h3>
       <ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>
     </div>`;
  return `<section class="panel panel--cream" aria-label="SWOT analysis">
    <span class="panel__index">03</span>
    <div class="wrap">
      <p class="eyebrow reveal">SWOT analysis · through a Thai lens</p>
      <h2 class="display d-md kinetic">SWOT Analysis</h2>
      <div class="swot" style="margin-top:clamp(22px,4vw,40px)">
        ${block('s', 'S', 'Strengths', 'Internal · Positive', [
          'Globally trusted Golden Arches brand',
          'Scale &amp; supply chain keep prices stable',
          'Localization mastery — Samurai Pork Burger, McChicken Khao Man Gai',
          'Digital: app, kiosks, loyalty program',
          'Value leadership drives traffic'
        ])}
        ${block('w', 'W', 'Weaknesses', 'Internal · Negative', [
          'Health perception — high calorie/fat image',
          'Franchise dependence → uneven quality',
          'Rising prices pressure the value image',
          'Thin deep-local menu vs. street food',
          'Social buzz can lag viral local brands'
        ])}
        ${block('o', 'O', 'Opportunities', 'External · Positive', [
          'Bold &amp; “swicy” (sweet-spicy) flavors dominate orders',
          'Matcha &amp; green-milk-tea boom (McCafé)',
          'Huge food-delivery culture',
          'Tourism wants “McThailand” exclusives',
          'Gen Z mashups &amp; collectible merch'
        ])}
        ${block('t', 'T', 'Threats', 'External · Negative', [
          'Food-cost inflation squeezes margins',
          'KFC, Burger King &amp; cheap street food',
          'Wellness shift &amp; GLP-1 (weight-loss) drugs',
          'Food-safety incidents spread fast',
          'Sugar/fat taxes &amp; advertising rules'
        ])}
      </div>
    </div>
  </section>`;
}

function glocalPanel() {
  const regions = [
    { r: -5, t: 'Thailand', d: 'Samurai Pork Burger, Kaprao Crispy Chicken &amp; rice, Pineapple Pie, Corn Pie' },
    { r: 3, t: 'India', d: 'No beef/pork — Maharaja Mac (chicken), McAloo Tikki, McSpicy Paneer; separate veg / non-veg kitchens' },
    { r: -3, t: 'Japan', d: 'Teriyaki McBurger, Ebi (shrimp) Filet-O, shake-your-own Shaka Shaka Chicken, seasonal Tsukimi' },
    { r: 5, t: 'South Korea', d: 'Bulgogi Burger — sweet-savory marinated patty' },
    { r: -4, t: 'Germany', d: 'McCurrywurst — curry-ketchup sausage' },
    { r: 4, t: 'Canada / Australia', d: 'Poutine; Vegemite Shaker Fries' }
  ].map((c, i) => `<div class="card reveal-pop" style="--i:${i};--r:${c.r}deg"><h3>${c.t}</h3><p>${c.d}</p></div>`).join('');
  return `<section class="panel panel--yellow" aria-label="Glocalization research">
    <span class="panel__index">04</span>
    <div class="wrap">
      <p class="eyebrow reveal">Glocalization research</p>
      <h2 class="display d-md kinetic">How McDonald’s adapts worldwide</h2>
      <div class="fan" style="margin-top:clamp(24px,4vw,44px)">${regions}</div>
      <div class="callout reveal" style="--i:1;margin-top:clamp(28px,5vw,48px)">
        <p class="eyebrow" style="color:var(--yellow)">Takeaway</p>
        <h3 class="display d-sm">Keep the global system — swap the flavors to local culture.</h3>
      </div>
    </div>
  </section>`;
}

function insightsPanel() {
  return `<section class="panel panel--red" aria-label="Thai consumer insights">
    <span class="panel__index">05</span>
    <div class="wrap">
      <p class="eyebrow reveal">Thai consumer insights</p>
      <h2 class="display d-md kinetic">What Thailand is craving</h2>
      <div class="stats-big" style="margin-top:clamp(26px,4vw,48px)">
        <div class="stat reveal"><span class="num">${num(300, { prefix: '+', suffix: '%' })}</span><span class="label">Matcha orders surged on delivery in 2025</span></div>
        <div class="stat reveal" style="--i:1"><span class="num">${num(16, { suffix: 'M+' })}</span><span class="label">Searches for spicy dishes (som tam, yum, mala)</span></div>
        <div class="reveal" style="--i:2">
          <p class="lead" style="opacity:.95">Spicy-sour flavors lead · mango sticky rice is iconic · matcha &amp; iced green milk tea booming · delivery + limited-time drops drive demand.</p>
        </div>
      </div>
      ${marquee(['Spicy-Sour', 'Som Tam', 'Yum', 'Mala', 'Matcha', 'Mango Sticky Rice', 'Green Milk Tea'], { dur: 24 })}
      <p class="reveal" style="--i:1;font-weight:700;opacity:.82;font-size:13px;letter-spacing:.06em">Source: LINE MAN Wongnai 2025 trend report</p>
    </div>
  </section>`;
}

function zaabIntroPanel() {
  return `<section class="panel panel--ink panel--center" aria-label="MAC ZAAB introduction">
    <span class="panel__index">06</span>
    <div class="wrap" style="text-align:center">
      <p class="eyebrow reveal" style="color:var(--yellow)">The Hero Product</p>
      <h2 class="display d-xl kinetic" style="color:var(--yellow)">MAC ZAAB</h2>
      <p class="lead reveal" style="--i:1;margin:18px auto 0;max-width:62ch">A limited-edition Thai Street Flavor Drop — four items engineered around the exact cravings the data revealed.</p>
      <div class="reveal" style="--i:2;margin-top:22px"><span class="chip chip--fill">Limited Edition · Thailand Exclusive</span></div>
      ${marquee(['MAC ZAAB', 'Thai Street Flavor Drop', 'So Good · So Thai', 'Limited Edition'], { dur: 22, rev: true })}
    </div>
  </section>`;
}

function pricingPanel() {
  const items = [
    ['Tom Yum Goong Crispy Chicken Burger', 79],
    ['Som Tam Shaker Fries', 49],
    ['Mango Sticky Rice McFlurry', 45],
    ['Thai Iced Green Milk Tea', 39]
  ].map(([n, p], i) => `<div class="menu__item reveal-l" style="--i:${i}">
      <span class="nm">${n}</span><span class="pr">฿${num(p)}</span></div>`).join('');
  return `<section class="panel panel--ink" aria-label="Pricing and combo">
    <span class="panel__index">11</span>
    <div class="wrap">
      <p class="eyebrow reveal" style="color:var(--yellow)">Pricing · built for a price-sensitive market</p>
      <h2 class="display d-lg kinetic">The Menu</h2>
      <div class="menu" style="margin-top:clamp(22px,4vw,40px)">${items}</div>
      <div class="combo reveal-pop">
        <div>
          <p class="tag" style="font-weight:800;letter-spacing:.14em;text-transform:uppercase;font-size:12px;opacity:.7">The value anchor</p>
          <div class="big">THE ZAAB SET<br>฿${num(149)}</div>
          <p class="small" style="margin-top:8px">Burger + Shaker Fries + Drink. Add the Mango Sticky Rice McFlurry for just <b>+฿29</b>.</p>
        </div>
        <span class="chip" style="border-width:2px">Burger + Fries + Drink</span>
      </div>
    </div>
  </section>`;
}

function planPanel() {
  const cards = [
    ['Positioning', '“Global brand, Thai heart.” Localize flavor &amp; value while keeping the trusted global system.'],
    ['Channels', 'TikTok &amp; Reels — food ASMR + Thai food KOLs (lead) · LINE Official Account — coupons &amp; loyalty · Delivery apps — Grab / LINE MAN exclusives · Out-of-home — near schools &amp; BTS/MRT'],
    ['Events', 'Pop-up launch at CentralWorld / Siam (free samples) · “Shake &amp; Sabai” TikTok challenge (meal prizes) · Collectible cup &amp; merch drop · Double loyalty points for two weeks']
  ].map(([t, d], i) => `<div class="card reveal" style="--i:${i}"><span class="tag">${['Strategy', 'Reach', 'Activation'][i]}</span><h3>${t}</h3><p>${d}</p></div>`).join('');
  return `<section class="panel panel--paper" aria-label="Marketing plan">
    <span class="panel__index">12</span>
    <div class="wrap">
      <p class="eyebrow reveal">Go-to-market · Thailand</p>
      <h2 class="display d-md kinetic">Marketing Plan</h2>
      <div class="slogan-wrap reveal" style="--i:1">
        <p class="eyebrow" style="margin-bottom:6px">Slogan</p>
        <div class="slogan">“So Good, So Thai”<br>ZAAB DAI JAI</div>
      </div>
      <div class="plan">${cards}</div>
    </div>
  </section>`;
}

function closingPanel() {
  const takeaways = [
    'Win by keeping a global system while localizing flavor + value.',
    'MAC ZAAB turns real Thai cravings into a shareable, limited-edition drop.',
    'A bold-flavor, digital-first, value-driven plan built for Thai consumers.'
  ].map((t, i) => `<li class="reveal-l" style="--i:${i}"><b>${i + 1}</b><span>${t}</span></li>`).join('');
  return `<section class="panel panel--red panel--center" aria-label="Closing and takeaways">
    <span class="panel__index">13</span>
    <div class="wrap">
      <p class="eyebrow reveal">In summary</p>
      <h2 class="display d-md kinetic">Key Takeaways</h2>
      <ul class="takeaways" style="margin:clamp(20px,4vw,40px) 0">${takeaways}</ul>
      ${marquee(['So Good', 'So Thai', 'MAC ZAAB', 'ZAAB DAI JAI'], { dur: 20 })}
      <h2 class="display d-xl kinetic thanks" style="margin-top:18px">Thank you</h2>
      <p class="display d-md reveal" style="--i:2;color:var(--yellow)">Questions?</p>
    </div>
  </section>`;
}

/* ---- assemble ---- */
function buildHTML(build) {
  const headExtra = build === 'cdn'
    ? `\n  <script type="module" src="${MV_CDN}"></script>`
    : '';

  // Per-act cinematic metadata: chapter card label + color grade.
  // Research/problem acts run cool; the hero, products and payoff run warm/hot.
  const meta = [
    { ch: 'Title', grade: 'hot' },
    { ch: 'Company Snapshot', grade: 'cool' },
    { ch: 'SWOT Analysis', grade: 'cool' },
    { ch: 'Glocalization', grade: 'cool' },
    { ch: 'Thai Insights', grade: 'cool' },
    { ch: 'MAC ZAAB', grade: 'hot' },
    { ch: 'Tom Yum Goong Burger', grade: 'warm' },
    { ch: 'Som Tam Shaker Fries', grade: 'warm' },
    { ch: 'Mango Sticky Rice McFlurry', grade: 'warm' },
    { ch: 'Thai Iced Green Milk Tea', grade: 'warm' },
    { ch: 'Pricing', grade: 'warm' },
    { ch: 'Marketing Plan', grade: 'warm' },
    { ch: 'Key Takeaways', grade: 'hot' }
  ];
  const panels = [
    heroPanel(),
    snapshotPanel(),
    swotPanel(),
    glocalPanel(),
    insightsPanel(),
    zaabIntroPanel(),
    productPanel(build, PRODUCTS[0], 7),
    productPanel(build, PRODUCTS[1], 8),
    productPanel(build, PRODUCTS[2], 9),
    productPanel(build, PRODUCTS[3], 10),
    pricingPanel(),
    planPanel(),
    closingPanel()
  ]
    .map((html, i) => html.replace('<section class="panel',
      `<section data-chapter="${meta[i].ch}" data-grade="${meta[i].grade}" class="panel`))
    // give the giant index numbers some parallax depth (multi-plane scroll)
    .map((html) => html.replace(/class="panel__index"/g, 'class="panel__index" data-parallax="0.1"'))
    .join('\n');

  let scripts;
  if (build === 'cdn') {
    scripts =
      `<script>\n${kineticJS}\n</script>\n<script>\n${mvInitJS}\n</script>\n<script>\n${soundJS}\n</script>`;
  } else {
    const modelsObj = PRODUCTS.map((p) => `"${p.key}":"${b64(path.join(MODELS, p.file))}"`).join(',\n');
    scripts =
      `<script>\n${THREE_LIB}\n</script>\n` +
      `<script>\n${GLTF_LIB}\n</script>\n` +
      `<script>\n${ORBIT_LIB}\n</script>\n` +
      `<script>\n${ROOM_LIB}\n</script>\n` +
      `<script>window.MZ_MODELS={\n${modelsObj}\n};</script>\n` +
      `<script>\n${threeViewerJS}\n</script>\n` +
      `<script>\n${kineticJS}\n</script>\n` +
      `<script>\n${soundJS}\n</script>`;
  }

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>MAC ZAAB — McDonald’s Thailand · Marketing Strategy &amp; SWOT</title>
  <meta name="description" content="MAC ZAAB — a McDonald’s Thailand marketing case study: SWOT, glocalization research, Thai consumer insights, a localized hero product line with interactive 3D models, pricing and a go-to-market plan.">
  <style>\n${css}\n</style>${headExtra}
</head>
<body class="cinema">
  <div class="progress" aria-hidden="true"><div class="progress__bar"></div></div>

  <!-- Cinematic overlays (film grain, vignette, color grade, letterbox, chapter card) -->
  <div class="cine" aria-hidden="true">
    <div class="cine__grade"></div>
    <div class="cine__vig"></div>
    <div class="cine__grain"></div>
    <div class="cine__bar cine__bar--t"></div>
    <div class="cine__bar cine__bar--b"></div>
  </div>
  <div class="chapter" aria-hidden="true">
    <span class="chapter__no"></span><span class="chapter__clip"><span class="chapter__t"></span></span>
  </div>

  <div class="controls">
    <button id="motionToggle" class="ctrl-btn ctrl-btn--motion" aria-pressed="true" title="Toggle animations (A)">
      <span class="ico" aria-hidden="true">✦</span><span class="lbl">Motion: On</span>
    </button>
    <button id="cinemaToggle" class="ctrl-btn ctrl-btn--cinema" aria-pressed="true" title="Toggle cinematic film treatment (C)">
      <span class="ico" aria-hidden="true">🎬</span><span class="lbl">Cinema: On</span>
    </button>
    <button id="soundToggle" class="ctrl-btn ctrl-btn--sound" aria-pressed="false" title="Toggle sound design (S)">
      <span class="ico" aria-hidden="true">♪</span><span class="lbl">Sound: Off</span>
    </button>
    <button id="modeToggle" class="ctrl-btn" aria-pressed="false" title="Toggle Scroll / Slide mode (M)">
      <span class="ico" aria-hidden="true">▦</span><span class="lbl">Slide mode</span>
    </button>
  </div>

  <nav class="slidenav" aria-hidden="true" aria-label="Slide navigation">
    <button id="prevSlide" class="nav-btn" aria-label="Previous slide">‹</button>
    <span class="count">1 / 13</span>
    <button id="nextSlide" class="nav-btn" aria-label="Next slide">›</button>
  </nav>
  <div class="dots" aria-hidden="true"></div>

  <main class="deck">
${panels}
  </main>

  ${scripts}
</body>
</html>`;
}

/* ---- write ---- */
const offlineHTML = buildHTML('offline');
fs.writeFileSync(path.join(ROOT, 'MAC_ZAAB_presentation_cdn.html'), buildHTML('cdn'));
fs.writeFileSync(path.join(ROOT, 'MAC_ZAAB_presentation_offline.html'), offlineHTML);
// GitHub Pages entry point. Use the self-contained offline build so the live
// URL works on any network (even ones that block CDNs) and survives CDN outages.
fs.writeFileSync(path.join(ROOT, 'index.html'), offlineHTML);

const sz = (f) => (fs.statSync(path.join(ROOT, f)).size / 1024 / 1024).toFixed(2) + ' MB';
console.log('Built MAC_ZAAB_presentation_cdn.html     ', sz('MAC_ZAAB_presentation_cdn.html'));
console.log('Built MAC_ZAAB_presentation_offline.html ', sz('MAC_ZAAB_presentation_offline.html'));
console.log('Built index.html (= offline, Pages entry)', sz('index.html'));
