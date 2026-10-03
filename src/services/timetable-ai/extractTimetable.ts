/**
 * Timetable extraction service.
 *
 * The multimodal model is called **server-side only** (`/api/extract-timetable`)
 * so no AI credential can ever reach the browser bundle.
 *
 * When the AI endpoint is not configured (no key, dev server, offline) we
 * extract from the uploaded file **locally in the browser** — we never fabricate
 * fake demo data. Supported local inputs:
 *
 *   - CSV / TSV exports from most college portals / ERPs
 *   - Plain-text schedules pasted or uploaded as .txt
 *   - Images and PDFs are rejected with a prompt to use a CSV export or the
 *     on-screen manual editor (OCR requires the server-side AI provider)
 */
import { parseExtractedTimetable, validateExtraction } from './parse';
import { extractFromText } from './localParse';
import { validateUpload } from './validation';
import { ExtractionError, type ExtractionRequest, type ExtractionResult } from './types';

const ENDPOINT = '/api/extract-timetable';

const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/heic', 'image/heif']);

export function isAiProviderConfigured(): boolean {
  // Only a boolean flag reaches the client; the key itself stays server-side.
  return import.meta.env.VITE_AI_EXTRACTION_ENABLED === 'true';
}

async function readFileAsText(file: File): Promise<string> {
  // Some portals serve CSV with a wrong MIME type and calling `.text()` still
  // works. Callers validate the content and MIME type before trusting it.
  try {
    return await file.text();
  } catch {
    return '';
  }
}

export async function extractTimetable(request: ExtractionRequest): Promise<ExtractionResult> {
  validateUpload(request.file);
  const { file } = request;
  const mime = file.type.toLowerCase();

  // Text exports are always parsed locally, even when the server-side AI is
  // enabled. Only images and PDFs need to leave the browser for OCR/layout work.
  const needsAi = mime.startsWith('application/pdf') || IMAGE_TYPES.has(mime);

  // ---------- Server-side AI path ----------
  if (isAiProviderConfigured() && needsAi) {
    const body = new FormData();
    body.append('file', file);
    if (request.semesterHint?.startDate) body.append('startDate', request.semesterHint.startDate);
    if (request.semesterHint?.endDate) body.append('endDate', request.semesterHint.endDate);

    let response: Response;
    try {
      response = await fetch(ENDPOINT, { method: 'POST', body });
    } catch {
      // Network down — continue to the fallback branch with a clear manual/CSV prompt.
      response = new Response(null, { status: 503 });
    }

    if (response.ok) {
      try {
        const payload = await response.json();
        const timetable = parseExtractedTimetable(payload);
        const report = validateExtraction(timetable);
        if (report.ok) {
          return {
            source: 'ai',
            provider: typeof payload?.provider === 'string' ? payload.provider : 'multimodal-ai',
            timetable,
            storagePath: typeof payload?.storagePath === 'string' ? payload.storagePath : null,
          };
        }
      } catch {
        // A malformed provider response falls through to the clear AI error below.
      }
    }
  }

  // ---------- Client-side local extraction ----------
  if (mime.startsWith('application/pdf') || IMAGE_TYPES.has(mime)) {
    // We cannot OCR an image/PDF without AI. Throw a clear error so the UI
    // offers the manual-entry / CSV-export path.
    throw new ExtractionError(
      isAiProviderConfigured()
        ? 'The AI service could not read that file. For scanned timetables or images, use the manual editor below; for portal exports upload the CSV or text file.'
        : 'Scanned images and PDFs can only be read with AI enabled. Upload a CSV or text export from your college portal, or build your timetable using the manual editor.',
      'unsupported-type',
    );
  }

  const text = await readFileAsText(file);
  if (!text || text.length < 8) {
    throw new ExtractionError(
      'That file appears empty or is in a binary format Classora cannot read. Try exporting your timetable as CSV from your college portal.',
      'invalid-response',
    );
  }

  const timetable = extractFromText(text, file.name);
  const report = validateExtraction(timetable);
  if (!report.ok) {
    throw new ExtractionError(
      `Could not read a timetable from that file (${report.errors[0] ?? 'unrecognised layout'}). Upload a CSV export or enter your schedule manually.`,
      'invalid-response',
    );
  }

  return {
    source: 'local-parse',
    provider: 'client-parser',
    timetable,
    storagePath: null,
  };
}
