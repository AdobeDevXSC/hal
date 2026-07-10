// Shared React-island runtime for all component blocks. Built once by esbuild
// (→ react-runtime.js/.css) and loaded by every block. Any registered shared-ui
// component mounts here, wrapped in the providers it needs + the design tokens.
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@hal-sbn-root/shared-ui';
import '../../node_modules/@hal-sbn-root/shared-ui/lib/styles/global.css';
import { registry } from './registry.jsx';

const store = configureStore({ reducer: { app: (s = {}) => s } });
const queryClient = new QueryClient();

function tree(Comp, props) {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ThemeProvider brand="hal" is2026FontsEnabled={false}>
            <Comp {...props} />
          </ThemeProvider>
        </MemoryRouter>
      </QueryClientProvider>
    </Provider>
  );
}

// Roots are tracked in a WeakMap, NOT on the DOM element. A `_root` property is
// lost when Universal Editor serializes + reloads the DOM, which would leave an
// island target with no root (→ crash, "component not showing"). Keyed by element,
// a fresh or serialized target simply isn't in the map, so we (re)create its root.
const roots = new WeakMap();

// Mount into a dedicated child "island", keeping the authored source rows in the
// DOM (hidden) so UE can edit them + re-run decorate. Robust to UE's serialize/
// reload: an existing island target with no tracked root is healed, not crashed.
export function mountComponent(block, name, props) {
  const Comp = registry[name];
  if (!Comp) {
    block.textContent = `[unknown shared-ui component: ${name}]`;
    return;
  }
  let target = block.querySelector(':scope > [data-island-root]');
  if (!target) {
    target = document.createElement('div');
    target.setAttribute('data-island-root', '');
    block.append(target);
  }
  // Hide the authored source (everything except the island target).
  [...block.children].forEach((c) => {
    if (c !== target) c.style.display = 'none';
  });
  let root = roots.get(target);
  if (!root) {
    target.replaceChildren(); // drop any stale (serialized) React output first
    root = createRoot(target);
    roots.set(target, root);
  }
  root.render(tree(Comp, props));
}
