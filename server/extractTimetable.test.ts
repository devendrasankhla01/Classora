// @vitest-environment node
/**
 * Server extraction tests.
 *
 * These cover the contract the browser depends on: an honest 503 when no key
 * exists, hard rejection of bad uploads, tolerant parsing of model output, and
 * the single repair attempt. No network is touched — the provider is injected.
 */
import { describe, expect, it, vi } from 'vitest';

import { createExtractHandler, extractJson } from './extractTimetable';
import type { ExtractionProvider, ProviderResponse } from './ai/provider';

/* ------------------------------------------------------------------ *
 * Fixtures                                                            *
 * ------------------------------------------------------------------ */

const VALID_EXTRACTION = {
  semester: { name: 'Semester 5', startDate: '2026-07-01', endDate: '2026-11-30' },
  subjects: [
    {
      name: 'Data Structures & Algorithms',
      shortName: 'DSA',
      subjectCode: 'CS-201',
      faculty: 'Prof. A. Mehta',
      room: 'C-203',
      classType: 'theory',
      attendanceCountMode: 'period',
      confidence: 0.96,
    },
  ],
  schedule: [
    {
      dayOfWeek: 1,
      date: null,
      startTime: '09:00',
      endTime: '10:00',
      subjectName: 'Data Structures & Algorithms',
      subjectCode: 'CS-201',
      faculty: 'Prof. A. Mehta',
      room: 'C-203',
      classType: 'theory',
      periodCount: 1,
      isBreak: false,
      breakLabel: null,
      confidence: 0.96,
    },
  ],
  warnings: [],
};

function provider(response: string | (() => Promise<ProviderResponse>)): ExtractionProvider {
  return {
    name: 'test-provider',
    model: 'test-model',
    isConfigured: () => true,
    complete: vi.fn(async (): Promise<ProviderResponse> => {
      if (typeof response === 'function') return response();
      return { text: response, provider: 'test-provider', model: 'test-model' };
    }),
  };
}

function uploadRequest(
  options: { mimeType?: string; bytes?: number; field?: string; name?: string } = {},
): Request {
  const { mimeType = 'image/png', bytes = 1024, field = 'file', name = 'timetable.png' } = options;
  const form = new FormData();
  form.append(field, new File([new Uint8Array(bytes)], name, { type: mimeType }));
  return new Request('https://classora.test/api/extract-timetable', { method: 'POST', body: form });
}

/* ------------------------------------------------------------------ *
 * Configuration honesty                                               *
 * ------------------------------------------------------------------ */

describe('configuration', () => {
  it('answers 503 with a clear code when no AI key is configured', async () => {
    const handler = createExtractHandler({ env: {}, provider: null });
    const response = await handler(uploadRequest());
    expect(response.status).toBe(503);

    const body = (await response.json()) as { code: string; error: string };
    expect(body.code).toBe('not-configured');
    // The message must tell the truth: the client will show a demo fixture.
    expect(body.error).toMatch(/demo fixture/i);
  });

  it('rejects non-POST methods', async () => {
    const handler = createExtractHandler({ env: {}, provider: provider(JSON.stringify(VALID_EXTRACTION)) });
    const response = await handler(
      new Request('https://classora.test/api/extract-timetable', { method: 'GET' }),
    );
    expect(response.status).toBe(405);
    expect(((await response.json()) as { code: string }).code).toBe('method-not-allowed');
  });
});

/* ------------------------------------------------------------------ *
 * Upload validation                                                   *
 * ------------------------------------------------------------------ */

describe('upload validation', () => {
  const handler = createExtractHandler({ env: {}, provider: provider(JSON.stringify(VALID_EXTRACTION)) });

  it('rejects a request without a file', async () => {
    const form = new FormData();
    const request = new Request('https://classora.test/api/extract-timetable', { method: 'POST', body: form });
    const response = await handler(request);
    expect(response.status).toBe(400);
    expect(((await response.json()) as { code: string }).code).toBe('file-missing');
  });

  it('rejects an empty file', async () => {
    const response = await handler(uploadRequest({ bytes: 0 }));
    expect(response.status).toBe(400);
    expect(((await response.json()) as { code: string }).code).toBe('empty-file');
  });

  it('rejects an unsupported type', async () => {
    const response = await handler(uploadRequest({ mimeType: 'application/zip', name: 'notes.zip' }));
    expect(response.status).toBe(400);
    expect(((await response.json()) as { code: string }).code).toBe('unsupported-type');
  });

  it('rejects an oversized file', async () => {
    const response = await handler(uploadRequest({ bytes: 13 * 1024 * 1024 }));
    expect(response.status).toBe(400);
    expect(((await response.json()) as { code: string }).code).toBe('file-too-large');
  });
});

/* ------------------------------------------------------------------ *
 * Happy path + model tolerance                                        *
 * ------------------------------------------------------------------ */

describe('extraction', () => {
  it('returns a validated timetable for a good model response', async () => {
    const handler = createExtractHandler({ env: {}, provider: provider(JSON.stringify(VALID_EXTRACTION)) });
    const response = await handler(uploadRequest());

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      provider: string;
      model: string;
      timetable: typeof VALID_EXTRACTION;
      validation: { ok: boolean; stats: { slots: number } };
    };

    expect(body.provider).toBe('test-provider');
    expect(body.timetable.schedule).toHaveLength(1);
    expect(body.timetable.subjects[0]!.name).toBe('Data Structures & Algorithms');
    expect(body.validation.ok).toBe(true);
    expect(body.validation.stats.slots).toBe(1);
  });

  it('recovers JSON wrapped in markdown fences', async () => {
    const fenced = '```json\n' + JSON.stringify(VALID_EXTRACTION) + '\n```';
    const handler = createExtractHandler({ env: {}, provider: provider(fenced) });
    const response = await handler(uploadRequest());
    expect(response.status).toBe(200);
  });

  it('recovers JSON surrounded by prose', async () => {
    const chatty = `Sure! Here is the timetable:\n${JSON.stringify(VALID_EXTRACTION)}\nLet me know if you need more.`;
    const handler = createExtractHandler({ env: {}, provider: provider(chatty) });
    const response = await handler(uploadRequest());
    expect(response.status).toBe(200);
  });

  it('retries once, then succeeds after an unusable first response', async () => {
    let call = 0;
    const flaky: ExtractionProvider = {
      name: 'flaky',
      model: 'test-model',
      isConfigured: () => true,
      complete: vi.fn(async () => {
        call += 1;
        return {
          text: call === 1 ? 'I cannot read that image.' : JSON.stringify(VALID_EXTRACTION),
          provider: 'flaky',
          model: 'test-model',
        };
      }),
    };

    const handler = createExtractHandler({ env: {}, provider: flaky });
    const response = await handler(uploadRequest());
    expect(response.status).toBe(200);
    expect(call).toBe(2);
  });

  it('gives up with 422 after two unusable responses', async () => {
    const handler = createExtractHandler({ env: {}, provider: provider('not json at all') });
    const response = await handler(uploadRequest());
    expect(response.status).toBe(422);
    expect(((await response.json()) as { code: string }).code).toBe('invalid-response');
  });

  it('reports a provider outage as 502', async () => {
    const failing: ExtractionProvider = {
      name: 'down',
      model: 'test-model',
      isConfigured: () => true,
      complete: async () => {
        const { ProviderError } = await import('./ai/provider');
        throw new ProviderError('upstream exploded', 500, true);
      },
    };
    const handler = createExtractHandler({ env: {}, provider: failing });
    const response = await handler(uploadRequest());
    expect(response.status).toBe(502);
  });

  it('retains the upload through the injected storage hook', async () => {
    const uploadFile = vi.fn(async () => 'user-1/abc.png');
    const handler = createExtractHandler({
      env: {},
      provider: provider(JSON.stringify(VALID_EXTRACTION)),
      uploadFile,
    });

    // A storage hook is optional, but when present it must be used.
    const response = await handler(uploadRequest());
    expect(response.status).toBe(200);
    expect(uploadFile).toHaveBeenCalledTimes(1);
    expect(((await response.json()) as { storagePath: string }).storagePath).toBe('user-1/abc.png');
  });

  it('uploads never break an otherwise good extraction', async () => {
    const handler = createExtractHandler({
      env: {},
      provider: provider(JSON.stringify(VALID_EXTRACTION)),
      uploadFile: async () => {
        throw new Error('storage is down');
      },
    });
    const response = await handler(uploadRequest());
    expect(response.status).toBe(200);
    expect(((await response.json()) as { storagePath: string | null }).storagePath).toBeNull();
  });

  it('accepts a PDF upload', async () => {
    const handler = createExtractHandler({ env: {}, provider: provider(JSON.stringify(VALID_EXTRACTION)) });
    const response = await handler(uploadRequest({ mimeType: 'application/pdf', name: 'timetable.pdf' }));
    expect(response.status).toBe(200);
  });

  it('never echoes the API key in the response', async () => {
    const handler = createExtractHandler({
      env: { AI_API_KEY: 'sk-secret-value' },
      provider: provider(JSON.stringify(VALID_EXTRACTION)),
    });
    const response = await handler(uploadRequest());
    const text = await response.text();
    expect(text).not.toContain('sk-secret-value');
  });
});

/* ------------------------------------------------------------------ *
 * JSON salvage                                                        *
 * ------------------------------------------------------------------ */

describe('extractJson', () => {
  it('parses plain JSON', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });

  it('strips fences and keeps the object', () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it('finds the object inside surrounding prose', () => {
    expect(extractJson('Here you go: {"a":1} — enjoy')).toEqual({ a: 1 });
  });

  it('throws when there is no object at all', () => {
    expect(() => extractJson('no json here')).toThrow();
  });
});
