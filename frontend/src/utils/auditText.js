// Splits an update description into headline + change list for two-line display.
// Handles the current "Changes made:" sentence format and the legacy
// "— changed:" format still present on older audit rows.
// Returns { head, label, tail } or null when no marker is found.
export const splitUpdateDescription = (desc) => {
  const text = String(desc || '');
  const markers = ['Changes made:', '— changed:'];
  for (const marker of markers) {
    const idx = text.indexOf(marker);
    if (idx !== -1) {
      return {
        head: text.slice(0, idx).trim(),
        label: marker === '— changed:' ? 'Changed:' : 'Changes made:',
        tail: text.slice(idx + marker.length).trim().replace(/\.*$/, ''),
      };
    }
  }
  return null;
};

// Detects sentence-style descriptions ("The …" / "A …"). Used to skip the
// legacy "You …" rewrite, which only reads correctly on the old
// verb-first ("Created …") format.
export const isSentenceDescription = (desc) => /^(The|A)\s/.test(String(desc || '').trim());
