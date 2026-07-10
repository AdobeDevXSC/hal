/*
 * parse.js — turns the author's content into settings ("props") for the component.
 *
 * In the editor an author fills in a small table:
 *
 *     children | Book your cruise
 *     variant  | primary
 *
 * This file reads that table and returns the settings the React component wants:
 *
 *     { children: "Book your cruise", variant: "primary" }
 *
 * It copes with two shapes of that table:
 *   1. Normal page  — first cell is the name, second cell is the value.
 *   2. In Universal Editor — the editor tags the VALUE cell with `data-aue-prop`
 *      (which holds the name) and can BLANK OUT the name cell when the author
 *      edits a field. So when that tag is present we trust it, not the name cell.
 *      (Reading the name from the blanked cell was our "editing goes blank" bug.)
 *
 * Extras: names like "fareCards[0].title" build nested objects/arrays, and the
 * words "true"/"false" become real booleans.
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

export function parseBlock(block) {
  const props = {};
  [...block.children].forEach((row) => {
    if (row.hasAttribute('data-island-root')) return; // skip the box we draw into
    // Prefer the editor's tag: it names the field even after the editor has
    // wiped the human-readable name cell on save.
    const aue = row.querySelector('[data-aue-prop]');
    if (aue) {
      setPath(props, aue.getAttribute('data-aue-prop'), aue.textContent.trim());
      return;
    }
    // Normal page: [ name cell, value cell ].
    const cells = row.children;
    if (cells.length >= 2) {
      setPath(props, cells[0].textContent.trim(), cells[1].textContent.trim());
    }
  });
  return props;
}
