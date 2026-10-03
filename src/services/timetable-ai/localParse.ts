/**
 * Client-side timetable parser.
 *
 * Handles the common export shapes college portals produce:
 *
 *   1. "Horizontal" grid  — days as columns, periods/rows as time slots.
 *      Cells contain one or more subject lines, e.g.
 *        | TIME    | MON  | TUE       | WED  | ...
 *        | 8-9     | DSA  | OS/R-204  | DM   |
 *
 *   2. "Vertical" list   — one row per class meeting. Columns include day,
 *      start, end, subject, faculty, room (any order, case-insensitive).
 *
 *   3. Plain text         — loosely formatted schedules copied from PDFs or
 *      WhatsApp notices. We extract `HH:MM-HH:MM <Subject>` patterns per day.
 *
 * The parser is deliberately forgiving: it returns the best ExtractedTimetable
 * it can, and the review screen always lets the student fix mistakes before
 * anything is saved.
 */
import type {
  ClassType,
  DayOfWeek,
  ExtractedSlot,
  ExtractedSubject,
  ExtractedTimetable,
} from '@/types/domain';

const DAY_NAMES: Record<string, DayOfWeek> = {
  sunday: 0, sun: 0, su: 0,
  monday: 1, mon: 1, mo: 1, m: 1,
  tuesday: 2, tue: 2, tu: 2,
  wednesday: 3, wed: 3, we: 3, w: 3,
  thursday: 4, thu: 4, th: 4,
  friday: 5, fri: 5, fr: 5, f: 5,
  saturday: 6, sat: 6, sa: 6,
};

const LAB_KEYWORDS = /\b(lab|practical|prac\.?|laboratory)\b/i;
const BREAK_KEYWORDS = /\b(lunch|break|recess|tea[ -]?break|free|gap)\b/i;

const TIME_RANGE_RE = /(\d{1,2}):?(\d{2})?\s*(?:-|to|–|—)\s*(\d{1,2}):?(\d{2})?/;
const TIME_TOKEN_RE = /(\d{1,2}):(\d{2})/;

function normaliseTime(h: number, m: number | undefined): string {
  const mm = m ?? 0;
  const hh = Math.max(0, Math.min(23, h));
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function inferClassType(name: string): ClassType {
  return LAB_KEYWORDS.test(name) ? 'lab' : 'theory';
}

/** Split a CSV line honouring quoted fields. */
function splitCsv(line: string, sep = ','): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQ = !inQ;
      }
    } else if (ch === sep && !inQ) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

function detectSeparator(line: string): string {
  const tabs = line.split('\t').length - 1;
  const commas = splitCsv(line, ',').length - 1;
  const pipes = line.split('|').length - 1;
  if (tabs >= 2 && tabs >= commas) return '\t';
  if (pipes >= 3 && pipes > commas) return '|';
  return ',';
}

function guessDayColumn(headers: string[]): { col: number; day: DayOfWeek }[] {
  const out: { col: number; day: DayOfWeek }[] = [];
  headers.forEach((raw, idx) => {
    const h = raw.trim().toLowerCase();
    // Match the longest aliases first: otherwise an "S" prefix incorrectly
    // classifies Saturday as Sunday, and a one-letter "T" is ambiguous.
    const aliases = Object.entries(DAY_NAMES).sort(([left], [right]) => right.length - left.length);
    for (const [key, day] of aliases) {
      if (h === key || h.startsWith(key) || new RegExp(`\\b${key}\\b`, 'i').test(h)) {
        out.push({ col: idx, day });
        break;
      }
    }
  });
  return out;
}

function findColumn(headers: string[], patterns: RegExp[]): number {
  for (let i = 0; i < headers.length; i += 1) {
    const h = headers[i]!.trim().toLowerCase();
    if (patterns.some((re) => re.test(h))) return i;
  }
  return -1;
}

interface ParsedCell {
  subjectName: string;
  room: string | null;
  faculty: string | null;
  subjectCode: string | null;
}

/** Split a grid cell like "DSA (CS-201)\nProf. Mehta\nC-203" into parts. */
function parseCell(raw: string): ParsedCell | null {
  const text = raw.replace(/\r/g, '').trim();
  if (!text || (BREAK_KEYWORDS.test(text) && text.length < 25)) {
    if (BREAK_KEYWORDS.test(text)) {
      return {
        subjectName: text.split(/\n|\/|,/)[0]!.trim() || 'Break',
        room: null,
        faculty: null,
        subjectCode: null,
      };
    }
    return null;
  }

  // Remove stray bullet/numbering
  const lines = text
    .split(/\s*[\n/]\s*|;\s*/)
    .map((line) => line.replace(/^\s*[-*•]\s*/, '').trim())
    .filter(Boolean);

  const codeMatch = text.match(/\b([A-Z]{2,4}[-\s]?\d{3}[A-Z0-9]*)\b/);
  const roomMatch = text.match(/\b([A-Z]?-?\d{2,4}[A-Z]?)\b/);
  const subjectCode = codeMatch ? codeMatch[1].replace(/\s+/g, '-') : null;

  // Heuristic: the first line containing letters (not just a code/room) is the name
  let name = lines[0] ?? text;
  for (const line of lines) {
    if (/[a-zA-Z]{3,}/.test(line) && !/^(prof|dr|mr|ms|mrs|er|eng)\.?\s/i.test(line)) {
      name = line;
      break;
    }
  }
  name = name.replace(/\([^)]*\)/g, '').replace(/\b(CS|IT|EC|EE|ME|CE|MA)\d{3}\b/gi, '').trim();
  if (!name || name.length < 2) return null;

  const facultyLine = lines.find((line) => /^(prof\.?|dr\.?|mr\.?|ms\.?|mrs\.?|er\.?|eng\.?)\s+/i.test(line)) ?? null;
  const faculty = facultyLine ? facultyLine.replace(/^(prof|dr|mr|ms|mrs|er|eng)\.?\s+/i, '').trim() : null;

  const room = roomMatch && !/^[A-Z]{2,4}/.test(roomMatch[1]) ? roomMatch[1] : null;

  const isBreak = BREAK_KEYWORDS.test(name);

  return {
    subjectName: isBreak ? name : name,
    room,
    faculty,
    subjectCode,
  };
}

function parseVerticalTable(lines: string[]): ExtractedSlot[] {
  const records = lines.filter((line) => line.trim().length > 0);
  if (records.length < 2) return [];
  const sep = detectSeparator(records[0]!);
  const headers = splitCsv(records[0]!, sep).map((header) => header.trim());
  const dayCol = findColumn(headers, [/day/i, /weekday/i]);
  const startCol = findColumn(headers, [/start/i, /from/i]);
  const endCol = findColumn(headers, [/end/i, /to/i]);
  const timeCol = findColumn(headers, [/time/i, /slot/i, /period/i]);
  const subjCol = findColumn(headers, [/subject|course|paper|class/i]);
  const facCol = findColumn(headers, [/faculty|teacher|prof/i]);
  const roomCol = findColumn(headers, [/room|venue|hall|lab\s*no/i]);
  const codeCol = findColumn(headers, [/code|subject[_\s-]?code|course[_\s-]?code/i]);
  const typeCol = findColumn(headers, [/type|cat(egory)?/i]);

  if (dayCol < 0 || subjCol < 0) return [];

  const slots: ExtractedSlot[] = [];
  for (let i = 1; i < records.length; i += 1) {
    const cols = splitCsv(records[i]!, sep);
    const dayRaw = (cols[dayCol] ?? '').trim();
    const subjectName = (cols[subjCol] ?? '').trim();
    if (!subjectName) continue;
    const day = DAY_NAMES[dayRaw.toLowerCase()] ?? DAY_NAMES[dayRaw.toLowerCase().slice(0, 3)] ?? null;
    if (day === null) continue;

    let startTime: string | null = null;
    let endTime: string | null = null;
    if (timeCol >= 0) {
      const timeMatch = (cols[timeCol] ?? '').match(TIME_RANGE_RE);
      if (timeMatch) {
        startTime = normaliseTime(Number(timeMatch[1]), timeMatch[2] ? Number(timeMatch[2]) : undefined);
        endTime = normaliseTime(Number(timeMatch[3]), timeMatch[4] ? Number(timeMatch[4]) : undefined);
      }
    }
    if (!startTime && startCol >= 0) {
      const startMatch = (cols[startCol] ?? '').match(TIME_TOKEN_RE);
      if (startMatch) startTime = normaliseTime(Number(startMatch[1]), Number(startMatch[2]));
    }
    if (!endTime && endCol >= 0) {
      const endMatch = (cols[endCol] ?? '').match(TIME_TOKEN_RE);
      if (endMatch) endTime = normaliseTime(Number(endMatch[1]), Number(endMatch[2]));
    }
    if (!startTime) startTime = '09:00';
    if (!endTime || endTime <= startTime) endTime = '10:00';

    const isBreak = BREAK_KEYWORDS.test(subjectName);
    const classType: ClassType =
      typeCol >= 0 && /lab/i.test(cols[typeCol] ?? '') ? 'lab' : inferClassType(subjectName);

    slots.push({
      dayOfWeek: day,
      date: null,
      startTime,
      endTime,
      subjectName: isBreak ? subjectName : subjectName.replace(/\s+/g, ' ').trim(),
      subjectCode: codeCol >= 0 ? (cols[codeCol] ?? '').trim() || null : null,
      faculty: facCol >= 0 ? (cols[facCol] ?? '').trim() || null : null,
      room: roomCol >= 0 ? (cols[roomCol] ?? '').trim() || null : null,
      classType,
      periodCount: 1,
      isBreak,
      breakLabel: isBreak ? subjectName : null,
      confidence: 0.85,
    });
  }
  return slots;
}

function parseHorizontalGrid(lines: string[]): ExtractedSlot[] {
  const rows = lines.filter((line) => line.trim().length > 0);
  if (rows.length < 2) return [];
  const sep = detectSeparator(rows[0]!);
  const headers = splitCsv(rows[0]!, sep).map((header) => header.trim());
  const dayCols = guessDayColumn(headers);
  if (dayCols.length < 1) return [];
  // Time column is usually first or second
  const timeCol = headers.findIndex((header, index) => index < 3 && /time|slot|period|hour/i.test(header));
  const timeColIdx = timeCol >= 0 ? timeCol : 0;

  const slots: ExtractedSlot[] = [];
  for (let i = 1; i < rows.length; i += 1) {
    const cols = splitCsv(rows[i]!, sep);
    const timeRaw = (cols[timeColIdx] ?? '').trim();
    const timeMatch = timeRaw.match(TIME_RANGE_RE);
    if (!timeMatch) continue;
    const startTime = normaliseTime(Number(timeMatch[1]), timeMatch[2] ? Number(timeMatch[2]) : undefined);
    const endTime = normaliseTime(Number(timeMatch[3]), timeMatch[4] ? Number(timeMatch[4]) : undefined);

    for (const { col, day } of dayCols) {
      const cell = (cols[col] ?? '').trim();
      if (!cell) continue;
      const parsed = parseCell(cell);
      if (!parsed) continue;
      const isBreak = BREAK_KEYWORDS.test(parsed.subjectName);
      slots.push({
        dayOfWeek: day,
        date: null,
        startTime,
        endTime,
        subjectName: parsed.subjectName,
        subjectCode: parsed.subjectCode,
        faculty: parsed.faculty,
        room: parsed.room,
        classType: inferClassType(parsed.subjectName),
        periodCount: 1,
        isBreak,
        breakLabel: isBreak ? parsed.subjectName : null,
        confidence: 0.75,
      });
    }
  }
  return slots;
}

function parsePlainText(text: string): ExtractedSlot[] {
  const slots: ExtractedSlot[] = [];
  const lines = text.split(/\r?\n/);
  let currentDay: DayOfWeek | null = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // Detect a day heading
    const dayMatch = line.match(/(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|wed|thu|fri|sat)[\s:—-]*/i);
    if (dayMatch && line.length < 40) {
      const key = dayMatch[1]!.toLowerCase();
      currentDay = DAY_NAMES[key.slice(0, 3)] ?? null;
      // Compact lines can contain both the day and its first class, e.g.
      // "Monday 09:00-10:00 Data Structures". Only treat a day as a heading
      // when the line does not also contain a time range.
      if (!TIME_RANGE_RE.test(line)) continue;
    }

    const timeMatch = line.match(TIME_RANGE_RE);
    if (timeMatch && currentDay !== null) {
      const startTime = normaliseTime(Number(timeMatch[1]), timeMatch[2] ? Number(timeMatch[2]) : undefined);
      const endTime = normaliseTime(Number(timeMatch[3]), timeMatch[4] ? Number(timeMatch[4]) : undefined);
      // Rest is the subject description
      const after = line.slice((timeMatch.index ?? 0) + timeMatch[0].length).replace(/^[\s:—-]+/, '').trim();
      // Strip faculty/room markers to get a clean name
      const subjectName = after.split(/[,|(]|(?:prof|dr)\./i)[0]!.trim() || 'Class';
      const roomMatch = after.match(/\b([A-Z]?-?\d{2,4}[A-Z]?)\b/);
      slots.push({
        dayOfWeek: currentDay,
        date: null,
        startTime,
        endTime,
        subjectName: subjectName || 'Class',
        subjectCode: null,
        faculty: null,
        room: roomMatch ? roomMatch[1] : null,
        classType: inferClassType(subjectName),
        periodCount: 1,
        isBreak: BREAK_KEYWORDS.test(subjectName),
        breakLabel: BREAK_KEYWORDS.test(subjectName) ? subjectName : null,
        confidence: 0.6,
      });
    }
  }
  return slots;
}

/** Build a deduplicated subject list from extracted slots. */
function buildSubjects(slots: ExtractedSlot[]): ExtractedSubject[] {
  const map = new Map<string, ExtractedSubject>();
  for (const slot of slots) {
    if (slot.isBreak) continue;
    const key = (slot.subjectCode ?? slot.subjectName).toLowerCase().replace(/\s+/g, ' ');
    if (!map.has(key)) {
      map.set(key, {
        name: slot.subjectName,
        shortName: null,
        subjectCode: slot.subjectCode,
        faculty: slot.faculty,
        room: slot.room,
        classType: slot.classType,
        attendanceCountMode: slot.classType === 'lab' ? 'session' : 'period',
        confidence: slot.confidence,
      });
    } else {
      const existing = map.get(key)!;
      if (!existing.faculty && slot.faculty) existing.faculty = slot.faculty;
      if (!existing.room && slot.room) existing.room = slot.room;
      if (!existing.subjectCode && slot.subjectCode) existing.subjectCode = slot.subjectCode;
    }
  }
  return [...map.values()];
}

export function extractFromText(text: string, fileName: string): ExtractedTimetable {
  // Strip BOM + normalise
  const cleaned = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const lines = cleaned.split('\n');

  // Try structured table formats first.
  let slots = parseVerticalTable(lines);
  if (slots.length === 0) slots = parseHorizontalGrid(lines);
  if (slots.length === 0) slots = parsePlainText(cleaned);

  const semesterName = (() => {
    const match = cleaned.match(/\b(sem(?:ester)?\s*(?:[ivx]+|\d+))\b/i);
    return match ? match[1].replace(/\b\w/g, (char) => char.toUpperCase()) : `Imported from ${fileName}`;
  })();

  return {
    semester: { name: semesterName, startDate: null, endDate: null },
    subjects: buildSubjects(slots),
    schedule: slots,
    warnings: slots.length === 0
      ? ['No class rows recognised — use the manual editor to enter your schedule.']
      : [
          `Parsed ${slots.filter((slot) => !slot.isBreak).length} class entries from ${fileName}. Review carefully before saving.`,
        ],
  };
}
