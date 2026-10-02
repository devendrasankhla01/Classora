import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';


/**
 * jsdom has no ResizeObserver, which Recharts' ResponsiveContainer needs.
 * A minimal, quiet implementation is enough for smoke tests.
 */
if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub;
}

if (typeof globalThis.matchMedia === 'undefined') {
  (globalThis as unknown as { matchMedia: unknown }).matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

// Guarded: the server test project also runs this setup under Node, where
// there is no DOM at all.
if (typeof Element !== 'undefined' && typeof Element.prototype.scrollIntoView === 'undefined') {
  Element.prototype.scrollIntoView = () => {};
}
