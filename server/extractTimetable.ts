/**
 * Server-side timetable extraction.
 *
 * Portable across runtimes (Vercel Edge, Netlify, Supabase Edge Functions,
 * plain Node 20) because it only uses the Web `Request`/`Response` API and
 * global `fetch`. The browser never sees an AI key.
 *
 * Response contract:
 *   200 { provider, model, timetable, validation, storagePath }
 *   400 { error, code }        — bad upload (never retried client-side)
 *   422 { error, code, raw? }  — model output unusable
 *   503 { error, code: 'not-configured' } — no AI key; the client shows the
 *        explicitly labelled demo fixture instead of pretending otherwise
 */
import { createProvider, ProviderError, type ExtractionProvider, type ProviderEnv } from './ai/provider';
import { REPAIR_NOTE, SYSTEM_PROMPT, userPrompt } from './ai/prompt';
import { parseExtractedTimetable, validateExtraction } from '../src/services/timetable-ai/parse';
import { MAX_UPLOAD_BYTES } from '../src/services/timetable-ai/validation';

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/heic',
  'image/heif',
]);

export interface ExtractHandlerOptions {
  env?: ProviderEnv & { SUPABASE_URL?: string; SUPABASE_SERVICE_ROLE_KEY?: string };
  /** Injectable for tests. */
  provider?: ExtractionProvider | null;
  /** Storage uploader; injected so tests never touch the network. */
  uploadFile?: (input: {
    base64: string;
    mimeType: string;
    userId: string;
    extension: string;
  }) => Promise<string | null>;
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

function extensionFor(mimeType: string): string {
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/heic' || mimeType === 'image/heif') return 'heic';
  return 'jpg';
}

/** Extract the base64 payload from a data URL or a raw base64 string. */
function toBase64(value: string): string {
  const comma = value.indexOf(',');
  return value.startsWith('data:') && comma >= 0 ? value.slice(comma + 1) : value;
}

export function createExtractHandler(options: ExtractHandlerOptions = {}) {
  return async function handleExtract(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed', code: 'method-not-allowed' }, 405);
    }

    const env = options.env ?? (process.env as ExtractHandlerOptions['env']) ?? {};
    const provider = options.provider === undefined ? createProvider(env) : options.provider;

    if (!provider) {
      // Honest failure: the app will use its labelled demo fixture instead.
      return json(
        {
          error:
            'AI extraction is not configured on the server. Classora will use the labelled demo fixture instead.',
          code: 'not-configured',
        },
        503,
      );
    }

    /* -------------------------------------------------------------- *
     * 1. Read and validate the upload                                 *
     * -------------------------------------------------------------- */
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return json({ error: 'Expected multipart form data.', code: 'bad-request' }, 400);
    }

    const file = form.get('file');
    if (!(file instanceof File)) {
      return json({ error: 'No file was uploaded.', code: 'file-missing' }, 400);
    }
    if (file.size === 0) {
      return json({ error: 'That file is empty.', code: 'empty-file' }, 400);
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return json(
        { error: `Files must be under ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`, code: 'file-too-large' },
        400,
      );
    }
    const mimeType = (file.type || 'application/octet-stream').toLowerCase();
    if (!ALLOWED_MIME.has(mimeType)) {
      return json(
        { error: 'Unsupported file type. Upload a PDF, PNG, JPG or a screenshot.', code: 'unsupported-type' },
        400,
      );
    }

    const base64 = toBase64(Buffer.from(await file.arrayBuffer()).toString('base64'));

    /* -------------------------------------------------------------- *
     * 2. Ask the model, retrying once on unusable output              *
     * -------------------------------------------------------------- */
    const prompt = userPrompt({
      fileName: file.name || 'timetable',
      mimeType,
      startDate: (form.get('startDate') as string) || undefined,
      endDate: (form.get('endDate') as string) || undefined,
    });

    let raw: string;
    try {
      const first = await provider.complete({
        file: { base64, mimeType, fileName: file.name },
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: prompt,
      });
      raw = first.text;
    } catch (error) {
      if (error instanceof ProviderError) {
        return json({ error: error.message, code: 'provider-error' }, 502);
      }
      return json({ error: 'The extraction provider could not be reached.', code: 'provider-error' }, 502);
    }

    let timetable;
    try {
      timetable = parseExtractedTimetable(extractJson(raw));
    } catch {
      // One repair attempt: models occasionally emit prose or markdown fences.
      try {
        const retry = await provider.complete({
          file: { base64, mimeType, fileName: file.name },
          systemPrompt: SYSTEM_PROMPT,
          userPrompt: prompt,
          repairNote: REPAIR_NOTE,
        });
        timetable = parseExtractedTimetable(extractJson(retry.text));
      } catch (error) {
        return json(
          {
            error:
              error instanceof Error
                ? error.message
                : 'The timetable could not be read from that file.',
            code: 'invalid-response',
          },
          422,
        );
      }
    }

    const validation = validateExtraction(timetable);
    if (!validation.ok) {
      return json(
        { error: validation.errors[0] ?? 'The extraction was incomplete.', code: 'invalid-response' },
        422,
      );
    }

    /* -------------------------------------------------------------- *
     * 3. Optionally retain the original in private storage            *
     * -------------------------------------------------------------- */
    let storagePath: string | null = null;
    if (options.uploadFile) {
      const userId = request.headers.get('x-user-id') ?? 'anonymous';
      try {
        storagePath = await options.uploadFile({
          base64,
          mimeType,
          userId,
          extension: extensionFor(mimeType),
        });
      } catch {
        // Retention is a convenience, never a reason to fail an extraction.
        storagePath = null;
      }
    }

    return json(
      {
        provider: provider.name,
        model: provider.model,
        timetable,
        validation,
        storagePath,
      },
      200,
    );
  };
}

/** Tolerate markdown fences and leading prose around the JSON object. */
export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  try {
    return JSON.parse(withoutFence);
  } catch {
    const start = withoutFence.indexOf('{');
    const end = withoutFence.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(withoutFence.slice(start, end + 1));
    }
    throw new Error('No JSON object found in the model response.');
  }
}

/** Default export: the Vercel/Netlify function entry point. */
export default createExtractHandler();
