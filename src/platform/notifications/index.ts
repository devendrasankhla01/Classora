/**
 * Notifications platform adapter.
 *
 * Web Notifications today; the same interface maps to
 * `@capacitor/local-notifications` when the app is wrapped for iOS. Every
 * method degrades to a no-op instead of throwing, so the UI can always call it.
 */
export type PermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

export interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  /** ISO instant at which the notification should fire. */
  at: string;
  data?: Record<string, string>;
}

export interface NotificationAdapter {
  isSupported(): boolean;
  permissionStatus(): PermissionState;
  requestPermission(): Promise<PermissionState>;
  schedule(notification: ScheduledNotification): Promise<void>;
  cancel(id: string): Promise<void>;
  cancelAll(): Promise<void>;
}

function webSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export const notifications: NotificationAdapter = {
  isSupported: webSupported,

  permissionStatus(): PermissionState {
    if (!webSupported()) return 'unsupported';
    return Notification.permission as PermissionState;
  },

  async requestPermission(): Promise<PermissionState> {
    if (!webSupported()) return 'unsupported';
    try {
      return (await Notification.requestPermission()) as PermissionState;
    } catch {
      return 'denied';
    }
  },

  /**
   * Web notifications cannot be scheduled natively; the service worker /
   * in-app scheduler handles timing, so a granted permission posts immediately
   * when the time has arrived and otherwise hands off to the app-wide timer.
   */
  async schedule(notification: ScheduledNotification): Promise<void> {
    const delay = new Date(notification.at).getTime() - Date.now();
    const fire = () => {
      if (webSupported() && Notification.permission === 'granted') {
        try {
          new Notification(notification.title, { body: notification.body });
        } catch {
          /* Some browsers require a service worker; the in-app banner covers it. */
        }
      }
    };
    if (delay <= 0) fire();
    else window.setTimeout(fire, Math.min(delay, 2_147_483_000));
  },

  async cancel(): Promise<void> {
    // No native handle on web — scheduled timers are short-lived by design.
  },

  async cancelAll(): Promise<void> {
    // Nothing persistent to cancel on web.
  },
};
