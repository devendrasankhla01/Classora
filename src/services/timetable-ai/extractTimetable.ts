/**
 * Timetable extraction service.
 *
 * The multimodal model is called **server-side only** (`/api/extract-timetable`)
 * so no AI credential can ever reach the browser bundle. When the endpoint or
 * its key is missing, the service falls back to an explicitly labelled demo
 * fixture — it never claims a live model produced the data.
 */
import { demoExtraction } from './fixture';
import { parseExtractedTimetable, validateExtraction } from './parse';
import { parseCsvTimetable } from './csvParser';
import { validateUpload } from './validation';
import { ExtractionError, type ExtractionRequest, type ExtractionResult } from './types';

const ENDPOINT = '/api/extract-timetable';

export function isAiProviderConfigured(): boolean {
  // Only a boolean flag reaches the client; the key itself stays server-side.
  return import.meta.env.VITE_AI_EXTRACTION_ENABLED === 'true';
}

export async function extractTimetable(request: ExtractionRequest): Promise<ExtractionResult> {
  validateUpload(request.file);

  const isCsv =
    request.file.name.toLowerCase().endsWith('.csv') ||
    request.file.type.toLowerCase().includes('csv');

  if (isCsv) {
    const text = await request.file.text();
    const timetable = parseCsvTimetable(text);
    return {
      source: 'ai',
      provider: 'CSV File',
      timetable,
      storagePath: null,
    };
  }

  if (!isAiProviderConfigured()) {
    return {
      source: 'demo-fixture',
      provider: 'demo-fixture',
      timetable: demoExtraction(request.file.name),
      storagePath: null,
    };
  }

  const body = new FormData();
  body.append('file', request.file);
  if (request.semesterHint?.startDate) body.append('startDate', request.semesterHint.startDate);
  if (request.semesterHint?.endDate) body.append('endDate', request.semesterHint.endDate);

  const response = await fetch(ENDPOINT, { method: 'POST', body });
  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new ExtractionError(
      message || 'The extraction service could not read that file. Please try a clearer image.',
      'provider-error',
    );
  }

  const payload = await response.json();
  const timetable = parseExtractedTimetable(payload);

  // Belt and braces: the server validates too, but the client re-checks before
  // anything reaches the review screen.
  const report = validateExtraction(timetable);
  if (!report.ok) {
    throw new ExtractionError(report.errors[0] ?? 'The extraction was incomplete.', 'invalid-response');
  }

  return {
    source: 'ai',
    provider: typeof payload?.provider === 'string' ? payload.provider : 'multimodal-ai',
    timetable,
    storagePath: typeof payload?.storagePath === 'string' ? payload.storagePath : null,
  };
}
