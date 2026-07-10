// Orchestrator shared by every shared-ui block. Non-destructive so the block
// stays editable in Universal Editor: the authored rows are kept in the DOM
// (visually hidden via CSS, NOT removed) so UE can bind + edit them, while the
// React component renders into a dedicated child. Authors edit fields in UE and
// the component re-renders in place with the new values.
import { parseBlock } from './parse.js';

const observed = new WeakSet();

function ensureIslandCss() {
  if (document.querySelector('link[data-react-island]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/blocks/_react/react-runtime.css';
  link.setAttribute('data-react-island', '');
  document.head.append(link);
}

function getIslandHost(block) {
  let host = block.querySelector(':scope > [data-island-root]');
  if (!host) {
    host = document.createElement('div');
    host.setAttribute('data-island-root', '');
    // Appended last so the authored rows keep their nth-child positions, which
    // the component-definition field selectors depend on.
    block.append(host);
  }
  return host;
}

function inIsland(node) {
  const el = node.nodeType === 1 ? node : node.parentElement;
  return !!(el && el.closest('[data-island-root]'));
}

// Universal Editor edits text fields in place without re-running decorate(), so
// the React island would go stale until a refresh. Watch the authored rows and
// re-render on any change that isn't our own React output. Editor-only.
function observeEditorEdits(block, host, componentName, mount) {
  if (observed.has(block)) return;
  observed.add(block);
  let scheduled = false;
  const obs = new MutationObserver((mutations) => {
    if (mutations.every((m) => inIsland(m.target))) return; // ignore our own output
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      mount(host, componentName, parseBlock(block));
    });
  });
  obs.observe(block, { childList: true, subtree: true, characterData: true });
}

export async function renderBlock(block, componentName) {
  const props = parseBlock(block);
  ensureIslandCss();
  // Mark the authored rows so CSS hides them, but leave them in the DOM for UE.
  [...block.children].forEach((row) => {
    if (!row.hasAttribute('data-island-root')) row.setAttribute('data-island-source', '');
  });
  const host = getIslandHost(block);
  const { mountComponent } = await import('/blocks/_react/react-runtime.js');
  mountComponent(host, componentName, props);
  // In the UE editor (block carries data-aue-resource), keep the island in sync
  // with in-place field edits.
  if (block.hasAttribute('data-aue-resource')) {
    observeEditorEdits(block, host, componentName, mountComponent);
  }
}
