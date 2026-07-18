// KYC image fields sometimes come back as full URLs and sometimes as raw
// base64 (no "data:" prefix) depending on the provider — this normalizes
// either into something an <img src> can actually render.

const SIGNATURES = [
  { prefix: '/9j/', mime: 'image/jpeg' },
  { prefix: 'iVBORw0KGgo', mime: 'image/png' },
  { prefix: 'R0lGOD', mime: 'image/gif' },
  { prefix: 'UklGR', mime: 'image/webp' },
];

export const toImageSrc = (value) => {
  if (!value || typeof value !== 'string') return null;

  if (/^https?:\/\//i.test(value) || value.startsWith('data:')) {
    return value; // already a URL or a proper data URI
  }

  // Raw base64 — sniff the magic-byte signature to pick the right mime
  // type rather than assuming one, so PNGs don't get mislabeled as JPEGs.
  const match = SIGNATURES.find((s) => value.startsWith(s.prefix));
  const mime = match ? match.mime : 'image/jpeg';
  return `data:${mime};base64,${value}`;
};
