import { ExtractionError } from './types';

/** 12 MB is generous for a timetable photo or PDF and keeps uploads quick. */
export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/heic',
  'image/heif',
]);

/**
 * Validate an upload before it ever leaves the device.
 * Executables and unknown binary types are rejected outright.
 */
export function validateUpload(file: File): void {
  if (file.size === 0) {
    throw new ExtractionError('That file is empty. Please choose another one.', 'empty-file');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ExtractionError(
      `Files must be under ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB. Try compressing the image first.`,
      'file-too-large',
    );
  }
  const mime = file.type.toLowerCase();
  if (!ALLOWED_MIME.has(mime)) {
    throw new ExtractionError(
      'Unsupported file type. Upload a PDF, PNG, JPG or a screenshot of your timetable.',
      'unsupported-type',
    );
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
