/**
 * Install prompt.
 *
 * Browsers only fire `beforeinstallprompt` once, and iOS Safari never fires it
 * at all — so the hook exposes what each platform actually supports instead of
 * pretending there is one code path:
 *
 *   - `canPrompt`      → the native install dialog can be opened right now
 *   - `needsManualSteps` → iOS/iPadOS: show "Share → Add to Home Screen"
 *   - `isInstalled`    → already running from the home screen
 */
import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'classora.install.dismissed';

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    window.matchMedia?.('(display-mode: fullscreen)').matches === true ||
    navigatorWithStandalone.standalone === true
  );
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ reports itself as macOS, but exposes touch points.
  const iPadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return iOSDevice || iPadOs;
}

export interface InstallState {
  isInstalled: boolean;
  canPrompt: boolean;
  needsManualSteps: boolean;
  /** True once the user has dismissed the invite (persisted on the device). */
  dismissed: boolean;
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
  dismiss: () => void;
}

export function useInstallPrompt(): InstallState {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(() => isStandalone());
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISSED_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    // Catch installs that happened while the app was open in another tab.
    const media = window.matchMedia?.('(display-mode: standalone)');
    const onChange = () => setIsInstalled(isStandalone());
    media?.addEventListener?.('change', onChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      media?.removeEventListener?.('change', onChange);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return 'unavailable' as const;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === 'dismissed') {
      try {
        localStorage.setItem(DISMISSED_KEY, '1');
      } catch {
        /* private browsing — nothing to persist */
      }
      setDismissed(true);
    }
    return outcome;
  }, [deferred]);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }, []);

  const iosManual = isIos() && !isInstalled;

  return {
    isInstalled,
    canPrompt: deferred !== null,
    needsManualSteps: iosManual,
    dismissed,
    promptInstall,
    dismiss,
  };
}
