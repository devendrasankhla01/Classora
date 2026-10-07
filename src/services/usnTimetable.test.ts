import { describe, expect, it } from 'vitest';
import { isUsnInBuiltinRange, generateBuiltinSemester3Data, findStudentByUsn } from './usnTimetable';

describe('usnTimetable', () => {
  it('correctly matches valid USNs from 4PM25CS001 to 4PM25CS062 and lateral entries', () => {
    expect(isUsnInBuiltinRange('4PM25CS001')).toBe(true);
    expect(isUsnInBuiltinRange('4pm25cs001')).toBe(true);
    expect(isUsnInBuiltinRange('4PM25CS043')).toBe(true);
    expect(isUsnInBuiltinRange('4PM25CS062')).toBe(true);
    expect(isUsnInBuiltinRange('  4PM25CS030  ')).toBe(true);
  });

  it('correctly finds official student records for Devendra Sankhla and Abhilasha', () => {
    const devendra = findStudentByUsn('4PM25CS043');
    expect(devendra).toBeDefined();
    expect(devendra?.name).toBe('DEVENDRA SANKHLA');
    expect(devendra?.batch).toBe('A2');

    const abhilasha = findStudentByUsn('4PM25CS001');
    expect(abhilasha).toBeDefined();
    expect(abhilasha?.name).toBe('ABHILASHA BASANAGOUDA PATIL');
    expect(abhilasha?.batch).toBe('A1');
  });

  it('generates subjects and recurring slots matching official Batch A-1 & A-2 schedules', () => {
    const dataA2 = generateBuiltinSemester3Data('sem-test', 'A2');
    expect(dataA2.subjects.length).toBeGreaterThan(5);
    expect(dataA2.slots.length).toBeGreaterThan(15);

    const oops = dataA2.subjects.find((s) => s.subjectCode === 'OOPS');
    expect(oops).toBeDefined();
    expect(oops?.name).toBe('Object Oriented Programming');

    const ds = dataA2.subjects.find((s) => s.subjectCode === 'DS');
    expect(ds).toBeDefined();
    expect(ds?.name).toBe('Data Structures');

    // Monday 08:00 should be OOPS
    const monFirst = dataA2.slots.find((slot) => slot.dayOfWeek === 1 && slot.startTime === '08:00');
    expect(monFirst).toBeDefined();
    expect(monFirst?.subjectId).toBe(oops?.id);

    // Batch A1 GIT LAB on Wednesday 13:30 - 15:30
    const dataA1 = generateBuiltinSemester3Data('sem-test', 'A1');
    const gitLabA1 = dataA1.slots.find((slot) => slot.dayOfWeek === 3 && slot.startTime === '13:30');
    expect(gitLabA1?.endTime).toBe('15:30');

    // Batch A2 GIT LAB on Thursday 10:30 - 12:30
    const gitLabA2 = dataA2.slots.find((slot) => slot.dayOfWeek === 4 && slot.startTime === '10:30');
    expect(gitLabA2?.endTime).toBe('12:30');
  });
});
