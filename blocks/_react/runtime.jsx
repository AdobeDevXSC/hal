// The React "island" — esbuild entry point. Bundled to react-runtime.js (+ .css),
// both committed because EDS is no-build. Mounts a registered shared-ui component
// into a vanilla EDS block element, wrapped in the providers shared-ui expects.
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

export function mountComponent(el, name, props) {
  const Comp = registry[name];
  if (!Comp) {
    el.textContent = `[unknown: ${name}]`;
    return;
  }
  createRoot(el).render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ThemeProvider brand="hal" is2026FontsEnabled={false}>
            <Comp {...props} />
          </ThemeProvider>
        </MemoryRouter>
      </QueryClientProvider>
    </Provider>,
  );
}
