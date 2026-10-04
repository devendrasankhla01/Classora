import { parseCsvTimetable } from './timetable-ai/csvParser';
import { ATTACHED_CSV_DATA } from '@/data/sampleTimetableCsv';
import { createId } from '@/lib/id';
import { nowInstant } from '@/lib/date';
import { futureGenerationRange, generateOccurrences, normalizeSignature } from '@/lib/schedule';
import type {
  ClassOccurrence,
  ClassType,
  DayOfWeek,
  RecurringSlot,
  Semester,
  Subject,
  SubjectColorKey,
  TimetableVersion,
} from '@/types/domain';

const COLOR_KEYS: SubjectColorKey[] = ['indigo', 'sky', 'emerald', 'amber', 'violet', 'rose'];

/**
 * Checks if a USN/Roll number falls in the range 4PM25CS001 – 4PM25CS062.
 */
export function isUsnInBuiltinRange(rawUsn: string | null | undefined): boolean {
  if (!rawUsn) return false;
  const clean = rawUsn.trim().toUpperCase();
  // Matches 4PM25CS001 up to 4PM25CS062 (also supports 4PM25CS1 .. 4PM25CS62)
  const match = clean.match(/^4PM25CS0*([1-9]|[1-5][0-9]|6[0-2])$/);
  return Boolean(match);
}

export interface BuiltinTimetableBundle {
  subjects: Subject[];
  slots: RecurringSlot[];
  notes: string;
  semesterName: string;
}

/**
 * Generates the complete Semester III Section A subjects & slots
 * from the official built-in CSV for USN batch 4PM25CS001 – 4PM25CS062.
 */
export function generateBuiltinSemester3Data(semesterId: string = 'sem-iii-2026'): BuiltinTimetableBundle {
  const extracted = parseCsvTimetable(ATTACHED_CSV_DATA);
  const now = nowInstant();

  const colorMap = new Map<string, SubjectColorKey>();
  let colorIdx = 0;

  // Build Subject records
  const subjects: Subject[] = extracted.subjects.map((subDraft) => {
    const key = subDraft.name.toLowerCase();
    if (!colorMap.has(key)) {
      colorMap.set(key, COLOR_KEYS[colorIdx % COLOR_KEYS.length]!);
      colorIdx++;
    }

    return {
      id: subDraft.subjectCode ? `subj-${subDraft.subjectCode.toLowerCase()}` : createId('subj'),
      semesterId,
      name: subDraft.name,
      shortName: subDraft.shortName || subDraft.name.slice(0, 6),
      subjectCode: subDraft.subjectCode,
      faculty: subDraft.faculty,
      defaultRoom: subDraft.room ?? 'E201',
      classType: (subDraft.classType === 'other' ? 'theory' : subDraft.classType) as ClassType,
      attendanceCountMode: subDraft.attendanceCountMode ?? 'period',
      targetPercentage: null,
      colorKey: colorMap.get(key)!,
      archived: false,
      createdAt: now,
      updatedAt: now,
    };
  });

  const subjectByKey = new Map<string, Subject>();
  for (const s of subjects) {
    if (s.subjectCode) subjectByKey.set(s.subjectCode.toLowerCase(), s);
    subjectByKey.set(s.name.toLowerCase(), s);
    subjectByKey.set(s.shortName.toLowerCase(), s);
  }

  function findSubject(code: string | null, name: string): Subject | undefined {
    if (code && subjectByKey.has(code.toLowerCase())) {
      return subjectByKey.get(code.toLowerCase());
    }
    return subjectByKey.get(name.toLowerCase());
  }

  // Build RecurringSlot records
  const slots: RecurringSlot[] = extracted.schedule
    .filter((slot) => slot.dayOfWeek !== null)
    .map((slot, index) => {
      const matched = slot.isBreak ? undefined : findSubject(slot.subjectCode, slot.subjectName);
      return {
        id: `builtin-slot-${index + 1}`,
        timetableVersionId: 'ver-1',
        semesterId,
        subjectId: matched ? matched.id : `subj-auto-${index}`,
        dayOfWeek: slot.dayOfWeek as DayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        room: slot.room ?? (matched?.defaultRoom ?? 'E201'),
        facultyOverride: slot.faculty ?? matched?.faculty ?? null,
        classType: (slot.classType === 'other' ? 'theory' : slot.classType) as ClassType,
        periodCount: slot.periodCount,
        kind: slot.isBreak ? 'break' : 'class',
        label: slot.breakLabel,
        createdAt: now,
        updatedAt: now,
      };
    });

  return {
    subjects,
    slots,
    notes: 'Official Semester III Section A Timetable (Pre-saved default)',
    semesterName: 'Semester III (2026-27)',
  };
}

export interface BuiltinSemester3Complete {
  semester: Semester;
  subjects: Subject[];
  version: TimetableVersion;
  slots: RecurringSlot[];
  occurrences: ClassOccurrence[];
}

/**
 * Complete pre-saved Semester III bundle ready to be seeded or loaded by default.
 */
export function getBuiltinSemester3Complete(userId: string = 'local'): BuiltinSemester3Complete {
  const semesterId = 'sem-iii-2026';
  const versionId = 'ver-1';
  const now = nowInstant();

  const semester: Semester = {
    id: semesterId,
    userId,
    name: 'Semester III (Autumn 2026-27)',
    startDate: '2026-09-15',
    endDate: '2027-02-15',
    isActive: true,
    archived: false,
    createdAt: now,
    updatedAt: now,
  };

  const data = generateBuiltinSemester3Data(semesterId);

  const slots: RecurringSlot[] = data.slots.map((s, index) => ({
    ...s,
    id: `slot-sem3-${index + 1}`,
    semesterId,
    timetableVersionId: versionId,
  }));

  const version: TimetableVersion = {
    id: versionId,
    semesterId,
    versionNumber: 1,
    label: 'Official Semester III (Section A)',
    notes: 'Official pre-saved Semester III Section A Timetable',
    signature: normalizeSignature(slots),
    isCurrent: true,
    createdBy: 'seed',
    createdAt: now,
  };

  const range = futureGenerationRange(semester, new Date(), 60);
  const genResult = generateOccurrences({
    semester,
    slots: slots.filter((slot) => slot.kind === 'class'),
    overrides: [],
    from: range.from,
    to: range.to,
  });

  return {
    semester,
    subjects: data.subjects,
    version,
    slots,
    occurrences: genResult.occurrences,
  };
}
