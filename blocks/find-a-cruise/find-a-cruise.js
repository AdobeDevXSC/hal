/*
 * Find A Cruise block
 * Mirrors the Sanity / Storyblok POC find-a-cruise page: editorial config from
 * the CMS + cruise results from HAL's Fusion (Solr) search.
 *
 * EDS constraint: there is no server runtime to proxy Fusion, and Fusion rejects
 * browser origins (403 + no CORS). So this block fetches from a CONFIGURABLE
 * endpoint that defaults to a bundled sample of the Fusion response. Point
 * DATA_ENDPOINT at a CORS-enabled proxy to go live without touching the UI.
 *
 * Authoring contract (optional): a two-column "key | value" config table, e.g.
 *   heroHeading   | Find Your Perfect Cruise
 *   heroSubheading| Browse our voyages ...
 */

const PAGE_SIZE = 3;

const DESTINATIONS = [
  ['A', 'Alaska'], ['AS', 'Asia'], ['AN', 'Australia/New Zealand'],
  ['NE', 'Canada/New England'], ['C', 'Caribbean'], ['E', 'Europe'],
  ['H', 'Hawaii'], ['M', 'Mexico'], ['PC', 'Panama Canal'],
  ['SA', 'South America'], ['SP', 'South Pacific'], ['TA', 'Transatlantic'],
];

const SHIPS = [
  ['ED', 'Eurodam'], ['KD', 'Koningsdam'], ['NA', 'Nieuw Amsterdam'],
  ['NS', 'Nieuw Statendam'], ['NO', 'Noordam'], ['OS', 'Oosterdam'],
  ['RN', 'Rotterdam'], ['VL', 'Volendam'], ['WE', 'Westerdam'],
  ['ZD', 'Zaandam'], ['ZU', 'Zuiderdam'],
];

const PORTS = [
  ['FLL', 'Fort Lauderdale, FL'], ['SEA', 'Seattle, WA'], ['SAN', 'San Diego, CA'],
  ['YVR', 'Vancouver, BC'], ['ROM', 'Rome (Civitavecchia), Italy'],
  ['BCN', 'Barcelona, Spain'], ['AMS', 'Amsterdam, Netherlands'],
];

const DURATIONS = [
  ['1-5', '1-5 Days'], ['6-9', '6-9 Days'], ['10-14', '10-14 Days'], ['15-999', '15+ Days'],
];

const SORTS = [
  ['recommended', 'Recommended'],
  ['priceFrom_asc', 'Price low to high'],
  ['priceFrom_desc', 'Price high to low'],
  ['departureDate_asc', 'Earliest departure'],
  ['departureDate_desc', 'Latest departure'],
  ['duration_asc', 'Shortest duration'],
  ['duration_desc', 'Longest duration'],
];

/* ---------- Fusion normalization (ported from the other POCs' fusion.ts) ---------- */

function parseDelimited(value) {
  const parts = String(value ?? '').split('#@#');
  return { name: parts[0] ?? '', code: parts[1] ?? '' };
}

function extractPrice(doc) {
  let priceFrom = null;
  let launchPrice = null;

  const anon = doc.price_USD_IN_anonymous_d;
  if (typeof anon === 'number' && anon > 0) priceFrom = anon;

  const anonLaunch = doc.launch_price_USD_IN_anonymous_d;
  if (typeof anonLaunch === 'number' && anonLaunch > 0) launchPrice = anonLaunch;

  if (priceFrom === null) {
    Object.keys(doc)
      .filter((k) => k.startsWith('price_USD_IN_') && k.endsWith('_d'))
      .forEach((k) => {
        const v = doc[k];
        if (typeof v === 'number' && v > 0 && (priceFrom === null || v < priceFrom)) priceFrom = v;
      });
  }
  return { priceFrom, launchPrice };
}

function extractTaxes(doc) {
  const key = Object.keys(doc).find(
    (k) => k.startsWith('taxExpenses_USD_') && typeof doc[k] === 'number' && doc[k] > 0,
  );
  return key ? doc[key] : null;
}

function normalizeCruise(doc) {
  const { priceFrom, launchPrice } = extractPrice(doc);
  return {
    cruiseId: doc.cruiseId,
    itineraryId: doc.itineraryId,
    entityId: doc.entityId,
    name: doc.name,
    shipId: doc.shipId,
    shipName: parseDelimited(doc.shipName).name,
    embarkPortCode: doc.embarkPortCode,
    embarkPortName: parseDelimited(doc.embarkPortName).name,
    disembarkPortCode: doc.disembarkPortCode,
    disembarkPortName: parseDelimited(doc.disembarkPortName).name,
    departDate: doc.departDate,
    arrivalDate: doc.arrivalDate,
    duration: doc.duration,
    destinations: (doc.destinationNames ?? []).map(parseDelimited),
    destinationIds: doc.destinationIds ?? [],
    cruiseType: doc.cruiseType,
    soldOut: doc.soldOut ?? false,
    priceFrom,
    launchPrice,
    taxesAndFees: extractTaxes(doc),
  };
}

/* ---------- helpers ---------- */

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('data-') || k === 'role' || k.startsWith('aria-') || k === 'for') {
      node.setAttribute(k, v);
    } else node[k] = v;
  });
  children.filter(Boolean).forEach((c) => node.append(c));
  return node;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatPrice(price) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(price);
}

function buildSelect(id, label, placeholder, options, value) {
  const select = el('select', {
    id, class: `find-a-cruise-pill${value ? ' find-a-cruise-pill-active' : ''}`, 'aria-label': label, 'data-testid': id,
  });
  select.append(el('option', { value: '', text: placeholder }));
  options.forEach(([val, txt]) => {
    const opt = el('option', { value: val, text: txt });
    if (val === value) opt.selected = true;
    select.append(opt);
  });
  return select;
}

/* ---------- filtering + sorting ---------- */

function applyFilters(cruises, filters) {
  return cruises.filter((c) => {
    if (filters.destination && !c.destinationIds.includes(filters.destination)) return false;
    if (filters.ship && c.shipId !== filters.ship) return false;
    if (filters.departurePort && c.embarkPortCode !== filters.departurePort) return false;
    if (filters.duration) {
      const [min, max] = filters.duration.split('-').map(Number);
      if (c.duration < min || c.duration > max) return false;
    }
    if (filters.departureDate) {
      const ym = c.departDate.slice(0, 7);
      if (ym !== filters.departureDate) return false;
    }
    if (filters.deals && !(c.launchPrice && c.launchPrice > c.priceFrom)) return false;
    return true;
  });
}

function applySort(cruises, sort) {
  const list = [...cruises];
  const byPrice = (a, b) => (a.priceFrom ?? Infinity) - (b.priceFrom ?? Infinity);
  const byDate = (a, b) => new Date(a.departDate) - new Date(b.departDate);
  const byDuration = (a, b) => a.duration - b.duration;
  switch (sort) {
    case 'priceFrom_asc': return list.sort(byPrice);
    case 'priceFrom_desc': return list.sort((a, b) => byPrice(b, a));
    case 'departureDate_asc': return list.sort(byDate);
    case 'departureDate_desc': return list.sort((a, b) => byDate(b, a));
    case 'duration_asc': return list.sort(byDuration);
    case 'duration_desc': return list.sort((a, b) => byDuration(b, a));
    default: return list;
  }
}

/* ---------- rendering ---------- */

function renderCard(cruise) {
  const detailUrl = `/en/us/cruise/${cruise.itineraryId}/${cruise.cruiseId}`;

  const info = el(
    'div',
    { class: 'find-a-cruise-card-info' },
    el('div', {}, el('span', { class: 'find-a-cruise-card-label', text: 'Ship' }), el('span', { text: cruise.shipName })),
    el('div', {}, el('span', { class: 'find-a-cruise-card-label', text: 'Depart' }), el('span', { text: cruise.embarkPortName })),
  );
  if (cruise.disembarkPortName && cruise.disembarkPortName !== cruise.embarkPortName) {
    info.append(el('div', {}, el('span', { class: 'find-a-cruise-card-label', text: 'Arrive' }), el('span', { text: cruise.disembarkPortName })));
  }

  const price = el('div', { class: 'find-a-cruise-card-price' });
  if (cruise.priceFrom) {
    price.append(el('span', { class: 'find-a-cruise-card-price-label', text: 'INSIDE FROM' }));
    const row = el(
      'div',
      { class: 'find-a-cruise-card-price-row' },
      el('span', { class: 'find-a-cruise-card-price-value', text: formatPrice(cruise.priceFrom) }),
    );
    if (cruise.launchPrice && cruise.launchPrice > cruise.priceFrom) {
      row.append(el('span', { class: 'find-a-cruise-card-price-was', text: formatPrice(cruise.launchPrice) }));
    }
    price.append(row, el('span', { class: 'find-a-cruise-card-price-note', text: '*USD Per Person based on double occupancy' }));
  } else {
    price.append(el('span', { text: 'Call for pricing' }));
  }

  const cta = el('a', {
    class: `find-a-cruise-cta button${cruise.soldOut ? ' find-a-cruise-cta-soldout' : ''}`,
    href: detailUrl,
    text: cruise.soldOut ? 'Join Waitlist' : 'View Cruise',
    'aria-label': `${cruise.soldOut ? 'Join Waitlist' : 'View Cruise'} - ${cruise.name}`,
    'data-testid': `cruise-cta-${cruise.cruiseId}`,
  });

  const media = el(
    'div',
    { class: 'find-a-cruise-card-media' },
    el('span', { class: 'find-a-cruise-card-media-placeholder', text: 'Route map' }),
  );
  if (cruise.soldOut) {
    media.append(el('span', { class: 'find-a-cruise-card-badge', text: 'Sold Out', 'data-testid': 'sold-out-badge' }));
  }

  const content = el(
    'div',
    { class: 'find-a-cruise-card-content' },
    el('h3', { class: 'find-a-cruise-card-title', text: `${cruise.duration}-Day ${cruise.name}` }),
    info,
    el('p', { class: 'find-a-cruise-card-date', text: formatDate(cruise.departDate) }),
    el('div', { class: 'find-a-cruise-card-footer' }, price, cta),
  );

  return el('article', {
    class: 'find-a-cruise-card', 'data-testid': `cruise-card-${cruise.cruiseId}`,
  }, media, content);
}

export default async function decorate(block) {
  // optional authored config (key | value rows)
  const config = {};
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    if (cells.length >= 2) config[cells[0].textContent.trim()] = cells[1].textContent.trim();
  });

  const heroHeading = config.heroHeading || 'Find Your Perfect Cruise';
  const heroSubheading = config.heroSubheading || 'Browse our voyages and set sail with Holland America Line.';

  block.textContent = '';

  // Hero banner
  block.append(el(
    'section',
    { class: 'find-a-cruise-hero', 'data-testid': 'hero-banner' },
    el('h2', { class: 'find-a-cruise-hero-heading', text: heroHeading }),
    el('p', { class: 'find-a-cruise-hero-subheading', text: heroSubheading }),
  ));

  // state
  const filters = {
    destination: null, duration: null, ship: null, departurePort: null, departureDate: null, deals: null, sort: 'recommended',
  };
  let allCruises = [];
  let visible = PAGE_SIZE;

  // headline
  const headline = el('h1', { class: 'find-a-cruise-headline', 'aria-live': 'polite' });

  // filter bar
  const controls = el('div', { class: 'find-a-cruise-controls', role: 'group', 'aria-label': 'Filter options' });
  const destSel = buildSelect('filter-destination', 'Filter by destination', 'Destinations', DESTINATIONS, filters.destination);
  const durSel = buildSelect('filter-duration', 'Filter by duration', 'Duration', DURATIONS, filters.duration);
  const portSel = buildSelect('filter-depart-from', 'Filter by departure port', 'Depart From', PORTS, filters.departurePort);
  const shipSel = buildSelect('filter-ship', 'Filter by ship', 'Ships', SHIPS, filters.ship);
  const dealsSel = buildSelect('filter-deals', 'Filter by deals', 'Deals', [['has_deals', 'Cruises with Deals']], filters.deals);
  controls.append(destSel, durSel, portSel, shipSel, dealsSel);

  const sortSel = buildSelect('filter-sort', 'Sort cruise results', 'Recommended', SORTS.slice(1), filters.sort);
  const sortRow = el(
    'div',
    { class: 'find-a-cruise-sort' },
    el('label', { for: 'filter-sort', class: 'find-a-cruise-sort-label', text: 'Sort by' }),
    sortSel,
  );

  const filterBar = el(
    'section',
    { class: 'find-a-cruise-filters', 'aria-label': 'Cruise search filters', 'data-testid': 'filter-bar' },
    headline,
    controls,
    sortRow,
  );

  const results = el('section', { class: 'find-a-cruise-results', 'aria-label': 'Cruise search results', 'data-testid': 'cruise-results-grid' });
  const loadMoreWrap = el('div', { class: 'find-a-cruise-loadmore' });

  block.append(el('div', { class: 'find-a-cruise-main' }, filterBar, results, loadMoreWrap));

  function render() {
    const filtered = applySort(applyFilters(allCruises, filters), filters.sort);
    const total = filtered.length;
    headline.textContent = total === 1 ? 'Explore 1 Cruise' : `Explore ${total} Cruises`;

    results.textContent = '';
    loadMoreWrap.textContent = '';

    if (total === 0) {
      results.append(el('div', {
        class: 'find-a-cruise-empty', role: 'alert', 'aria-live': 'polite', 'data-testid': 'no-results-message',
      }, el('p', { text: "Didn't find anything matching your search? Try adjusting your filters." })));
      return;
    }

    filtered.slice(0, visible).forEach((c) => results.append(renderCard(c)));

    if (visible < total) {
      const btn = el('button', {
        type: 'button',
        class: 'find-a-cruise-loadmore-btn button',
        text: `Show More (${Math.min(visible, total)} of ${total})`,
        'data-testid': 'load-more-button',
        'aria-label': `Load more cruises. Showing ${Math.min(visible, total)} of ${total}`,
      });
      btn.addEventListener('click', () => { visible += PAGE_SIZE; render(); });
      loadMoreWrap.append(btn);
    }
  }

  function onFilterChange() {
    visible = PAGE_SIZE;
    [destSel, durSel, portSel, shipSel, dealsSel].forEach((sel) => {
      sel.classList.toggle('find-a-cruise-pill-active', !!sel.value);
    });
    render();
  }

  destSel.addEventListener('change', (e) => { filters.destination = e.target.value || null; onFilterChange(); });
  durSel.addEventListener('change', (e) => { filters.duration = e.target.value || null; onFilterChange(); });
  portSel.addEventListener('change', (e) => { filters.departurePort = e.target.value || null; onFilterChange(); });
  shipSel.addEventListener('change', (e) => { filters.ship = e.target.value || null; onFilterChange(); });
  dealsSel.addEventListener('change', (e) => { filters.deals = e.target.value || null; onFilterChange(); });
  sortSel.addEventListener('change', (e) => { filters.sort = e.target.value; render(); });

  // fetch data (configurable endpoint; defaults to bundled sample of the Fusion response)
  const DATA_ENDPOINT = `${window.hlx.codeBasePath}/blocks/find-a-cruise/sample-cruises.json`;
  headline.textContent = 'Searching...';
  try {
    const res = await fetch(DATA_ENDPOINT);
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    const data = await res.json();
    allCruises = (data.response?.docs ?? []).map(normalizeCruise);
  } catch (error) {
    allCruises = [];
  }
  render();
}
