/**
 * Timetable extraction service.
 *
 * The multimodal model is called **server-side only** (`/api/extract-timetable`)
 * so no AI credential can ever reach the browser bundle. When the endpoint or
 * its key is missing, the service falls back to an explicitly labelled demo
 * fixture — it never claims a live model produced the data.
 */
import { demoExtraction } from './fixture';
import { validateUpload } from './validation';
import { ExtractionError, type ExtractionRequest, type ExtractionResult } from './types';
import type { ExtractedTimetable, ExtractedSlot, ExtractedSubject } from '@/types/domain';

const ENDPOINT = '/api/extract-timetable';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Never trust the model's JSON: validate and coerce every field. */
export function parseExtractedTimetable(payload: unknown): ExtractedTimetable {
  if (!isRecord(payload)) {
    throw new ExtractionError('The extraction service returned an unexpected response.', 'invalid-response');
  }

  const scheduleRaw = Array.isArray(payload.schedule) ? payload.schedule : [];
  const subjectsRaw = Array.isArray(payload.subjects) ? payload.subjects : [];

  const schedule: ExtractedSlot[] = scheduleRaw
    .filter(isRecord)
    .map((row): ExtractedSlot => ({
      dayOfWeek: normaliseDay(row.dayOfWeek),
      date: typeof row.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(row.date) ? row.date : null,
      startTime: normaliseTime(row.startTime) ?? '08:00',
      endTime: normaliseTime(row.endTime) ?? '09:00',
      subjectName: typeof row.subjectName === 'string' ? row.subjectName.trim() : 'Unnamed class',
      subjectCode: typeof row.subjectCode === 'string' ? row.subjectCode.trim() : null,
      faculty: typeof row.faculty === 'string' ? row.faculty.trim() : null,
      room: typeof row.room === 'string' ? row.room.trim() : null,
      classType: toClassType(row.classType),
      periodCount: Number.isFinite(Number(row.periodCount)) ? Math.max(1, Math.round(Number(row.periodCount))) : 1,
      isBreak: row.isBreak === true,
      breakLabel: typeof row.breakLabel === 'string' ? row.breakLabel : null,
      confidence: clamp01(row.confidence),
    }))
    .filter((slot) => slot.isBreak || slot.subjectName.length > 0);

  const subjects: ExtractedSubject[] = subjectsRaw
    .filter(isRecord)
    .map((row): ExtractedSubject => ({
      name: typeof row.name === 'string' ? row.name.trim() : 'Unnamed subject',
      shortName: typeof row.shortName === 'string' ? row.shortName.trim() : null,
      subjectCode: typeof row.subjectCode === 'string' ? row.subjectCode.trim() : null,
      faculty: typeof row.faculty === 'string' ? row.faculty.trim() : null,
      room: typeof row.room === 'string' ? row.room.trim() : null,
      classType: toClassType(row.classType),
      attendanceCountMode:
        row.attendanceCountMode === 'session' ? 'session' : row.attendanceCountMode === 'period' ? 'period' : null,
      confidence: clamp01(row.confidence),
    }));

  const semesterRaw = isRecord(payload.semester) ? payload.semester : {};

  return {
    semester: {
      name: typeof semesterRaw.name === 'string' ? semesterRaw.name : null,
      startDate: typeof semesterRaw.startDate === 'string' ? semesterRaw.startDate : null,
      endDate: typeof semesterRaw.endDate === 'string' ? semesterRaw.endDate : null,
    },
    subjects,
    schedule,
    warnings: Array.isArray(payload.warnings)
      ? payload.warnings.filter((item): item is string => typeof item === 'string')
      : [],
  };
}

function toClassType(value: unknown): ExtractedSlot['classType'] {
  if (value === 'lab') return 'lab';
  if (value === 'other') return 'other';
  return 'theory';
}

function normaliseDay(value: unknown): ExtractedSlot['dayOfWeek'] {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  const day = Math.round(numeric);
  return day >= 0 && day <= 6 ? (day as ExtractedSlot['dayOfWeek']) : null;
}

function normaliseTime(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hours = Math.min(23, Math.max(0, Number(match[1])));
  const minutes = Math.min(59, Math.max(0, Number(match[2])));
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function clamp01(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0.5;
  return Math.min(1, Math.max(0, numeric));
}

export function isAiProviderConfigured(): boolean {
  // Only a boolean flag reaches the client; the key itself stays server-side.
  return import.meta.env.VITE_AI_EXTRACTION_ENABLED === 'true';
}

export async function extractTimetable(request: ExtractionRequest): Promise<ExtractionResult> {
  validateUpload(request.file);

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
  return {
    source: 'ai',
    provider: typeof payload?.provider === 'string' ? payload.provider : 'multimodal-ai',
    timetable: parseExtractedTimetable(payload),
    storagePath: typeof payload?.storagePath === 'string' ? payload.storagePath : null,
  };
}
