// Convert an authored key/value block table into a props object.
// Supports dotted paths and [index] array paths, e.g. fareCards[0].title,
// and coerces the strings "true"/"false" to booleans.
//
// Two DOM shapes are handled:
//  - Authored / published: each row is [keyCell, valueCell]; the key names the prop.
//  - Universal Editor: UE instruments the value cell with data-aue-prop (the prop
//    name) and WIPES the human-readable key cell on edit — so when that attribute
//    is present, trust it over the (possibly emptied) key cell.

function coerce(v) {
  if (v === 'true') return true;
  if (v === 'false') return false;
  return v;
}

function setPath(obj, path, value) {
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
  if (!parts.length) return; // guard: empty/blank key sets nothing
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
    // Prefer UE instrumentation: the value cell carries data-aue-prop (the prop
    // name) even after UE has wiped the human-readable key cell on edit.
    const aue = row.querySelector('[data-aue-prop]');
    if (aue) {
      setPath(props, aue.getAttribute('data-aue-prop'), aue.textContent.trim());
      return;
    }
    const cells = row.children;
    if (cells.length >= 2) {
      setPath(props, cells[0].textContent.trim(), cells[1].textContent.trim());
    }
  });
  return props;
}
