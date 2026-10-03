import { describe, expect, it } from 'vitest';
import { isUsnInBuiltinRange, generateBuiltinSemester3Data } from './usnTimetable';

describe('usnTimetable', () => {
  it('correctly matches valid USNs from 4PM25CS001 to 4PM25CS062', () => {
    expect(isUsnInBuiltinRange('4PM25CS001')).toBe(true);
    expect(isUsnInBuiltinRange('4pm25cs001')).toBe(true);
    expect(isUsnInBuiltinRange('4PM25CS015')).toBe(true);
    expect(isUsnInBuiltinRange('4PM25CS062')).toBe(true);
    expect(isUsnInBuiltinRange('4pm25cs062')).toBe(true);
    expect(isUsnInBuiltinRange('  4PM25CS030  ')).toBe(true);
  });

  it('rejects USNs outside the 001-062 range', () => {
    expect(isUsnInBuiltinRange('4PM25CS000')).toBe(false);
    expect(isUsnInBuiltinRange('4PM25CS063')).toBe(false);
    expect(isUsnInBuiltinRange('4PM25CS100')).toBe(false);
    expect(isUsnInBuiltinRange('4PM25EC001')).toBe(false);
    expect(isUsnInBuiltinRange('1BCS302')).toBe(false);
    expect(isUsnInBuiltinRange('')).toBe(false);
    expect(isUsnInBuiltinRange(null)).toBe(false);
  });

  it('generates subjects and recurring slots matching the timetable CSV', () => {
    const data = generateBuiltinSemester3Data('sem-test');
    expect(data.subjects.length).toBeGreaterThan(5);
    expect(data.slots.length).toBeGreaterThan(20);

    const oops = data.subjects.find((s) => s.subjectCode === '1BCS302');
    expect(oops).toBeDefined();
    expect(oops?.name).toContain('Object Oriented Programming with Java');

    const ds = data.subjects.find((s) => s.subjectCode === '1BCS305');
    expect(ds).toBeDefined();
    expect(ds?.name).toContain('Data Structures');

    // Monday slots should include OOPS at 08:00
    const monFirst = data.slots.find((slot) => slot.dayOfWeek === 1 && slot.startTime === '08:00');
    expect(monFirst).toBeDefined();
    expect(monFirst?.subjectId).toBe(oops?.id);
  });
});
