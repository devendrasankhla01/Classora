import type {
  ClassType,
  DateKey,
  DayOfWeek,
  ExtractedSlot,
  ExtractedSubject,
  ExtractedTimetable,
  TimeKey,
} from '@/types/domain';
import { ExtractionError } from './types';

const DAY_MAP: Record<string, DayOfWeek> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thur: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[\s_\-.]+/g, '');
}

function parseTimeKey(raw: string): TimeKey | null {
  const cleaned = raw.trim();
  const match = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = match[1]!.padStart(2, '0');
  const minutes = match[2]!;
  return `${hours}:${minutes}`;
}

function calculatePeriods(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if (sh === undefined || sm === undefined || eh === undefined || em === undefined) return 1;
  const minutes = eh * 60 + em - (sh * 60 + sm);
  if (minutes <= 0) return 1;
  return Math.max(1, Math.round(minutes / 60));
}

function deriveShortName(name: string, code: string | null): string {
  // Extract parentheses e.g. "Object Oriented Programming (OOPS)" -> "OOPS"
  const match = name.match(/\(([^)]+)\)/);
  if (match && match[1] && match[1].length <= 12) {
    return match[1].trim();
  }
  if (code && code.length <= 10) return code;
  if (name.length <= 14) return name;
  const words = name.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    const acronym = words.map((w) => w[0]?.toUpperCase()).join('');
    if (acronym.length >= 2 && acronym.length <= 8) return acronym;
  }
  return name.slice(0, 12).trim();
}

export function parseCsvTimetable(csvContent: string): ExtractedTimetable {
  const lines = csvContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    throw new ExtractionError(
      'The CSV file does not contain enough rows. It should include a header row and class schedule rows.',
      'invalid-response',
    );
  }

  const rawHeaders = parseCsvLine(lines[0]!);
  const headers = rawHeaders.map(normalizeHeader);

  const getCol = (names: string[]): number => {
    return headers.findIndex((h) => names.some((n) => h === normalizeHeader(n)));
  };

  const dayIdx = getCol(['day', 'dayofweek', 'weekday']);
  const startIdx = getCol(['start', 'starttime', 'start_time', 'from', 'begins']);
  const endIdx = getCol(['end', 'endtime', 'end_time', 'to', 'finishes']);
  const subjectIdx = getCol(['subject', 'subjectname', 'course', 'coursename', 'title', 'class']);
  const codeIdx = getCol(['code', 'subjectcode', 'coursecode', 'id']);
  const facultyIdx = getCol(['faculty', 'teacher', 'instructor', 'professor', 'staff']);
  const roomIdx = getCol(['room', 'classroom', 'hall', 'venue', 'lab']);
  const typeIdx = getCol(['type', 'classtype', 'kind', 'category']);
  const yearIdx = getCol(['academicyear', 'year', 'session']);
  const semIdx = getCol(['semester', 'sem', 'term']);
  const sectionIdx = getCol(['section', 'sec', 'batch']);
  const dateIdx = getCol(['effectivefrom', 'startdate', 'effective_from', 'fromdate']);
  const notesIdx = getCol(['notes', 'note', 'remarks', 'comment']);

  if (dayIdx === -1 || startIdx === -1 || subjectIdx === -1) {
    throw new ExtractionError(
      'The CSV header is missing required columns. It must include "Day", "Start" (or "Start Time"), and "Subject".',
      'invalid-response',
    );
  }

  const subjectsMap = new Map<string, ExtractedSubject>();
  const schedule: ExtractedSlot[] = [];
  let detectedYear: string | null = null;
  let detectedSem: string | null = null;
  let detectedSection: string | null = null;
  let detectedStartDate: DateKey | null = null;

  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i]!);
    if (row.length === 0 || row.every((c) => c.length === 0)) continue;

    const rawDay = (row[dayIdx] ?? '').toLowerCase().trim();
    const dayOfWeek = DAY_MAP[rawDay] ?? null;
    if (dayOfWeek === null) continue;

    const rawStart = row[startIdx] ?? '';
    const rawEnd = endIdx !== -1 ? row[endIdx] ?? '' : '';
    const startTime = parseTimeKey(rawStart);
    if (!startTime) continue;

    let endTime = parseTimeKey(rawEnd);
    if (!endTime) {
      // Default to 1 hour later
      const [h, m] = startTime.split(':').map(Number);
      const nextH = Math.min(23, (h ?? 8) + 1);
      endTime = `${String(nextH).padStart(2, '0')}:${String(m ?? 0).padStart(2, '0')}`;
    }

    const subjectName = (row[subjectIdx] ?? '').trim();
    if (!subjectName) continue;

    const subjectCode = codeIdx !== -1 && row[codeIdx] ? row[codeIdx]!.trim() : null;
    const faculty = facultyIdx !== -1 && row[facultyIdx] ? row[facultyIdx]!.trim() : null;
    const room = roomIdx !== -1 && row[roomIdx] ? row[roomIdx]!.trim() : null;

    const rawType = (typeIdx !== -1 ? row[typeIdx] ?? '' : '').toLowerCase().trim();
    const classType: ClassType =
      rawType === 'lab' || rawType === 'laboratory' || /lab/i.test(subjectName)
        ? 'lab'
        : rawType === 'other'
          ? 'other'
          : 'theory';

    const periodCount = calculatePeriods(startTime, endTime);
    const breakLabel = notesIdx !== -1 && row[notesIdx] ? row[notesIdx]!.trim() : null;

    if (yearIdx !== -1 && row[yearIdx] && !detectedYear) detectedYear = row[yearIdx]!.trim();
    if (semIdx !== -1 && row[semIdx] && !detectedSem) detectedSem = row[semIdx]!.trim();
    if (sectionIdx !== -1 && row[sectionIdx] && !detectedSection) detectedSection = row[sectionIdx]!.trim();
    if (dateIdx !== -1 && row[dateIdx] && !detectedStartDate) {
      const parsedDate = row[dateIdx]!.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(parsedDate)) {
        detectedStartDate = parsedDate;
      }
    }

    const subjectKey = subjectCode ? `${subjectCode}:${subjectName}` : subjectName;
    if (!subjectsMap.has(subjectKey)) {
      subjectsMap.set(subjectKey, {
        name: subjectName,
        shortName: deriveShortName(subjectName, subjectCode),
        subjectCode,
        faculty,
        room,
        classType,
        attendanceCountMode: classType === 'lab' ? 'period' : 'period',
        confidence: 1.0,
      });
    }

    schedule.push({
      dayOfWeek,
      date: null,
      startTime,
      endTime,
      subjectName,
      subjectCode,
      faculty,
      room,
      classType,
      periodCount,
      isBreak: false,
      breakLabel: breakLabel || null,
      confidence: 1.0,
    });
  }

  if (schedule.length === 0) {
    throw new ExtractionError(
      'Could not extract any valid class slots from the CSV file. Please verify the days and start times.',
      'invalid-response',
    );
  }

  const semesterParts = [
    detectedSem ? `Semester ${detectedSem}` : null,
    detectedYear ? `(${detectedYear})` : null,
    detectedSection ? `• Section ${detectedSection}` : null,
  ].filter(Boolean);

  const semesterName = semesterParts.length > 0 ? semesterParts.join(' ') : 'Imported Semester';

  const startDate = detectedStartDate ?? new Date().toISOString().slice(0, 10);
  const startDt = new Date(startDate);
  const endDate = new Date(startDt.getTime() + 120 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return {
    semester: {
      name: semesterName,
      startDate,
      endDate,
    },
    subjects: Array.from(subjectsMap.values()),
    schedule,
    warnings: [],
  };
}
