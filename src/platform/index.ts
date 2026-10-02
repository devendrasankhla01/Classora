/**
 * Platform service adapters.
 *
 * Screens import from here, never from a browser API directly. When Classora is
 * wrapped with Capacitor/Xcode, only these modules change — the UI does not.
 */
export { notifications, type PermissionState, type ScheduledNotification } from './notifications';
export { storage, type StorageEstimate } from './storage';
export { files, type SaveFileInput } from './files';
export { share } from './share';
export { haptics } from './haptics';
