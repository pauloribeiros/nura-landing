/**
 * A random UUID, in every context the app actually runs in.
 *
 * `crypto.randomUUID` is restricted to secure contexts. That covers HTTPS and
 * localhost, so it is fine in production and fine on a developer's machine —
 * and undefined the moment the site is opened over plain HTTP by LAN address,
 * which is exactly how a phone reaches a dev or preview server. Calling it
 * there throws inside the click handler, and the button silently does nothing.
 *
 * `crypto.getRandomValues` carries no such restriction, so the fallback is a
 * real v4 UUID from the same CSPRNG rather than a weaker id.
 */
export function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10xx

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
