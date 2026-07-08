/**
 * Hero Block
 *
 * Default: a full-width background image with overlaid heading, subtext and CTA.
 *
 * `video` variant (authored as "Hero (video)"): the authored image becomes the
 * LCP poster and an authored video URL (.mp4/.webm) is layered on top as a
 * muted, looping, autoplay backdrop. To protect LCP the video is only loaded
 * after the page has finished loading, and it is skipped entirely when the user
 * prefers reduced motion or autoplay is blocked — the poster image remains.
 *
 * Authoring (video variant), a single cell:
 *   image (poster)
 *   video URL (.mp4 or .webm, as a link or plain text)
 *   heading / subtext / CTA
 */

const VIDEO_URL_RE = /^https?:\/\/\S+\.(mp4|webm)(\?\S*)?$/i;

/**
 * Layers a muted, looping, autoplay video over the poster image. The video is
 * only revealed once it is actually playing, and removed if autoplay is blocked
 * so the poster image stays visible.
 * @param {Element} block The hero block
 * @param {string} url The video source URL
 */
function loadHeroVideo(block, url) {
  const [, ext] = url.match(/\.(mp4|webm)/i);
  const video = document.createElement('video');
  video.className = 'hero-media hero-video';
  video.muted = true;
  video.loop = true;
  video.autoplay = true;
  video.playsInline = true;
  video.setAttribute('muted', '');
  video.setAttribute('loop', '');
  video.setAttribute('autoplay', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('preload', 'auto');
  video.setAttribute('aria-hidden', 'true');
  video.tabIndex = -1;

  const source = document.createElement('source');
  source.src = url;
  source.type = `video/${ext.toLowerCase()}`;
  video.append(source);

  // reveal only once it is genuinely playing, so we never flash a black frame
  video.addEventListener('playing', () => video.classList.add('is-playing'), { once: true });

  // insert above the poster image but below the overlay/content
  block.insertBefore(video, block.querySelector('.hero-content'));

  const playPromise = video.play();
  if (playPromise && typeof playPromise.catch === 'function') {
    // autoplay blocked (e.g. some mobile / data-saver contexts): keep the poster
    playPromise.catch(() => video.remove());
  }
}

/**
 * loads and decorates the hero
 * @param {Element} block The hero block element
 */
export default function decorate(block) {
  const isVideo = block.classList.contains('video');

  // Poster / background image — this is the LCP element.
  const picture = block.querySelector('picture');
  let mediaEl;
  if (picture) {
    mediaEl = picture.cloneNode(true);
    mediaEl.className = 'hero-media';
    const img = mediaEl.querySelector('img');
    if (img) {
      img.setAttribute('loading', 'eager');
      img.setAttribute('fetchpriority', 'high');
    }
  }

  // Video source is honored only in the video variant.
  let videoUrl = null;
  let videoSource = null; // authored node to exclude from the text content
  if (isVideo) {
    const link = block.querySelector('a[href$=".mp4"], a[href$=".webm"]');
    if (link) {
      videoUrl = link.href;
      videoSource = link;
    } else {
      const urlPara = [...block.querySelectorAll('p')]
        .find((p) => VIDEO_URL_RE.test(p.textContent.trim()));
      if (urlPara) {
        videoUrl = urlPara.textContent.trim();
        videoSource = urlPara;
      }
    }
  }

  // Collect the remaining content (heading, subtext, CTA), excluding the media.
  const contentEl = document.createElement('div');
  contentEl.className = 'hero-content';
  [...block.children].forEach((row) => {
    const inner = row.querySelector(':scope > div') || row;
    [...inner.children].forEach((child) => {
      if (picture && (child === picture || child.contains(picture))) return;
      if (videoSource && (child === videoSource || child.contains(videoSource))) return;
      contentEl.append(child.cloneNode(true));
    });
  });

  // Rebuild the block: poster image first, then overlaid content.
  block.textContent = '';
  if (mediaEl) block.append(mediaEl);
  block.append(contentEl);

  // Defer the video until after LCP, and only when motion is allowed.
  if (videoUrl && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const start = () => loadHeroVideo(block, videoUrl);
    if (document.readyState === 'complete') {
      start();
    } else {
      window.addEventListener('load', start, { once: true });
    }
  }
}
