# HAL × Adobe EDS / DA.live — Native Authoring POC Guide

**Start here.** This repo (`hal`, from `AdobeDevXSC/hal`) is a proof-of-concept answering one question:
**can we reuse HAL's `@hal-sbn-root/shared-ui` design system inside Adobe Edge Delivery Services (EDS)** —
where authors compose pages in **DA.live** (Document Authoring), **Adobe's edge renders the page**, and
authors can **drag / rearrange** our components?

Answer so far: **yes** — our shared-ui components run as **React islands** inside vanilla EDS blocks.

> A prior track — **headless** (a Next.js app that fetched DA.live JSON and rendered shared-ui itself) —
> was proven separately and is **archived** at `../hal-headless-poc/`. This repo is the **native**
> (EDS-rendered) track, plus the **Universal Editor** work on the roadmap below.

---

## The core idea — "React islands"

An EDS page is **mostly plain HTML** rendered by Adobe's edge (nav, text, images, footer — no React).
Each of our components is a **self-contained pocket of React** — an *island* — mounted into one block's
`<div>`, with its own React runtime bundled in. The rest of the page never loads React. (The term comes
from "islands architecture": the page is the static ocean; each interactive component is a React island.)

EDS is **no-build**, so we pre-bundle the island (React + shared-ui + providers) with esbuild and **commit
the output** — EDS serves it as-is.

---

## ★ How the React → block mapping works

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

---

## The DA.live picker config (JSON — can't be commented inline, so documented here)
- **`component-definition.json` — the picker.** The `hal-shared-ui` group lists our 5 blocks
  (button, headline, savings-badge, fare-card, choose-your-fare). Each has a
  `plugins.da.unsafeHTML` template (the block skeleton DA inserts) + `fields` (which cells are
  editable). **This is what makes a block appear in DA.live's builder to drag.**
- `component-filters.json` — nesting rules: our 5 block ids are added to the `section` group so
  they can be dropped into a section.
- `component-models.json` — field models that back the builder's edit forms.

---

## The last mile — what actually makes drag-drop work
The picker is a **cloud** feature: DA.live reads `component-definition.json` from the *deployed*
branch. So the blocks + configs must be pushed to a branch DA.live can read; only then do they
appear in the builder's block picker to drag. Everything up to that point is done + test-driven locally.

Two ways content maps to page order:
- **Reorder in the doc** → the page reorders 1:1 (EDS is document-driven; each block becomes a `<div>`
  in the authored order, decorated top-to-bottom). Works today with just the committed block code.
- **Drag / reorder in the builder** → needs `component-definition.json` deployed so the palette lists
  the blocks.

---

## One-time engine vs per-component cost
The engine (esbuild + island + providers + the generic parser) is built **once**. Adding
component #6, #7… is ~3 lines each: a `registry.jsx` line + a 2-line block file + a picker entry
in `component-definition.json` + a filter line. The bundle cost is front-loaded — the first
component pulls in React + shared-ui; the rest share it.

---

## Roadmap — what's next
The renderer stays `@hal-sbn-root/shared-ui` throughout; we only change **who authors** and **who renders**.

- **Now — Native drag-drop (this repo).** Blocks render on the EDS page; authors rearrange by reordering.
  Last mile: push → deploy → the DA builder lists the blocks to drag.
- **Next — Universal Editor (the "live editor").** In-context WYSIWYG editing, two flavors: **native**
  (xwalk on EDS) and **headless** (instrument our own app). Both need **`data-aue-*` instrumentation per
  component** + an **AEM** connection. The editing *overlay* is demoable locally; **saving** edits needs
  the AEM backend (a DevOps/access item).
- **Future — Content Fragments.** Structured, schema-defined headless content in AEM via GraphQL. Same
  shared-ui renderer, different source — proves the design system is source-agnostic.

---

## Build & test
- **Build the island:** `node build/esbuild.mjs` (Node ≥ 20 + the React/shared-ui deps installed locally
  over corp VPN — deps are intentionally **not** in `package.json`, since the committed bundle is what
  EDS serves).
- **Test rendering, no deploy:** serve the repo statically and open `blocks/_react/gallery.html` (renders
  all 5 components through the block code).
- **Test on real EDS (your machine):** `npx @adobe/aem-cli up`, then hand-author a block table in a
  DA.live doc → preview → it renders through the real EDS pipeline; reorder the tables → the page reorders.
- **CI (`npm ci` + `npm run lint`) must pass:** the island (`blocks/_react/`, `build/`) is in
  `.eslintignore` and the bundled CSS is in `.stylelintignore`; the private `shared-ui` dep is kept out of
  `package.json` (CI can't reach HAL's Artifactory).

---

## Repo layout cheat-sheet
```
hal/
├─ POC-GUIDE.md                 ← you are here
├─ blocks/
│  ├─ _react/                        ← the island engine (block.js, parse.js, registry, runtime, bundle, gallery)
│  └─ button|headline|savings-badge|fare-card|choose-your-fare/   ← 2-line block entries
├─ build/esbuild.mjs            ← island bundler
├─ component-{definition,filters,models}.json   ← DA.live picker config
└─ scripts | styles | head.html | fstab.yaml …  ← EDS boilerplate (base project)
```
