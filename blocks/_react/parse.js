// Convert an authored key/value block table into a props object.
// Supports dotted paths and [index] array paths, e.g. fareCards[0].title,
// and coerces the strings "true"/"false" to booleans.

function coerce(v) {
  if (v === 'true') return true;
  if (v === 'false') return false;
  return v;
}

function setPath(obj, path, value) {
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
  let cur = obj;
  for (let i = 0; i < parts.length; i += 1) {
    const p = parts[i];
    if (i === parts.length - 1) {
      cur[p] = coerce(value);
      return;
    }
    const nextIsIndex = /^\d+$/.test(parts[i + 1]);
    if (cur[p] == null) cur[p] = nextIsIndex ? [] : {};
    cur = cur[p];
  }
}

export function parseBlock(block) {
  const props = {};
  [...block.children].forEach((row) => {
    if (row.hasAttribute('data-island-root')) return; // skip the render target
    const cells = row.children;
    if (cells.length >= 2) {
      setPath(props, cells[0].textContent.trim(), cells[1].textContent.trim());
    }
  });
  return props;
}
