# MAC ZAAB — Interactive Kinetic Presentation

A single-page, highly animated HTML presentation for a Digital Arts / marketing
assignment. It presents a McDonald's Thailand case study — SWOT, glocalization
research, Thai consumer insights, an invented localized product line (**MAC ZAAB**),
pricing, and a go-to-market plan — with the four hero products shown as **real,
interactive 3D models**. All on-screen text is English.

## Open it online, anywhere (GitHub Pages)

Once this repo is pushed to GitHub and Pages is enabled, the presentation lives at:

```
https://<your-username>.github.io/<your-repo>/
```

That link opens on any device — phone, school computer, anywhere — with nothing to
install. The Pages entry point (`index.html`) is the **self-contained** build, so it
even works on networks that block CDNs, and keeps working if a CDN goes down.

**Publish in ~2 minutes** — see [Publishing to GitHub Pages](#publishing-to-github-pages) below.

## What you get — builds

| File | 3D engine | How to open | Best for |
|------|-----------|-------------|----------|
| **`index.html`** | Three.js (inlined) + GLBs embedded as base64 | The **GitHub Pages** URL (or double-click) | The shareable online link |
| **`MAC_ZAAB_presentation_offline.html`** | same self-contained build (identical to `index.html`) | **Double-click it** — true offline, no internet, no server | Handing in / presenting on any machine |
| **`MAC_ZAAB_presentation_cdn.html`** | Google `<model-viewer>` from a CDN, loads `./models/*.glb` | **Serve it** (see below) — lighter, needs internet for the CDN | Development / fast loading with a connection |

> The **offline** build is the one to present from. It is fully self-contained
> (~4.6 MB): the renderer, the font, and all four 3D models are embedded, so it
> renders 3D even when opened straight from the file system (`file://`). This was
> verified by rendering the textured burger from a local file in a real browser.

### Opening the CDN build (or serving either build)

`<model-viewer>` and local `.glb` files are blocked over `file://`, so the CDN
build must be served over HTTP. A tiny zero-dependency server is included:

```powershell
node serve.js            # serves this folder at http://localhost:8000
# then open:
#   http://localhost:8000/MAC_ZAAB_presentation_cdn.html
#   http://localhost:8000/MAC_ZAAB_presentation_offline.html
```

Or use Python if you prefer:

```powershell
python -m http.server 8000   # then open http://localhost:8000/...
```

If the **offline** build's 3D ever fails to appear when double-clicked (some
locked-down browsers restrict local files), serve it with either command above —
that always works.

## Publishing to GitHub Pages

This repo is already Pages-ready (`index.html` at the root + a `.nojekyll` file).

**Option A — GitHub website (no tools needed)**

1. Go to <https://github.com/new>, give the repo a name (e.g. `mac-zaab`), set it
   **Public**, and create it (don't add a README — this folder already has one).
2. Push this folder (run these in `C:\Users\USER\Desktop\MC_THAI`):
   ```powershell
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```
3. In the repo: **Settings → Pages → Build and deployment → Source: _Deploy from a
   branch_ → Branch: `main` / `/ (root)` → Save.**
4. Wait ~1 minute, then open `https://<your-username>.github.io/<your-repo>/`.

**Option B — GitHub CLI** (if you install [`gh`](https://cli.github.com/)):

```powershell
gh auth login
gh repo create mac-zaab --public --source=. --remote=origin --push
gh api -X POST repos/{owner}/mac-zaab/pages -f "source[branch]=main" -f "source[path]=/"
```

> Free GitHub accounts need a **public** repo for Pages. The local git history is
> already committed for you — you only need to create the remote and push.

## Controls

- **Scroll / Slide mode** — toggle with the top-right button or press **`M`**.
  Switchable at any time, even mid-presentation.
  - *Scroll mode*: one long page with scroll-triggered animations.
  - *Slide mode*: full-viewport slides. Navigate with **← / →** arrow keys (also
    `Space`, `PageUp/Down`, `Home`, `End`), the on-screen prev/next buttons, the
    side dots, and a live slide counter.
- **3D models** — drag to **rotate**, scroll to **zoom**, gentle **auto-rotate**
  when idle, and a **"Spin 360°"** button for a full turn.
- **Motion: On / Off** — top-right toggle or press **`A`**. Animations are **on by
  default** (this is a kinetic presentation). If your computer has *"Animation
  effects"* turned off (Windows Settings → Accessibility → Visual effects) or your
  browser requests reduced motion, the presentation still animates — turn it off
  here only if you prefer a still version.
- Keyboard focus is visible; layout is responsive down to mobile.

## Section flow (13 panels)

1. Hero / title + fanned product teaser
2. Company snapshot (count-up stats)
3. SWOT (2×2, Thai lens)
4. Glocalization research (scattered region cards)
5. Thai consumer insights (big stats + source)
6. MAC ZAAB intro (hero reveal)
7. **3D** — Tom Yum Goong Crispy Chicken Burger (hero)
8. **3D** — Som Tam Shaker Fries
9. **3D** — Mango Sticky Rice McFlurry
10. **3D** — Thai Iced Green Milk Tea
11. Pricing + ZAAB Set combo
12. Marketing plan (slogan + channels + events)
13. Closing / takeaways

## Project structure

```
MAC_ZAAB_presentation_cdn.html       ← generated build (CDN / served)
MAC_ZAAB_presentation_offline.html   ← generated build (self-contained)
build.js                             ← generator: emits both HTML files
serve.js                             ← tiny static server for local preview
models/                              ← source 3D models (glTF binary, v2, no Draco)
  Cheeseburger.glb · French_fries.glb · Sundae.glb · Frappe.glb
src/                                 ← editable source
  styles.css        ← all kinetic styling (Anton font injected at build time)
  kinetic.js        ← split-word reveals, count-ups, marquee, parallax, mode toggle
  mv-init.js        ← <model-viewer> spin controller (CDN build)
  three-viewer.js   ← custom Three.js viewer, base64 GLB parse (offline build)
build_assets/                        ← vendored, inlined at build time
  three.min.js (r137) · GLTFLoader.js · OrbitControls.js · RoomEnvironment.js · anton.woff2
```

### Model → product mapping

| File | Product | Price |
|------|---------|-------|
| `Cheeseburger.glb` | Tom Yum Goong Crispy Chicken Burger (hero) | ฿79 |
| `French_fries.glb` | Som Tam Shaker Fries | ฿49 |
| `Sundae.glb` | Mango Sticky Rice McFlurry | ฿45 |
| `Frappe.glb` | Thai Iced Green Milk Tea | ฿39 |

> The models are low-poly / single-mesh, so per-ingredient animation isn't
> possible — the interaction is rotate / spin / zoom / auto-rotate with premium
> lighting.

## Rebuilding

Edit anything in `src/` (or swap a model in `models/`) and regenerate both files:

```powershell
node build.js
```

The generator inlines the Anton font (base64), and for the offline build it inlines
Three.js + the loaders and embeds each `.glb` as base64 so the result needs no
network or file fetches.

## Credits / licenses

- **Anton** display font — SIL Open Font License (Google Fonts).
- **Three.js** (r137) — MIT.
- **`<model-viewer>`** — Apache-2.0 (loaded from CDN in the CDN build only).
- No real brand logos are used in any custom artwork.
