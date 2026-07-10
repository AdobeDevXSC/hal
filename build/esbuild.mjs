/*
 * esbuild.mjs — the one and only build step.
 *
 *   Run:  node build/esbuild.mjs
 *
 * It bundles runtime.jsx (plus React and the HAL component library) into two
 * files: blocks/_react/react-runtime.js and react-runtime.css. COMMIT BOTH —
 * Edge Delivery serves them directly and never builds on the server.
 *
 * Re-run this only when runtime.jsx or the component list (registry.jsx) changes.
 * The other block files are plain JS and are served as-is, so editing them needs
 * no rebuild.
 */
import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['blocks/_react/runtime.jsx'],
  outfile: 'blocks/_react/react-runtime.js',
  bundle: true,
  format: 'esm',
  minify: true,
  jsx: 'automatic',
  target: ['es2020'],
  // Leave these out of the bundle: dev-only tools and font/asset URLs the HAL
  // library references but that are served elsewhere (or not at all here).
  external: ['@tanstack/react-query-devtools', '@ownid/react', '/etc.clientlibs/*', '*.woff2', '*.woff'],
});

// eslint-disable-next-line no-console
console.log('✓ built blocks/_react/react-runtime.js (+ .css)');
