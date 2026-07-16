import { createOptimizedPicture, decorateIcons } from '../../scripts/aem.js';

function decorateSlider(block, ul) {
  const nav = document.createElement('div');
  nav.className = 'cards-nav';
  nav.innerHTML = `
    <button type="button" class="cards-nav-button cards-nav-prev" aria-label="Previous">
      <span class="icon icon-chevron-left"></span>
    </button>
    <button type="button" class="cards-nav-button cards-nav-next" aria-label="Next">
      <span class="icon icon-chevron-right"></span>
    </button>
  `;
  const prev = nav.querySelector('.cards-nav-prev');
  const next = nav.querySelector('.cards-nav-next');

  const updateNav = () => {
    const max = ul.scrollWidth - ul.clientWidth;
    prev.disabled = ul.scrollLeft <= 1;
    next.disabled = ul.scrollLeft >= max - 1;
  };

  const scrollByCard = (direction) => {
    const card = ul.querySelector('li');
    const gap = parseFloat(getComputedStyle(ul).columnGap) || 0;
    const amount = card ? card.getBoundingClientRect().width + gap : ul.clientWidth * 0.8;
    ul.scrollBy({ left: direction * amount, behavior: 'smooth' });
  };

  prev.addEventListener('click', () => scrollByCard(-1));
  next.addEventListener('click', () => scrollByCard(1));
  ul.addEventListener('scroll', updateNav, { passive: true });
  new ResizeObserver(updateNav).observe(ul);

  block.append(nav);
  decorateIcons(nav);
}

export default function decorate(block) {
  const isSliding = block.classList.contains('sliding');
  const isItinerary = block.classList.contains('itinerary');
  /* change to ul, li */
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-card-image';
      else div.className = 'cards-card-body';
    });
    const cta = li.querySelector('.cards-card-body a[href]');
    if (cta) {
      cta.classList.add('button');
      cta.closest('p').classList.add('button-wrapper');
    }
    if (isItinerary) {
      const meta = [...li.querySelectorAll('.cards-card-body p')]
        .find((p) => !p.classList.contains('button-wrapper') && p.textContent.includes(':'));
      if (meta) {
        const [label, value] = meta.textContent.split(':').map((s) => s.trim());
        const labelSpan = document.createElement('span');
        labelSpan.className = 'cards-meta-label';
        labelSpan.textContent = `${label}: `;
        const strong = document.createElement('strong');
        strong.textContent = value;
        meta.replaceChildren(labelSpan, strong);
      }
    }
    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }])));
  block.replaceChildren(ul);
  if (isSliding) decorateSlider(block, ul);
}
