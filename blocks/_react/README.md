# shared-ui React blocks

Reuse HAL's real design system (`@hal-sbn-root/shared-ui`, React) as authorable
Edge Delivery blocks — rendered on the page **and** editable in Universal Editor.

## The idea in one line

A small wrapper drops a real HAL React component into a normal EDS block. We call
that wrapper a **React island**.

## The pieces

| File | Plain-English job |
|------|-------------------|
| `registry.jsx` | The menu of HAL components authors may use. |
| `parse.js` | Reads the author's table into settings for the component. |
| `runtime.jsx` | The only compiled file. Draws a component with its "batteries" (theme / data / router / state). |
| `block.js` | The conductor. Runs per block, shows the component, keeps it in sync with edits. |
| `react-runtime.js` / `.css` | The compiled output. **Committed** — EDS has no build step. |
| `../button/button.js` | One line: "this block = the Button." |
| `../button/button.css` | Exists so EDS doesn't 404; also hides the author's rows. |

## How one button renders

```
author's table  ─▶  block.js  ─▶  parse.js  ─▶  { children, variant }
                       │
                       ├─ hide the rows (kept for the editor)
                       ├─ add a box to draw into
                       └─ runtime.js  ─▶  mount <Button> into the box
```

## Building

Only when `runtime.jsx` or the component list changes:

```
node build/esbuild.mjs        # writes react-runtime.js + .css — commit both
```

- React / the HAL library / esbuild are installed **locally but not in
  `package.json`**: CI can't reach the private registry, and the committed bundle
  is what actually runs.
- `.npmrc` (the private registry URL) stays **local, never committed**.

## Four problems we solved

1. **Editing blanked the component (in the editor).** UE blanks the table's *name*
   column on save. → Read the field name from `data-aue-prop` (`parse.js`).
2. **Text edits didn't show until refresh.** UE changes text in place without
   re-running us. → A `MutationObserver` redraws on any row change (`block.js`).
3. **The component crashed on reload.** A React root stored on the DOM element is
   lost when the editor rebuilds the DOM. → Keep roots in a `WeakMap`, re-create if
   missing (`runtime.jsx`).
4. **Edited blocks stayed blank on the published page.** UE wipes the name column
   in the *saved source* too, and a published page has no `data-aue-prop` to fall
   back to. → Name fields by **position**; each block passes its field order, e.g.
   `renderBlock(block, 'Button', ['children', 'variant'])` (`parse.js` + `button.js`).

## Adding another component

1. Import it in `registry.jsx`, then rebuild the bundle.
2. Create `blocks/<name>/<name>.js` (one line) and `<name>.css` (same hide rule).
3. Register it in `component-definition.json`, `component-models.json`, and
   `component-filters.json`.
