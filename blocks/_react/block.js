// The one helper every component block calls: parse the authored table → props,
// then mount the named shared-ui component via the shared runtime bundle.
import { parseBlock } from './parse.js';

function ensureIslandCss() {
  if (document.querySelector('link[data-react-island]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/blocks/_react/react-runtime.css';
  link.setAttribute('data-react-island', '');
  document.head.append(link);
}

// We do NOT wipe the block. The authored source rows stay in the DOM (hidden) so
// Universal Editor can edit them + re-run decorate on change; React mounts into a
// child island, so an in-place re-render on edit never clobbers the source.
export async function renderBlock(block, componentName) {
  ensureIslandCss();
  const props = parseBlock(block);
  const { mountComponent } = await import('/blocks/_react/react-runtime.js');
  mountComponent(block, componentName, props);
}
