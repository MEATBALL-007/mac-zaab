# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

**MAC ZAAB** — a single-page, kinetic HTML presentation for a Digital Arts /
marketing assignment: a McDonald's Thailand case study (SWOT, glocalization, Thai
consumer insights, an invented localized product line, pricing, go-to-market plan).
The four hero products are **real interactive 3D models**. All on-screen text is
English. See [README.md](README.md) for the full overview.

- **Name:** MAC_THAI
- **Location:** `C:\Users\USER\Desktop\MC_THAI`
- **Platform:** Windows (PowerShell primary shell)

## Architecture

Source lives in `src/`; `build.js` generates the two shipped HTML files. **Never
hand-edit the generated `*.html` files** — edit `src/` (or `build.js`) and rebuild.

- `src/styles.css` — all styling. The Anton font is injected as base64 at build
  time, replacing the `__FONT_FACE__` placeholder comment.
- `src/kinetic.js` — shared engine: split-word reveals, scroll reveals, count-ups,
  marquee, parallax, and the Scroll ↔ Slide mode toggle. Exposes `window.MZKinetic`
  and calls into `window.MZ3D` hooks (`onPanelShown`, `setActiveModel`).
- `src/mv-init.js` — CDN build only: `<model-viewer>` spin controller; defines `MZ3D`.
- `src/three-viewer.js` — offline build only: custom Three.js viewer that parses
  base64-embedded GLBs from memory (`GLTFLoader.parse`, no fetch). Lazy-inits each
  WebGL context on first visibility. Defines `MZ3D`.
- `build_assets/` — vendored libs inlined at build time (Three.js r137 + loaders,
  Anton woff2). Not shipped directly; embedded into the offline HTML.

### Two builds

- `MAC_ZAAB_presentation_offline.html` — self-contained; renders 3D over `file://`
  (double-click). Uses `src/three-viewer.js` + base64 GLBs.
- `MAC_ZAAB_presentation_cdn.html` — `<model-viewer>` from CDN, references
  `./models/*.glb`; must be served over HTTP.

## Commands

```powershell
node build.js                # regenerate both HTML files from src/ + models/
node serve.js                # static server at http://localhost:8000 (for the CDN build)
node --check src/<file>.js   # syntax-check a source file before building
```

## Conventions

- Plain ES5-ish vanilla JS (no build step beyond `build.js`), no framework, no npm deps.
- Keep the offline build free of any external/module/fetch references — that's what
  makes `file://` work. Verify after changes: it should have 0 `type=module`, 0
  external `src`/`href`, 0 runtime `fetch` of local files.
- Models are glTF v2, no Draco/meshopt (load natively). Low-poly / single-mesh.

## Notes for Claude

- Build the whole thing in one pass; prefer `node build.js` over ad-hoc edits to
  generated files.
- After changes, re-verify by serving and screenshotting both builds, and confirm
  the offline build still renders 3D from `file://`.
