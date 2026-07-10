// Orchestrator shared by every shared-ui block. Parses the authored table into
// props, then lazy-imports the bundled runtime and mounts the named component.
import { parseBlock } from './parse.js';

function ensureIslandCss() {
  if (document.querySelector('link[data-react-island]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/blocks/_react/react-runtime.css';
  link.setAttribute('data-react-island', '');
  document.head.append(link);
}

export async function renderBlock(block, componentName) {
  const props = parseBlock(block);
  block.textContent = '';
  ensureIslandCss();
  const { mountComponent } = await import('/blocks/_react/react-runtime.js');
  mountComponent(block, componentName, props);
}
