/** Tiny shared value helpers (kept separate so they stay tree-shakeable). */

/** Type-safe truthiness filter for `Array.prototype.filter`. */
export function identity<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined && value !== '';
}
