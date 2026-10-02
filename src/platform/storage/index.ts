/** Storage platform adapter: usage estimates and cache housekeeping. */
export interface StorageEstimate {
  usage: number;
  quota: number;
}

export interface StorageAdapter {
  estimate(): Promise<StorageEstimate | null>;
  /** Ask the browser to keep our data; important for an offline-first PWA. */
  requestPersistence(): Promise<boolean>;
  clearCaches(): Promise<boolean>;
}

export const storage: StorageAdapter = {
  async estimate() {
    if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null;
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    return { usage, quota };
  },

  async requestPersistence() {
    if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false;
    return navigator.storage.persist();
  },

  async clearCaches() {
    if (typeof caches === 'undefined') return false;
    const names = await caches.keys();
    await Promise.all(names.map((name) => caches.delete(name)));
    return names.length > 0;
  },
};
