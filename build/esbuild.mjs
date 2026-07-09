// Bundles React-island blocks for the EDS-rendered (native) path.
// EDS is no-build by design — this bundler IS the "extra plumbing" that lets a
// vanilla EDS block mount a shared-ui React component. It compiles island.jsx
// (React + shared-ui + providers + design tokens) into a single ESM file the
// block's decorate() dynamically imports, plus a sibling .css.
import * as esbuild from 'esbuild';

const result = await esbuild.build({
  entryPoints: ['blocks/_react/runtime.jsx'],
  outfile: 'blocks/_react/react-runtime.js',
  bundle: true,
  format: 'esm',
  minify: true,
  jsx: 'automatic',
  target: ['es2020'],
  logLevel: 'info',
  metafile: true,
  // shared-ui's barrel reaches modules ChooseYourFare doesn't use (auth widget,
  // query devtools) + an AEM-hosted font url. Externalize so they tree-shake out
  // instead of erroring the bundle. (This is part of the "extra plumbing".)
  external: [
    '@tanstack/react-query-devtools',
    '@ownid/react',
    '/etc.clientlibs/*',
    '*.woff2',
    '*.woff',
  ],
});

const out = Object.entries(result.metafile.outputs).map(
  ([f, m]) => `  ${f}  (${(m.bytes / 1024).toFixed(0)} kB)`,
);
console.log('\nBuilt React-island block:\n' + out.join('\n'));
