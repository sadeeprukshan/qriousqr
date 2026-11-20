// Finds the order number in receipt text. JavaScript port of the Counter app's
// order_number_extractor.dart (text path), used by the Dashboard receipt tester.
// Keep both in sync.

export const DEFAULT_LABELS = [
  'order number', 'order no.', 'order no', 'order #', 'order#', 'order:', 'order',
  'ticket no', 'ticket #', 'ticket', 'check #', 'check no', 'receipt no', 'receipt #',
  'queue no', 'token no', 'token',
  'رقم الطلب', 'طلب رقم', 'الطلب', 'رقم التذكرة',
];

const NUMBER_AFTER = /^[#:\-\s]*([A-Za-z]{0,3}-?\d{1,8})(?!\d)/;
const STANDALONE = /^\s*#?\s*([A-Za-z]{0,3}-?\d{1,6})\s*$/;
const HASH_NUMBER = /(?:^|\s)#\s?(\d{1,6})(?=\s|$)/;
const ARABIC = /[؀-ۿ]/;

export function normalizeDigits(s) {
  return String(s || '')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06F0));
}

/** Returns { number, label } or { number: null } */
export function findOrderNumber(rawText, customLabel) {
  const text = normalizeDigits(rawText);
  const lines = text.split('\n');
  const labels = [...(customLabel && customLabel.trim() ? [customLabel.trim()] : []), ...DEFAULT_LABELS];

  for (const label of labels) {
    const l = label.toLowerCase();
    for (let li = 0; li < lines.length; li++) {
      const line = lines[li];
      const idx = line.toLowerCase().indexOf(l);
      if (idx < 0) continue;
      const after = line.slice(idx + label.length);
      const m = after.match(NUMBER_AFTER);
      if (m) return { number: m[1].toUpperCase(), label };
      const before = line.slice(0, idx).trimEnd();
      const mb = before.match(/([A-Za-z]{0,3}-?\d{1,8})\s*[#:]?\s*$/);
      if (mb && ARABIC.test(label)) return { number: mb[1].toUpperCase(), label };
      for (let nj = li + 1; nj < lines.length && nj <= li + 2; nj++) {
        if (!lines[nj].trim()) continue;
        const mn = lines[nj].match(STANDALONE);
        if (mn) return { number: mn[1].toUpperCase(), label };
        break;
      }
    }
  }
  const h = text.match(HASH_NUMBER);
  return h ? { number: h[1], label: '#' } : { number: null };
}
