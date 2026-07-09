# HAL × Adobe EDS / DA.live — Authoring POC Guide

**Start here.** This repo (`hal`, from `AdobeDevXSC/hal`) hosts a two-track proof-of-concept
answering one question: **can we reuse HAL's `@hal-sbn-root/shared-ui` design system with
Adobe Edge Delivery Services (EDS), authored in DA.live (Document Authoring)?**

Two tracks, one design system:

| Track | Who renders the page | Lives in | Status |
|-------|----------------------|----------|--------|
| **A — Headless** | our Next.js app | `frontend/` | ✅ end-to-end, live |
| **B — Native (EDS-rendered)** | Adobe's edge | `blocks/`, `build/`, `component-*.json` | ✅ system built; drag-drop = last mile |

Two docs, two purposes:
- **`frontend/public/aem-eds-pipeline.html`** — the *visual* explainer (concepts, diagrams,
  the naming taxonomy, headless-vs-native comparison). Open it in a browser.
- **This file** — the *code-level* map: which file does what, and where the interesting bits are.

---

## Track A — Headless (`frontend/`)

Our Next.js 16 + React 19 app fetches DA.live content and renders shared-ui. Flow:

```
DA.live sheet (authored) ──Publish──> JSON at *.aem.live/<sheet>.json
        │
        ▼  browser
ChooseYourFareView.tsx  ──useQuery──>  daLiveClient.ts  ──fetch──>  /api/dalive
        │                                                               │
        │                            ★ THE API CALL HAPPENS HERE: src/app/api/dalive/route.ts
        │                              (server fetches DA server-to-server → dodges CORS)
        ▼
mapDaLiveToChooseYourFare.ts  (flat key/value sheet → typed component props)
        ▼
<ChooseYourFare>  wrapped in providers (src/app/providers.tsx)
```

**Key files** (all already commented inline):
- **`src/app/api/dalive/route.ts` — ★ where the API call happens.** Server-side proxy. DA's
  published JSON sends no CORS header, so the browser can't fetch it cross-origin — this route
  fetches it server-to-server. Preview vs live host chosen by `?preview`.
- `src/lib/daLiveClient.ts` — browser-side client that calls the proxy + flattens the sheet envelope.
- `src/app/[lang]/[region]/choose-your-fare/mapDaLiveToChooseYourFare.ts` — maps the flat
  `card1.*` / `card2.*` key/value sheet into typed `ChooseYourFare` props.
- `src/app/[lang]/[region]/choose-your-fare/ChooseYourFareView.tsx` — client component:
  `useQuery` → map → render (with a `MOCK` fallback until the sheet is authored).
- `src/app/providers.tsx` + `layout.tsx` — Redux + QueryClient + Router + ThemeProvider + design
  tokens. shared-ui isn't SSR-safe → client-only render behind a `mounted` gate.

Run it: `cd frontend && npm run dev` → open `/en/us/choose-your-fare`.

---

## Track B — Native / EDS-rendered (`blocks/`, `build/`, `component-*.json`)

Adobe's edge renders the page; our shared-ui components run as **React islands** inside vanilla
EDS blocks. EDS is *no-build*, so we pre-bundle the React runtime with esbuild and commit the output.

### ★ How the React → block mapping works

When EDS renders a page, for each block named `<name>` it auto-imports `blocks/<name>/<name>.js`
and calls its default export with the block's DOM element (EDS's `decorate()` contract):

```
Authored block table (rows of:  key | value)
        │
        ▼  EDS auto-loads  blocks/<name>/<name>.js   (e.g. blocks/button/button.js)
renderBlock(block, 'Button')                          ← blocks/_react/block.js  (orchestrator)
        │
        ├─ parseBlock(block)        ← blocks/_react/parse.js   ★ the table → props mapping
        │     reads the 2-col rows into a props object; supports dotted + [index] paths + booleans:
        │        children            ->  "Book now"
        │        fareCards[0].title  ->  array of objects
        │        card1.isBestValue   ->  boolean
        │
        ├─ ensureIslandCss()        injects react-runtime.css once
        │
        ▼  dynamic import of the esbuild bundle (react-runtime.js)
mountComponent(el, 'Button', props)                   ← blocks/_react/runtime.jsx  (the island)
        │     registry['Button'] → the shared-ui Button   ← blocks/_react/registry.jsx
        ▼
createRoot(el).render( <Providers> <Button {...props}/> </Providers> )
```

**Key files:**
- `blocks/<name>/<name>.js` — 2-line entry per block; EDS's naming convention auto-loads it.
  Just calls `renderBlock(block, 'ComponentName')`.
- **`blocks/_react/block.js` — the orchestrator**: parse table → props, ensure CSS, import the
  bundle, mount.
- **`blocks/_react/parse.js` — ★ the table → props mapping.** Generic: any component is
  configurable from a key/value table with zero per-component code.
- `blocks/_react/registry.jsx` — name → shared-ui component map.
  **Add a component here + a 2-line block folder = a new block.**
- `blocks/_react/runtime.jsx` — the React island: wraps the component in
  Redux/Query/Router/ThemeProvider + imports design tokens. Bundled by esbuild.
- `build/esbuild.mjs` — the bundler (the "extra plumbing" EDS lacks). Externalizes shared-ui
  barrel junk (`@ownid/react`, query-devtools, AEM fonts) so they tree-shake out.
- `blocks/_react/react-runtime.js` / `.css` — **committed build output** (EDS is no-build, so the
  bundle must live in the repo).

### The DA.live picker config (JSON — can't be commented inline, so documented here)
- **`component-definition.json` — the picker.** The `hal-shared-ui` group lists our 5 blocks
  (button, headline, savings-badge, fare-card, choose-your-fare). Each has a
  `plugins.da.unsafeHTML` template (the block skeleton DA inserts) + `fields` (which cells are
  editable). **This is what makes a block appear in DA.live's builder to drag.**
- `component-filters.json` — nesting rules: our 5 block ids are added to the `section` group so
  they can be dropped into a section.
- `component-models.json` — field models that back the builder's edit forms.

Build the island: `node build/esbuild.mjs` (needs Node ≥ 20 + the React/shared-ui deps installed locally over corp VPN — those deps are intentionally NOT in this repo's package.json, since the pre-built bundle above is what EDS serves).
Test rendering locally: open `blocks/_react/gallery.html` (mimics EDS block loading for all 5).

### The last mile — what actually makes drag-drop work
The picker is a **cloud** feature: DA.live reads `component-definition.json` from the *deployed*
branch. So the blocks + configs must be pushed to a branch DA.live can read; only then do they
appear in the builder's block picker to drag. (Everything up to that point is done + test-driven
locally via the gallery.)

---

## One-time engine vs per-component cost
The engine (esbuild + island + providers + the generic parser) is built **once**. Adding
component #6, #7… is ~3 lines each: a `registry.jsx` line + a 2-line block file + a picker entry
in `component-definition.json` + a filter line. The bundle cost is front-loaded — the first
component pulls in React + shared-ui; the rest share it.

---

## Repo layout cheat-sheet
```
hal/
├─ POC-GUIDE.md                 ← you are here (code map)
├─ frontend/                    ← Track A: headless Next.js app
│  ├─ public/aem-eds-pipeline.html   ← visual concept explainer
│  └─ src/                            ← app, api/dalive proxy, client, mapper
├─ blocks/                      ← Track B: EDS blocks
│  ├─ _react/                        ← the island engine (block.js, parse.js, registry, runtime, bundle, gallery)
│  └─ button|headline|savings-badge|fare-card|choose-your-fare/   ← 2-line block entries
├─ build/esbuild.mjs            ← Track B bundler
└─ component-{definition,filters,models}.json   ← DA.live picker config
```
