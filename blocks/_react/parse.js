/*
 * parse.js — turns the author's content into settings ("props") for the component.
 *
 * An author fills in a small table:
 *
 *     children | Book your cruise
 *     variant  | primary
 *
 * and this returns { children: "Book your cruise", variant: "primary" }.
 *
 * Finding each field's NAME is the tricky part, because it depends on where we run:
 *   1. Universal Editor — the value cell is tagged with data-aue-prop (the name); trust it.
 *   2. Published / normal page — no data-aue-prop, AND the editor has WIPED the name
 *      cell in the saved source. So we fall back to POSITION: the caller passes the
 *      field names in order (e.g. ['children','variant']) → row 0 = children, row 1 = variant.
 *   3. Legacy (hand-authored, name cell intact, no field list) — read the name cell.
 *
 * The value is always the row's last cell (or the data-aue-prop cell in the editor).
 * Extras: names like "fareCards[0].title" build nested objects/arrays, and the words
 * "true"/"false" become real booleans.
 */

// "true"/"false" text becomes a real boolean; anything else stays as text.
function coerce(v) {
  if (v === 'true') return true;
  if (v === 'false') return false;
  return v;
}

// Store `value` inside `obj` at a dotted/indexed path, e.g. "fareCards[0].title".
function setPath(obj, path, value) {
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
  if (!parts.length) return; // a blank name sets nothing (guards against wiped cells)
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

// `fields` (optional) is the ordered list of field names for this block, used when
// the name cell is gone (published pages after a UE edit).
export function parseBlock(block, fields) {
  const props = {};
  let i = -1; // position among the author's rows (skips our render box)
  [...block.children].forEach((row) => {
    if (row.hasAttribute('data-island-root')) return; // skip the box we draw into
    i += 1;
    const cells = row.children;
    const aue = row.querySelector('[data-aue-prop]');
    const valueEl = aue || cells[cells.length - 1];
    const value = valueEl ? valueEl.textContent.trim() : '';
    let name;
    if (aue) name = aue.getAttribute('data-aue-prop'); // 1. editor tag
    else if (fields && fields[i] != null) name = fields[i]; // 2. by position
    else if (cells.length >= 2) name = cells[0].textContent.trim(); // 3. legacy name cell
    if (name) setPath(props, name, value);
  });
  return props;
}
