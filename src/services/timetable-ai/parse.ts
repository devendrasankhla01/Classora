/**
 * Shared extraction parsing + validation.
 *
 * Deliberately free of browser *and* Node APIs so the exact same guard runs on
 * the server (before data is returned) and in the client (before data is
 * trusted). A model response is never believed: every field is coerced, ranges
 * are clamped, and unusable rows are dropped rather than smuggled through.
 */
import { ExtractionError } from './types';
import type { ExtractedSlot, ExtractedSubject, ExtractedTimetable } from '@/types/domain';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
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

function trimmed(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const result = value.trim();
  return result.length > 0 ? result : null;
}

/** Strict, total validation of a provider response. Throws on nonsense. */
export function parseExtractedTimetable(payload: unknown): ExtractedTimetable {
  if (!isRecord(payload)) {
    throw new ExtractionError('The extraction service returned an unexpected response.', 'invalid-response');
  }

  const scheduleRaw = Array.isArray(payload.schedule) ? payload.schedule : [];
  const subjectsRaw = Array.isArray(payload.subjects) ? payload.subjects : [];

  if (scheduleRaw.length === 0) {
    throw new ExtractionError(
      'No classes could be read from that file. Try a clearer photo, or upload the PDF from your college portal.',
      'invalid-response',
    );
  }

  const schedule: ExtractedSlot[] = scheduleRaw
    .filter(isRecord)
    .map((row): ExtractedSlot => {
      const startTime = normaliseTime(row.startTime);
      const endTime = normaliseTime(row.endTime);
      return {
        dayOfWeek: normaliseDay(row.dayOfWeek),
        date: typeof row.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(row.date) ? row.date : null,
        startTime: startTime ?? '08:00',
        endTime: endTime ?? startTime ?? '09:00',
        subjectName: trimmed(row.subjectName) ?? 'Unnamed class',
        subjectCode: trimmed(row.subjectCode),
        faculty: trimmed(row.faculty),
        room: trimmed(row.room),
        classType: toClassType(row.classType),
        periodCount: Number.isFinite(Number(row.periodCount))
          ? Math.min(10, Math.max(1, Math.round(Number(row.periodCount))))
          : 1,
        isBreak: row.isBreak === true,
        breakLabel: trimmed(row.breakLabel),
        confidence: clamp01(row.confidence),
      };
    })
    // A row with no weekday and no date can never be scheduled.
    .filter((slot) => slot.isBreak || slot.dayOfWeek !== null || slot.date !== null);

  const subjects: ExtractedSubject[] = subjectsRaw
    .filter(isRecord)
    .map((row): ExtractedSubject => ({
      name: trimmed(row.name) ?? 'Unnamed subject',
      shortName: trimmed(row.shortName),
      subjectCode: trimmed(row.subjectCode),
      faculty: trimmed(row.faculty),
      room: trimmed(row.room),
      classType: toClassType(row.classType),
      attendanceCountMode:
        row.attendanceCountMode === 'session'
          ? 'session'
          : row.attendanceCountMode === 'period'
            ? 'period'
            : null,
      confidence: clamp01(row.confidence),
    }))
    .filter((subject) => subject.name !== 'Unnamed subject' || subjectsRaw.length === 0);

  const semesterRaw = isRecord(payload.semester) ? payload.semester : {};
  const dateOrNull = (value: unknown): string | null =>
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;

  return {
    semester: {
      name: trimmed(semesterRaw.name),
      startDate: dateOrNull(semesterRaw.startDate),
      endDate: dateOrNull(semesterRaw.endDate),
    },
    subjects: subjects.length > 0 ? subjects : subjectsFromSchedule(schedule),
    schedule,
    warnings: Array.isArray(payload.warnings)
      ? payload.warnings.filter((item): item is string => typeof item === 'string')
      : [],
  };
}

/** Fall back to the schedule when the model forgot the subject list. */
function subjectsFromSchedule(schedule: readonly ExtractedSlot[]): ExtractedSubject[] {
  const seen = new Map<string, ExtractedSubject>();
  for (const slot of schedule) {
    if (slot.isBreak) continue;
    const key = slot.subjectCode ?? slot.subjectName.toLowerCase();
    if (seen.has(key)) continue;
    seen.set(key, {
      name: slot.subjectName,
      shortName: null,
      subjectCode: slot.subjectCode,
      faculty: slot.faculty,
      room: slot.room,
      classType: slot.classType,
      attendanceCountMode: slot.classType === 'lab' ? 'session' : 'period',
      confidence: slot.confidence,
    });
  }
  return [...seen.values()];
}

/**
 * Sanity report used by the review screen and by the server before responding.
 * Never throws — it describes what looks wrong so a human can decide.
 */
export interface ValidationReport {
  ok: boolean
  errors: string[];
  warnings: string[];
  stats: { slots: number; subjects: number; breaks: number; lowConfidence: number };
}

export function validateExtraction(timetable: ExtractedTimetable): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [...timetable.warnings];
  const classes = timetable.schedule.filter((slot) => !slot.isBreak);

  if (classes.length === 0) errors.push('No class rows were extracted.');

  // Overlaps within the same weekday.
  const byDay = new Map<number, ExtractedSlot[]>();
  for (const slot of classes) {
    if (slot.dayOfWeek === null) continue;
    const bucket = byDay.get(slot.dayOfWeek) ?? [];
    bucket.push(slot);
    byDay.set(slot.dayOfWeek, bucket);
  }
  for (const [day, slots] of byDay) {
    const sorted = [...slots].sort((a, b) => a.startTime.localeCompare(b.startTime));
    for (let index = 0; index < sorted.length - 1; index += 1) {
      const current = sorted[index]!;
      const next = sorted[index + 1]!;
      if (next.startTime < current.endTime) {
        warnings.push(
          `${DAY_NAMES[day]}: ${current.subjectName} (${current.startTime}–${current.endTime}) overlaps ${next.subjectName} (${next.startTime}–${next.endTime}).`,
        );
      }
    }
  }

  // Duplicate subject names.
  const names = new Map<string, number>();
  for (const slot of classes) {
    const key = slot.subjectName.toLowerCase();
    names.set(key, (names.get(key) ?? 0) + 1);
  }
  const lowConfidence = classes.filter((slot) => slot.confidence < 0.7).length;
  if (lowConfidence > 0) {
    warnings.push(`${lowConfidence} of ${classes.length} rows were read with low confidence — check those first.`);
  }

  const missingTimes = classes.filter((slot) => slot.endTime <= slot.startTime).length;
  if (missingTimes > 0) errors.push(`${missingTimes} rows have an end time before their start time.`);

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    stats: {
      slots: classes.length,
      subjects: timetable.subjects.length,
      breaks: timetable.schedule.filter((slot) => slot.isBreak).length,
      lowConfidence,
    },
  };
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
