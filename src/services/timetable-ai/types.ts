import type { ExtractedTimetable } from '@/types/domain';

export interface ExtractionRequest {
  file: File;
  /** Optional hint from the wizard. */
  semesterHint?: { startDate?: string; endDate?: string };
}

export interface ExtractionResult {
  /** Where the data came from — surfaced honestly in the UI. */
  source: 'ai' | 'demo-fixture';
  provider: string;
  timetable: ExtractedTimetable;
  /** Randomised storage key if the upload was retained. */
  storagePath: string | null;
}

export interface TimetableExtractionProvider {
  readonly name: string;
  isConfigured(): boolean;
  extract(request: ExtractionRequest): Promise<ExtractionResult>;
}

export class ExtractionError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'unsupported-type'
      | 'file-too-large'
      | 'empty-file'
      | 'not-configured'
      | 'provider-error'
      | 'invalid-response',
  ) {
    super(message);
    this.name = 'ExtractionError';
  }
}
