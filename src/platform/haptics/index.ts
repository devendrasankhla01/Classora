/** Haptics platform adapter. Vibration API on web, Taptic on native. */
type Pattern = 'light' | 'medium' | 'success' | 'warning';

const PATTERNS: Record<Pattern, number | number[]> = {
  light: 8,
  medium: 18,
  success: [12, 40, 12],
  warning: [24, 60, 24],
};

export const haptics = {
  isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'vibrate' in navigator;
  },

  async impact(pattern: Pattern = 'light'): Promise<void> {
    if (!this.isSupported()) return;
    try {
      navigator.vibrate(PATTERNS[pattern]);
    } catch {
      /* Ignore — haptics are decorative. */
    }
  },
};
