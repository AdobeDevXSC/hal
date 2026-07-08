/// <reference types="@fastly/js-compute" />

// Folder-mapped handler for hal. The page is authored once at
// `<BASE>/default` (DA: /adobedevxsc/hal/en/find-a-cruise/default) and every
// `<BASE>/<id>` URL renders that same shell — an SEO-friendly path instead of a
// `?id=` query. This boilerplate just serves the shell and injects the mapped
// id; swap in real per-id content (e.g. a backend fetch) where marked below.
// See kp-hw's health-encyclopedia-article-handler.js for a full example.

import { env } from 'fastly:env';

// Folder-mapping base + the authored shell doc it fetches.
export const BASE = '/en/find-a-cruise';
const SHELL_PATH = `${BASE}/default`;

// Mapped id from a request path, or null when this isn't a mapped-detail request
// (the /default doc itself, the base, or a nested/asset path).
export function getMappedId(pathname) {
  const prefix = `${BASE}/`;
  if (!pathname.startsWith(prefix)) return null;
  const seg = pathname.slice(prefix.length).split('/')[0].trim();
  if (!seg || seg === 'default') return null;
  return seg;
}

// EDS page-shell origins, resolved per environment at runtime so there's nothing
// to flip or revert before a PR. Each origin needs its own declared backend:
//   - local `serve` (Viceroy)   → eds-local  (fastly.toml)
//   - preview host (*.aem.page) → eds-preview (edgeFunctions.yaml)
//   - production                → eds-prod    (edgeFunctions.yaml)
const PROD_ORIGIN = 'https://main--hal--adobedevxsc.aem.live';
const PREVIEW_ORIGIN = 'https://main--hal--adobedevxsc.aem.page';
const DEV_ORIGIN = 'http://localhost:3000';

// FASTLY_HOSTNAME is "localhost" only in the local runtime; in prod/preview it
// is a real cache-node name, so we fall back to the request host to choose.
export function isLocalDev() {
  return env('FASTLY_HOSTNAME') === 'localhost';
}

export function getShellTarget(req) {
  if (isLocalDev()) return { origin: DEV_ORIGIN, backend: 'eds-local' };
  const host = new URL(req.url).hostname;
  if (host.includes('aem.page')) return { origin: PREVIEW_ORIGIN, backend: 'eds-preview' };
  return { origin: PROD_ORIGIN, backend: 'eds-prod' };
}

const escHtml = (v) => String(v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Render the folder-mapped page: fetch the shell and inject content for `id`.
export async function cruiseHandler(req) {
  const id = getMappedId(new URL(req.url).pathname);
  if (!id) return new Response('Missing id', { status: 400 });

  // The shell is the /default doc — a different path than the request — so
  // fetching it from the origin won't re-enter this function (loop guard).
  const { origin, backend } = getShellTarget(req);
  const shellRes = await fetch(`${origin}${SHELL_PATH}`, { backend });
  if (!shellRes.ok) {
    return new Response(`Shell not available: ${SHELL_PATH}`, { status: shellRes.status });
  }
  const shell = await shellRes.text();

  // TODO: replace this with real per-id content. For now, inject the mapped id
  // as a default-content section inside <main>; scripts.js decorates it.
  const sections = `<div><p>ID of cruise: ${escHtml(id)}</p></div>`;
  const html = shell.replace(/<main\b[^>]*>/i, (m) => `${m}${sections}`);

  return new Response(html, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

// DEV ONLY: proxy any non-mapped request (scripts, styles, images, fragments) to
// the shell origin so the local dev server is a complete preview. In production
// the CDN only routes the mapped path to this function, so this branch isn't hit.
export function proxyToShell(req) {
  const url = new URL(req.url);
  const { origin, backend } = getShellTarget(req);
  return fetch(`${origin}${url.pathname}${url.search}`, { backend });
}
