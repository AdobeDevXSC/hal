// The React "island" — esbuild entry point. Bundled to react-runtime.js (+ .css),
// both committed because EDS is no-build. Mounts a registered shared-ui component
// into a target element, wrapped in the providers shared-ui expects.
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

// React roots kept OFF the DOM element: a root stored on the node itself is lost
// when Universal Editor serializes/reloads the DOM, which then crashes on the
// next render. Keyed by the render target; healed (recreated) if absent.
const roots = new WeakMap();

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

export function mountComponent(el, name, props) {
  const Comp = registry[name];
  if (!Comp) {
    el.textContent = `[unknown: ${name}]`;
    return;
  }
  let root = roots.get(el);
  if (!root) {
    // Heal: after a UE reload the WeakMap is empty but the target may still hold
    // stale markup — clear it, then own it with a fresh root.
    el.innerHTML = '';
    root = createRoot(el);
    roots.set(el, root);
  }
  root.render(<Providers><Comp {...props} /></Providers>);
}
