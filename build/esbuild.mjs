// Bundles the React island into blocks/_react/react-runtime.js (+ .css).
// Run: node build/esbuild.mjs  — commit both outputs (EDS is no-build).
import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['blocks/_react/runtime.jsx'],
  outfile: 'blocks/_react/react-runtime.js',
  bundle: true,
  format: 'esm',
  minify: true,
  jsx: 'automatic',
  target: ['es2020'],
  // Externalize barrel junk / fonts that shouldn't be inlined into the bundle.
  external: ['@tanstack/react-query-devtools', '@ownid/react', '/etc.clientlibs/*', '*.woff2', '*.woff'],
});

// eslint-disable-next-line no-console
console.log('✓ built blocks/_react/react-runtime.js (+ .css)');
