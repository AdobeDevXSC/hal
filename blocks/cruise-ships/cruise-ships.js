/*
 * Cruise Ships block
 * Renders the HAL fleet listing (mirrors hollandamerica.com/en/us/cruise-ships):
 * a responsive grid of ship cards — image, ship name, ship class, and a
 * "See Ship Details" link.
 *
 * "Generated from different sources":
 *   - Ship feed (source of truth)  → ship specs: name, class, code, image, detail link.
 *   - Editorial (authored config)  → page hero heading/subheading, feed endpoint override.
 *   - Search API (future)          → optional "lowest fare from" per ship (Fusion, later).
 *
 * EDS constraint: there is no server runtime, so this block fetches from a
 * CONFIGURABLE endpoint that defaults to a bundled sample feed. Point the
 * authored `endpoint` (or DATA_ENDPOINT) at the real feed / a CORS-enabled
 * proxy to go live without touching the UI.
 *
 * Authoring contract (optional two-column "key | value" config table):
 *   heroHeading    | Our Ships
 *   heroSubheading | Explore the Holland America Line fleet.
 *   endpoint       | https://…/ships.json           (overrides the bundled sample)
 *   detailBase     | /en/us/cruise-ships            (base path for ship detail links)
 */

import { createOptimizedPicture } from '../../scripts/aem.js';

/* ---------- helpers ---------- */

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('data-') || k === 'role' || k.startsWith('aria-')) {
      node.setAttribute(k, v);
    } else node[k] = v;
  });
  children.filter(Boolean).forEach((c) => node.append(c));
  return node;
}

function slugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/* ---------- feed normalization (defensive — tolerant of field-name variants) ---------- */

function normalizeShip(raw, detailBase) {
  const name = raw.name ?? raw.shipName ?? raw.title ?? '';
  const id = raw.id ?? raw.slug ?? slugify(name);
  const shipClass = raw.shipClass ?? raw.class ?? raw.category ?? '';
  const image = raw.image ?? raw.imageUrl ?? raw.heroImage ?? raw.thumbnail ?? '';
  const detailPath = raw.detailPath ?? raw.url ?? raw.link
    ?? (id ? `${detailBase}/${id}` : detailBase);

  return {
    id,
    name,
    shipCode: raw.shipCode ?? raw.code ?? '',
    shipClass,
    image,
    imageAlt: raw.imageAlt ?? raw.alt ?? (name ? `${name} at sea` : ''),
    detailPath,
  };
}

/* ---------- rendering ---------- */

function renderMedia(ship) {
  const media = el('div', { class: 'cruise-ships-card-media' });
  if (ship.image) {
    // Relative paths get AEM optimization; absolute (external) URLs render as-is.
    if (ship.image.startsWith('http')) {
      media.append(el('img', {
        class: 'cruise-ships-card-img', src: ship.image, alt: ship.imageAlt, loading: 'lazy',
      }));
    } else {
      media.append(createOptimizedPicture(ship.image, ship.imageAlt, false));
    }
  } else {
    media.append(el('span', { class: 'cruise-ships-card-media-placeholder', text: ship.name || 'Ship' }));
  }
  return media;
}

function renderCard(ship) {
  const body = el(
    'div',
    { class: 'cruise-ships-card-body' },
    el('h3', { class: 'cruise-ships-card-name', text: ship.name }),
  );
  if (ship.shipClass) {
    body.append(el('p', { class: 'cruise-ships-card-class', text: ship.shipClass }));
  }
  body.append(el('a', {
    class: 'cruise-ships-card-link',
    href: ship.detailPath,
    'aria-label': `See ship details for ${ship.name}`,
    'data-testid': `ship-details-link-${ship.id}`,
    text: 'See Ship Details',
  }));

  return el(
    'article',
    { class: 'cruise-ships-card', 'data-testid': `ship-card-${ship.id}` },
    renderMedia(ship),
    body,
  );
}

export default async function decorate(block) {
  // optional authored config (key | value rows)
  const config = {};
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    if (cells.length >= 2) config[cells[0].textContent.trim()] = cells[1].textContent.trim();
  });

  const heroHeading = config.heroHeading || 'Our Ships';
  const heroSubheading = config.heroSubheading
    || 'Explore the Holland America Line fleet and find the ship that’s right for you.';
  const detailBase = config.detailBase || '/en/us/cruise-ships';
  const dataEndpoint = config.endpoint
    || `${window.hlx.codeBasePath}/blocks/cruise-ships/sample-ships.json`;

  block.textContent = '';

  // Hero banner
  block.append(el(
    'section',
    { class: 'cruise-ships-hero', 'data-testid': 'ships-hero' },
    el('h1', { class: 'cruise-ships-hero-heading', text: heroHeading }),
    el('p', { class: 'cruise-ships-hero-subheading', text: heroSubheading }),
  ));

  const grid = el('div', {
    class: 'cruise-ships-grid', role: 'list', 'aria-label': 'Cruise ships', 'data-testid': 'ships-grid',
  });
  const status = el('p', { class: 'cruise-ships-status', 'aria-live': 'polite', text: 'Loading ships…' });
  block.append(el('div', { class: 'cruise-ships-main' }, status, grid));

  let ships = [];
  try {
    const res = await fetch(dataEndpoint);
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    const data = await res.json();
    const list = data.ships ?? data.data ?? (Array.isArray(data) ? data : []);
    ships = list.map((s) => normalizeShip(s, detailBase)).filter((s) => s.name);
  } catch (error) {
    ships = [];
  }

  status.remove();

  if (ships.length === 0) {
    grid.remove();
    block.querySelector('.cruise-ships-main').append(el('div', {
      class: 'cruise-ships-empty', role: 'alert', 'data-testid': 'ships-empty-message',
    }, el('p', { text: 'Ship information is unavailable right now. Please try again later.' })));
    return;
  }

  ships.forEach((ship) => {
    grid.append(el('div', { role: 'listitem', class: 'cruise-ships-grid-item' }, renderCard(ship)));
  });
}
