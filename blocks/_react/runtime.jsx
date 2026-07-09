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

// Mount into a dedicated child "island", keeping the authored source rows in the
// DOM (hidden). Universal Editor edits the source + re-runs decorate on change;
// by not clobbering the source and reusing the root, the re-render updates cleanly.
export function mountComponent(block, name, props) {
  const Comp = registry[name];
  if (!Comp) {
    block.textContent = `[unknown shared-ui component: ${name}]`;
    return;
  }
  [...block.children].forEach((c) => {
    if (!c.hasAttribute('data-island-root')) c.style.display = 'none';
  });
  let target = block.querySelector(':scope > [data-island-root]');
  if (!target) {
    target = document.createElement('div');
    target.setAttribute('data-island-root', '');
    block.append(target);
    target._root = createRoot(target);
  }
  target._root.render(tree(Comp, props));
}
