/**
 * Hero Block — supports both image and video backgrounds (full width).
 *
 * Authoring structure:
 * Row 1: image OR video (as link, plain URL text, or <video> element)
 * Row 2+: heading, subtext, CTA
 *
 * Supported video formats:
 * - A link to .mp4 file: <a href="video.mp4">...</a>
 * - Plain text URL ending in .mp4
 * - A link with youtube.com or vimeo.com
 * - An already-rendered <video> element
 *
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const rows = [...block.children];
  if (rows.length === 0) return;

  const firstRow = rows[0];
  let mediaEl;
  // original node that becomes the media, so we can exclude it from the text content
  let mediaSource;

  // Detect video/image source anywhere in the block (media may share a row with text)
  const videoEl = block.querySelector('video');
  const videoLink = block.querySelector('a[href$=".mp4"], a[href$=".webm"], a[href*="youtube"], a[href*="youtu.be"], a[href*="vimeo"]');
  const picture = block.querySelector('picture');

  // Check for plain text URL (no <a> tag, just pasted URL text)
  let plainVideoUrl = null;
  if (!videoEl && !videoLink && !picture) {
    const text = firstRow.textContent.trim();
    if (text.match(/https?:\/\/.*\.(mp4|webm)/i)) {
      plainVideoUrl = text;
    } else if (text.match(/https?:\/\/.*(youtube|youtu\.be|vimeo)/i)) {
      plainVideoUrl = text;
    }
  }

  if (videoEl) {
    // Already a <video> element — use it directly
    mediaSource = videoEl;
    mediaEl = videoEl.cloneNode(true);
    mediaEl.setAttribute('autoplay', '');
    mediaEl.setAttribute('muted', '');
    mediaEl.setAttribute('loop', '');
    mediaEl.setAttribute('playsinline', '');
    mediaEl.className = 'hero-media hero-video';
  } else if (videoLink || plainVideoUrl) {
    mediaSource = videoLink || firstRow;
    const videoUrl = videoLink ? videoLink.href : plainVideoUrl;

    if (videoUrl.match(/\.(mp4|webm)(\?|$)/i)) {
      // Direct video file
      const ext = videoUrl.match(/\.(mp4|webm)/i)[1];
      mediaEl = document.createElement('video');
      mediaEl.setAttribute('autoplay', '');
      mediaEl.setAttribute('muted', '');
      mediaEl.setAttribute('loop', '');
      mediaEl.setAttribute('playsinline', '');
      mediaEl.innerHTML = `<source src="${videoUrl}" type="video/${ext}">`;
      mediaEl.className = 'hero-media hero-video';
    } else if (videoUrl.match(/youtube|youtu\.be/i)) {
      // YouTube embed
      let embedUrl = videoUrl;
      const ytMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
      if (ytMatch) {
        embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&loop=1&controls=0&showinfo=0&playlist=${ytMatch[1]}`;
      }
      mediaEl = document.createElement('div');
      mediaEl.className = 'hero-media hero-video hero-video-embed';
      mediaEl.innerHTML = `<iframe src="${embedUrl}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen loading="lazy"></iframe>`;
    } else if (videoUrl.match(/vimeo/i)) {
      // Vimeo embed
      const vimeoMatch = videoUrl.match(/vimeo\.com\/(\d+)/);
      const vimeoId = vimeoMatch ? vimeoMatch[1] : '';
      mediaEl = document.createElement('div');
      mediaEl.className = 'hero-media hero-video hero-video-embed';
      mediaEl.innerHTML = `<iframe src="https://player.vimeo.com/video/${vimeoId}?autoplay=1&muted=1&loop=1&background=1" frameborder="0" allow="autoplay" loading="lazy"></iframe>`;
    }
  } else if (picture) {
    // Image fallback
    mediaSource = picture;
    mediaEl = picture.cloneNode(true);
    mediaEl.className = 'hero-media';
  }

  // Extract text content from all rows, excluding whatever became the media.
  // Supports media in its own row (multi-row authoring) or sharing a row with
  // the heading/text/CTA (single-row authoring).
  const contentEl = document.createElement('div');
  contentEl.className = 'hero-content';

  rows.forEach((row) => {
    const inner = row.querySelector(':scope > div') || row;
    [...inner.children].forEach((child) => {
      if (mediaSource && (child === mediaSource || child.contains(mediaSource))) return;
      contentEl.append(child.cloneNode(true));
    });
  });

  // Rebuild block
  block.textContent = '';
  if (mediaEl) block.append(mediaEl);
  block.append(contentEl);
}
