import type { ExtractedTimetable } from '@/types/domain';

/**
 * Fixture extraction used when no AI provider is configured.
 *
 * This is deliberately labelled in the UI as a development fixture — Classora
 * never pretends a live model read the file. It models exactly what a real
 * multimodal extraction returns (including low-confidence fields) so the whole
 * review workflow can be exercised without credentials.
 */
export function demoExtraction(fileName: string): ExtractedTimetable {
  const warnings: string[] = [
    'Demo extraction: no AI provider is configured, so this is sample data.',
    `Parsed locally from "${fileName}" for review-flow testing only.`,
  ];

  return {
    semester: { name: 'Semester 5', startDate: null, endDate: null },
    subjects: [
      {
        name: 'Data Structures & Algorithms',
        shortName: 'DSA',
        subjectCode: 'CS-201',
        faculty: 'Prof. A. Mehta',
        room: 'C-203',
        classType: 'theory',
        attendanceCountMode: 'period',
        confidence: 0.97,
      },
      {
        name: 'Operating Systems',
        shortName: 'OS',
        subjectCode: 'CS-204',
        faculty: 'Dr. R. Kulkarni',
        room: 'C-204',
        classType: 'theory',
        attendanceCountMode: 'period',
        confidence: 0.95,
      },
      {
        name: 'Discrete Mathematics',
        shortName: 'DM',
        subjectCode: 'MA-210',
        faculty: 'Prof. K. Verma',
        room: 'C-201',
        classType: 'theory',
        attendanceCountMode: 'period',
        confidence: 0.72,
      },
      {
        name: 'Computer Networks',
        shortName: 'CN',
        subjectCode: 'CS-206',
        faculty: 'Prof. D. George',
        room: 'C-206',
        classType: 'theory',
        attendanceCountMode: 'period',
        confidence: 0.9,
      },
      {
        name: 'Python Programming Lab',
        shortName: 'Python Lab',
        subjectCode: 'CS-208L',
        faculty: 'Eng. T. Vance',
        room: 'Lab 3 (Tower B)',
        classType: 'lab',
        attendanceCountMode: 'session',
        confidence: 0.86,
      },
    ],
    schedule: [
      { dayOfWeek: 1, date: null, startTime: '08:00', endTime: '09:00', subjectName: 'Data Structures & Algorithms', subjectCode: 'CS-201', faculty: 'Prof. A. Mehta', room: 'C-203', classType: 'theory', periodCount: 1, isBreak: false, breakLabel: null, confidence: 0.97 },
      { dayOfWeek: 1, date: null, startTime: '09:00', endTime: '10:00', subjectName: 'Operating Systems', subjectCode: 'CS-204', faculty: 'Dr. R. Kulkarni', room: 'C-204', classType: 'theory', periodCount: 1, isBreak: false, breakLabel: null, confidence: 0.95 },
      { dayOfWeek: 1, date: null, startTime: '10:00', endTime: '11:00', subjectName: 'Recess', subjectCode: null, faculty: null, room: null, classType: 'other', periodCount: 1, isBreak: true, breakLabel: 'Recess • 60 mins campus break', confidence: 0.99 },
      { dayOfWeek: 1, date: null, startTime: '14:00', endTime: '16:00', subjectName: 'Python Programming Lab', subjectCode: 'CS-208L', faculty: 'Eng. T. Vance', room: 'Lab 3 (Tower B)', classType: 'lab', periodCount: 2, isBreak: false, breakLabel: null, confidence: 0.88 },
      { dayOfWeek: 2, date: null, startTime: '08:00', endTime: '09:00', subjectName: 'Computer Networks', subjectCode: 'CS-206', faculty: 'Prof. D. George', room: 'C-206', classType: 'theory', periodCount: 1, isBreak: false, breakLabel: null, confidence: 0.93 },
      { dayOfWeek: 3, date: null, startTime: '09:00', endTime: '10:00', subjectName: 'Discrete Mathematics', subjectCode: 'MA-210', faculty: 'Prof. K. Verma', room: 'C-201', classType: 'theory', periodCount: 1, isBreak: false, breakLabel: null, confidence: 0.62 },
      { dayOfWeek: 3, date: null, startTime: '14:00', endTime: '16:00', subjectName: 'Python Programming Lab', subjectCode: 'CS-208L', faculty: 'Eng. T. Vance', room: 'Lab 3 (Tower B)', classType: 'lab', periodCount: 2, isBreak: false, breakLabel: null, confidence: 0.88 },
      { dayOfWeek: 4, date: null, startTime: '08:00', endTime: '09:00', subjectName: 'Data Structures & Algorithms', subjectCode: 'CS-201', faculty: 'Prof. A. Mehta', room: 'C-203', classType: 'theory', periodCount: 1, isBreak: false, breakLabel: null, confidence: 0.96 },
      { dayOfWeek: 4, date: null, startTime: '09:00', endTime: '10:00', subjectName: 'Computer Networks', subjectCode: 'CS-206', faculty: 'Prof. D. George', room: 'C-206', classType: 'theory', periodCount: 1, isBreak: false, breakLabel: null, confidence: 0.92 },
      { dayOfWeek: 5, date: null, startTime: '08:00', endTime: '09:00', subjectName: 'Data Structures & Algorithms', subjectCode: 'CS-201', faculty: 'Prof. A. Mehta', room: 'C-203', classType: 'theory', periodCount: 1, isBreak: false, breakLabel: null, confidence: 0.97 },
      { dayOfWeek: 5, date: null, startTime: '09:00', endTime: '10:00', subjectName: 'Operating Systems', subjectCode: 'CS-204', faculty: 'Dr. R. Kulkarni', room: 'C-204', classType: 'theory', periodCount: 1, isBreak: false, breakLabel: null, confidence: 0.94 },
      { dayOfWeek: 5, date: null, startTime: '11:00', endTime: '12:00', subjectName: 'Discrete Mathematics', subjectCode: 'MA-210', faculty: 'Prof. K. Verma', room: 'C-201', classType: 'theory', periodCount: 1, isBreak: false, breakLabel: null, confidence: 0.68 },
      { dayOfWeek: 5, date: null, startTime: '14:00', endTime: '16:00', subjectName: 'Python Programming Lab', subjectCode: 'CS-208L', faculty: 'Eng. T. Vance', room: 'Lab 3 (Tower B)', classType: 'lab', periodCount: 2, isBreak: false, breakLabel: null, confidence: 0.88 },
    ],
    warnings,
  };
}
