/*
 * runtime.jsx — the ONLY file we "compile". Everything else in this folder is
 * plain JavaScript the browser runs as-is.
 *
 * Why compile? HAL's components are React, and React has to be bundled. So we run
 *     node build/esbuild.mjs
 * which turns THIS file (plus React and the HAL library) into two ready-to-serve
 * files: react-runtime.js and react-runtime.css. Both are committed to git,
 * because Edge Delivery serves files directly — there is no build step on the server.
 *
 * What it exposes: mountComponent(), which draws a HAL component into a given spot
 * on the page. The component is wrapped in the "providers" the HAL library expects
 * — think of them as the batteries every component needs to run:
 *   - Provider (Redux)          → shared state
 *   - QueryClientProvider       → data fetching/cache (unused by static blocks, but required)
 *   - MemoryRouter              → routing context
 *   - ThemeProvider brand="hal" → HAL colors, fonts and design tokens
 */
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

// A React "root" owns one spot on the page. We keep roots in a WeakMap keyed by
// the target element — NOT on the element itself. The editor can throw the page's
// JavaScript away and rebuild the DOM; a root stored on the element would be lost
// and crash on the next draw. If a root is ever missing, we simply make a new one
// ("heal") so the component keeps working.
const roots = new WeakMap();

// The "batteries" wrapper shared by every component.
function Providers({ children }) {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ThemeProvider brand="hal" is2026FontsEnabled={false}>
            {children}
          </ThemeProvider>
        </MemoryRouter>
      </QueryClientProvider>
    </Provider>
  );
}

// Draw component `name` with settings `props` into element `el`.
// Called on first render AND every time the author edits.
export function mountComponent(el, name, props) {
  const Comp = registry[name];
  if (!Comp) {
    el.textContent = `[unknown: ${name}]`;
    return;
  }
  let root = roots.get(el);
  if (!root) {
    el.innerHTML = ''; // heal: clear anything stale, then take ownership
    root = createRoot(el);
    roots.set(el, root);
  }
  root.render(<Providers><Comp {...props} /></Providers>);
}
