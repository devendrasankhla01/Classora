import { afterEach, describe, expect, it, vi } from 'vitest';

import { extractFromText } from './localParse';
import { extractTimetable } from './extractTimetable';
import { validateUpload } from './validation';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('extractFromText', () => {
  it('parses a vertical CSV export and keeps Saturday distinct from Sunday', () => {
    const timetable = extractFromText(
      [
        'Day,Start,End,Subject,Code,Faculty,Room,Type',
        'Saturday,08:00,09:00,Data Structures,CS-201,Prof. Mehta,C-203,theory',
      ].join('\n'),
      'timetable.csv',
    );

    expect(timetable.schedule).toHaveLength(1);
    expect(timetable.schedule[0]).toMatchObject({
      dayOfWeek: 6,
      startTime: '08:00',
      endTime: '09:00',
      subjectName: 'Data Structures',
      subjectCode: 'CS-201',
      faculty: 'Prof. Mehta',
      room: 'C-203',
    });
    expect(timetable.subjects).toHaveLength(1);
  });

  it('parses a horizontal grid into weekday slots', () => {
    const timetable = extractFromText(
      ['Time,Monday,Saturday', '08:00-09:00,Data Structures,Operating Systems'].join('\n'),
      'grid.csv',
    );

    expect(timetable.schedule.map((slot) => [slot.dayOfWeek, slot.subjectName])).toEqual([
      [1, 'Data Structures'],
      [6, 'Operating Systems'],
    ]);
  });

  it('parses a compact plain-text line with the day and class together', () => {
    const timetable = extractFromText('Monday 09:00-10:00 Data Structures', 'notice.txt');
    expect(timetable.schedule).toHaveLength(1);
    expect(timetable.schedule[0]).toMatchObject({
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '10:00',
      subjectName: 'Data Structures',
    });
  });

  it('returns a clear review warning for unrecognised text rather than fake rows', () => {
    const timetable = extractFromText('Some unrelated portal text.', 'export.txt');
    expect(timetable.schedule).toHaveLength(0);
    expect(timetable.subjects).toHaveLength(0);
    expect(timetable.warnings[0]).toMatch(/no class rows recognised/i);
  });
});

describe('extractTimetable', () => {
  it('keeps CSV exports on-device even when an AI provider is configured', async () => {
    vi.stubEnv('VITE_AI_EXTRACTION_ENABLED', 'true');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const file = {
      name: 'schedule.csv',
      size: 62,
      type: 'text/csv',
      text: async () => `Day,Start,End,Subject
Monday,09:00,10:00,Data Structures`,
    } as File;
    const result = await extractTimetable({ file });

    expect(result.source).toBe('local-parse');
    expect(result.timetable.schedule).toHaveLength(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('validateUpload', () => {
  it('accepts CSV and text timetable exports', () => {
    expect(() => validateUpload(new File(['Day,Subject'], 'schedule.csv', { type: 'text/csv' }))).not.toThrow();
    expect(() => validateUpload(new File(['Monday'], 'schedule.txt', { type: 'text/plain' }))).not.toThrow();
    expect(() => validateUpload(new File(['x'], 'schedule.tsv', { type: 'text/tab-separated-values' }))).not.toThrow();
  });

  it('continues to reject unsupported binaries', () => {
    expect(() => validateUpload(new File(['x'], 'schedule.exe', { type: 'application/octet-stream' }))).toThrow(
      /unsupported file type/i,
    );
  });
});
