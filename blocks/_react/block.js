/*
 * block.js — the conductor. Edge Delivery runs this once for every shared-ui block
 * on the page. It reads the author's content, shows the real component, and keeps
 * that component correct while an author is editing.
 *
 * The hard part is Universal Editor. The editor needs the author's table to stay
 * in the page so it can select and edit it — but we want the visitor (and author)
 * to SEE the finished component, not the raw table. So we do both at once:
 *
 *   1. Keep the author's rows in the page, just HIDDEN (see button.css). If we
 *      removed them, the editor would have nothing to attach its fields to.
 *   2. Draw the React component into a SEPARATE box ([data-island-root]) added
 *      after the rows, so the rows keep their positions.
 *   3. In the editor only, WATCH the rows and redraw when the author changes them,
 *      so text edits appear live without a page refresh.
 *
 * Together these give the "edit in the editor, see the component update" behaviour.
 */
import { parseBlock } from './parse.js';

// Remember which blocks we've already put a watcher on (kept off the DOM on
// purpose — see runtime.jsx for why we never store our own state on elements).
const observed = new WeakSet();

// Load the compiled component styles once, the first time any island appears.
function ensureIslandCss() {
  if (document.querySelector('link[data-react-island]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/blocks/_react/react-runtime.css';
  link.setAttribute('data-react-island', '');
  document.head.append(link);
}

// Find (or create) the box we draw the React component into.
function getIslandHost(block) {
  let host = block.querySelector(':scope > [data-island-root]');
  if (!host) {
    host = document.createElement('div');
    host.setAttribute('data-island-root', '');
    // Added last, so the author's rows keep the positions the editor relies on.
    block.append(host);
  }
  return host;
}

// Is this DOM node part of the box we draw into (i.e. our own output)?
function inIsland(node) {
  const el = node.nodeType === 1 ? node : node.parentElement;
  return !!(el && el.closest('[data-island-root]'));
}

// The editor changes text fields in place and does NOT re-run this file, so the
// component would show stale text until a refresh. This watches the author's rows
// and redraws whenever they change — ignoring the component's own output so it
// can't loop. Set up only inside the editor; live pages need no watcher.
function observeEditorEdits(block, host, componentName, mount, fields) {
  if (observed.has(block)) return;
  observed.add(block);
  let scheduled = false;
  const obs = new MutationObserver((mutations) => {
    if (mutations.every((m) => inIsland(m.target))) return; // our own output, ignore
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      mount(host, componentName, parseBlock(block, fields));
    });
  });
  obs.observe(block, { childList: true, subtree: true, characterData: true });
}

// `fields` is the block's field names in order (e.g. ['children','variant']). It
// lets parse.js name fields by position when the editor has wiped the name cells.
export async function renderBlock(block, componentName, fields) {
  const props = parseBlock(block, fields);    // 1. read the author's table
  ensureIslandCss();                          // 2. make sure component styles are loaded
  [...block.children].forEach((row) => {      // 3. hide the rows, but keep them for the editor
    if (!row.hasAttribute('data-island-root')) row.setAttribute('data-island-source', '');
  });
  const host = getIslandHost(block);          // 4. make/find the box to draw into
  const { mountComponent } = await import('/blocks/_react/react-runtime.js');
  mountComponent(host, componentName, props); // 5. draw the component

  // 6. In the editor only (block carries data-aue-resource), keep it live.
  if (block.hasAttribute('data-aue-resource')) {
    observeEditorEdits(block, host, componentName, mountComponent, fields);
  }
}
