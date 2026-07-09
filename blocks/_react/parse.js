// Generic authored-table → props parser (plain JS, loaded by each block).
// Supports dotted + [index] paths and boolean coercion, so ANY shared-ui
// component can be configured from a key/value table:
//   children              -> "Book now"
//   pageSavingsBadge.text  -> nested object
//   fareCards[0].title     -> array of objects
//   card1.isBestValue=true -> boolean
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
    const cells = row.children;
    if (cells.length >= 2) {
      setPath(props, cells[0].textContent.trim(), cells[1].textContent.trim());
    }
  });
  return props;
}
