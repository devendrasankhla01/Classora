/**
 * Identifier helpers.
 *
 * IDs are generated client-side so that records created offline have a stable,
 * deterministic identity before they ever reach the server. That makes cloud
 * sync idempotent: replaying an upsert with the same id is a no-op.
 */

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

function randomChunk(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const byte of bytes) out += ALPHABET[byte % ALPHABET.length];
  return out;
}

/** Collision-resistant, sortable-ish identifier with a readable prefix. */
export function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${randomChunk(8)}`;
}

/** Randomised, path-safe storage name that never leaks the original filename. */
export function createStorageName(extension: string): string {
  return `${Date.now().toString(36)}-${randomChunk(16)}${extension.startsWith('.') ? extension : `.${extension}`}`;
}
