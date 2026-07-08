/*
 * Hero Search block
 * Home hero with a presentational cruise-search widget (matching the Sanity /
 * Storyblok POCs). The selects are presentational; the Search button routes to
 * the find-a-cruise page.
 *
 * Authoring contract (rows top-to-bottom):
 *   Row 1: background image (picture)          — optional
 *   Row 2: heading + subheading (text content) — heading becomes <h1>
 */

const DESTINATIONS = [
  ['', 'Any Destination'],
  ['caribbean', 'Caribbean'],
  ['alaska', 'Alaska'],
  ['mediterranean', 'Mediterranean'],
  ['northern-europe', 'Northern Europe'],
  ['asia', 'Asia'],
];

const DATES = [
  ['', 'Any Date'],
  ['2026-07', 'July 2026'],
  ['2026-08', 'August 2026'],
  ['2026-09', 'September 2026'],
  ['2026-10', 'October 2026'],
  ['2026-11', 'November 2026'],
  ['2026-12', 'December 2026'],
];

const DURATIONS = [
  ['', 'Any Duration'],
  ['1-5', '1-5 Days'],
  ['6-9', '6-9 Days'],
  ['10-14', '10-14 Days'],
  ['15+', '15+ Days'],
];

/**
 * Builds a labelled select field.
 * @param {string} id Field id
 * @param {string} label Visible label
 * @param {Array<[string,string]>} options [value, text] pairs
 * @returns {HTMLElement} field wrapper
 */
function buildField(id, label, options) {
  const field = document.createElement('div');
  field.className = 'hero-search-field';

  const labelEl = document.createElement('label');
  labelEl.setAttribute('for', id);
  labelEl.textContent = label;

  const select = document.createElement('select');
  select.id = id;
  select.setAttribute('aria-label', label);
  select.dataset.testid = id;
  options.forEach(([value, text]) => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = text;
    select.append(opt);
  });

  field.append(labelEl, select);
  return field;
}

/**
 * loads and decorates the hero-search block
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const rows = [...block.children];

  // Row 1: background image (optional). Ignore an empty placeholder <img src="">.
  const pictureImg = block.querySelector('picture img');
  const picture = pictureImg && pictureImg.getAttribute('src') ? pictureImg.closest('picture') : null;

  // Heading + copy: pull the last row's text content (heading + paragraphs)
  const textRow = rows[rows.length - 1];
  const heading = block.querySelector('h1, h2, h3, h4, h5, h6');
  const paragraphs = textRow ? [...textRow.querySelectorAll('p')].filter((p) => !p.querySelector('picture')) : [];

  // Reset and rebuild
  block.textContent = '';

  if (picture) {
    picture.classList.add('hero-search-bg');
    block.append(picture);
    const overlay = document.createElement('div');
    overlay.className = 'hero-search-overlay';
    block.append(overlay);
  }

  const content = document.createElement('div');
  content.className = 'hero-search-content';

  if (heading) {
    heading.classList.add('hero-search-heading');
    content.append(heading);
  }
  paragraphs.forEach((p) => {
    p.classList.add('hero-search-subheading');
    content.append(p);
  });

  // Search widget
  const widget = document.createElement('div');
  widget.className = 'hero-search-widget';

  const fields = document.createElement('div');
  fields.className = 'hero-search-fields';
  fields.append(
    buildField('search-destination', 'Destination', DESTINATIONS),
    buildField('search-date', 'Departure Date', DATES),
    buildField('search-duration', 'Duration', DURATIONS),
  );

  const cta = document.createElement('a');
  cta.className = 'hero-search-cta button';
  cta.href = '/en/us/find-a-cruise';
  cta.textContent = 'Search';
  cta.setAttribute('aria-label', 'Search for cruises');
  cta.dataset.testid = 'hero-search-cta';

  widget.append(fields, cta);
  content.append(widget);
  block.append(content);
}
