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

export interface StudentRecord {
  usn: string;
  name: string;
  batch: 'A1' | 'A2';
  section: string;
  department: string;
}

/** Master Roster for 3rd Semester Section A (Batch A1 & Batch A2) */
export const MASTER_STUDENT_ROSTER: Record<string, StudentRecord> = {
  // --- BATCH A-1 (USN 4PM25CS001 to 4PM25CS033) ---
  '4PM25CS001': { usn: '4PM25CS001', name: 'ABHILASHA BASANAGOUDA PATIL', batch: 'A1', section: 'CSE • Section A (Batch A-1)', department: 'Computer Science & Engineering' },
  '4PM25CS002': { usn: '4PM25CS002', name: 'ADARSHA T U', batch: 'A1', section: 'CSE • Section A (Batch A-1)', department: 'Computer Science & Engineering' },
  '4PM25CS003': { usn: '4PM25CS003', name: 'ADITI S', batch: 'A1', section: 'CSE • Section A (Batch A-1)', department: 'Computer Science & Engineering' },
  '4PM25CS004': { usn: '4PM25CS004', name: 'AISHWARYA', batch: 'A1', section: 'CSE • Section A (Batch A-1)', department: 'Computer Science & Engineering' },
  '4PM25CS005': { usn: '4PM25CS005', name: 'AISHWARYA A', batch: 'A1', section: 'CSE • Section A (Batch A-1)', department: 'Computer Science & Engineering' },
  '4PM25CS006': { usn: '4PM25CS006', name: 'AISHWARYA M', batch: 'A1', section: 'CSE • Section A (Batch A-1)', department: 'Computer Science & Engineering' },
  '4PM25CS007': { usn: '4PM25CS007', name: 'AISHWARYA N', batch: 'A1', section: 'CSE • Section A (Batch A-1)', department: 'Computer Science & Engineering' },
  '4PM25CS008': { usn: '4PM25CS008', name: 'AISHWARYA V BENNUR', batch: 'A1', section: 'CSE • Section A (Batch A-1)', department: 'Computer Science & Engineering' },
  '4PM25CS009': { usn: '4PM25CS009', name: 'AKANKSHA SUDHAKAR NANDANI', batch: 'A1', section: 'CSE • Section A (Batch A-1)', department: 'Computer Science & Engineering' },
  '4PM25CS010': { usn: '4PM25CS010', name: 'AMULYA H P', batch: 'A1', section: 'CSE • Section A (Batch A-1)', department: 'Computer Science & Engineering' },
  '4PM25CS011': { usn: '4PM25CS011', name: 'ANAND GURUSIDDAPPA TAKKALAKI', batch: 'A1', section: 'CSE • Section A (Batch A-1)', department: 'Computer Science & Engineering' },
  '4PM25CS012': { usn: '4PM25CS012', name: 'ANKITHA T S', batch: 'A1', section: 'CSE • Section A (Batch A-1)', department: 'Computer Science & Engineering' },
  '4PM25CS013': { usn: '4PM25CS013', name: 'ARCHANA V', batch: 'A1', section: 'CSE • Section A (Batch A-1)', department: 'Computer Science & Engineering' },
  '4PM25CS014': { usn: '4PM25CS014', name: 'ARJUN P', batch: 'A1', section: 'CSE • Section A (Batch A-1)', department: 'Computer Science & Engineering' },
  '4PM25CS016': { usn: '4PM25CS016', name: 'ASHIKA G', batch: 'A1', section: 'CSE • Section A (Batch A-1)', department: 'Computer Science & Engineering' },
  '4PM25CS017': { usn: '4PM25CS017', name: 'AYAZ KHAN', batch: 'A1', section: 'CSE • Section A (Batch A-1)', department: 'Computer Science & Engineering' },
  '4PM25CS018': { usn: '4PM25CS018', name: 'B K BHAVANI', batch: 'A1', section: 'CSE • Section A (Batch A-1)', department: 'Computer Science & Engineering' },
  '4PM25CS019': { usn: '4PM25CS019', name: 'B MEGHANA', batch: 'A1', section: 'CSE • Section A (Batch A-1)', department: 'Computer Science & Engineering' },
  '4PM25CS020': { usn: '4PM25CS020', name: 'BHAGYALAKSHMI LOKAPPA MADIVALAR', batch: 'A1', section: 'CSE • Section A (Batch A-1)', department: 'Computer Science & Engineering' },
  '4PM25CS021': { usn: '4PM25CS021', name: 'BHARATH P L', batch: 'A1', section: 'CSE • Section A (Batch A-1)', department: 'Computer Science & Engineering' },
  '4PM25CS022': { usn: '4PM25CS022', name: 'BHAVANA H R', batch: 'A1', section: 'CSE • Section A (Batch A-1)', department: 'Computer Science & Engineering' },
  '4PM25CS023': { usn: '4PM25CS023', name: 'BHUMIKA K J', batch: 'A1', section: 'CSE • Section A (Batch A-1)', department: 'Computer Science & Engineering' },
  '4PM25CS024': { usn: '4PM25CS024', name: 'BHUVANA P', batch: 'A1', section: 'CSE • Section A (Batch A-1)', department: 'Computer Science & Engineering' },
  '4PM25CS025': { usn: '4PM25CS025', name: 'BIBI HAJIRA', batch: 'A1', section: 'CSE • Section A (Batch A-1)', department: 'Computer Science & Engineering' },
  '4PM25CS026': { usn: '4PM25CS026', name: 'BINDU H N', batch: 'A1', section: 'CSE • Section A (Batch A-1)', department: 'Computer Science & Engineering' },
  '4PM25CS027': { usn: '4PM25CS027', name: 'C R SANJANA', batch: 'A1', section: 'CSE • Section A (Batch A-1)', department: 'Computer Science & Engineering' },
  '4PM25CS028': { usn: '4PM25CS028', name: 'CHAITRA MALLIKARJUN HUKKERI', batch: 'A1', section: 'CSE • Section A (Batch A-1)', department: 'Computer Science & Engineering' },
  '4PM25CS029': { usn: '4PM25CS029', name: 'CHANDANA H S', batch: 'A1', section: 'CSE • Section A (Batch A-1)', department: 'Computer Science & Engineering' },
  '4PM25CS030': { usn: '4PM25CS030', name: 'CHANDRASHEKHAR R K', batch: 'A1', section: 'CSE • Section A (Batch A-1)', department: 'Computer Science & Engineering' },
  '4PM25CS031': { usn: '4PM25CS031', name: 'CHETAN SURESH HABAGONDE', batch: 'A1', section: 'CSE • Section A (Batch A-1)', department: 'Computer Science & Engineering' },
  '4PM25CS032': { usn: '4PM25CS032', name: 'CHIDANANDA M', batch: 'A1', section: 'CSE • Section A (Batch A-1)', department: 'Computer Science & Engineering' },
  '4PM25CS033': { usn: '4PM25CS033', name: 'CHINMAYEE H', batch: 'A1', section: 'CSE • Section A (Batch A-1)', department: 'Computer Science & Engineering' },

  // --- BATCH A-2 (USN 4PM25CS034 to 4PM25CS062 + Lateral Entries) ---
  '4PM25CS034': { usn: '4PM25CS034', name: 'CHITHRA G', batch: 'A2', section: 'CSE • Section A (Batch A-2)', department: 'Computer Science & Engineering' },
  '4PM25CS036': { usn: '4PM25CS036', name: 'DALVIN A', batch: 'A2', section: 'CSE • Section A (Batch A-2)', department: 'Computer Science & Engineering' },
  '4PM25CS037': { usn: '4PM25CS037', name: 'DARSHAN', batch: 'A2', section: 'CSE • Section A (Batch A-2)', department: 'Computer Science & Engineering' },
  '4PM25CS038': { usn: '4PM25CS038', name: 'DARSHAN M HULAGURA', batch: 'A2', section: 'CSE • Section A (Batch A-2)', department: 'Computer Science & Engineering' },
  '4PM25CS039': { usn: '4PM25CS039', name: 'DEEKSHITH S GOWDA', batch: 'A2', section: 'CSE • Section A (Batch A-2)', department: 'Computer Science & Engineering' },
  '4PM25CS040': { usn: '4PM25CS040', name: 'DEEPAK B R', batch: 'A2', section: 'CSE • Section A (Batch A-2)', department: 'Computer Science & Engineering' },
  '4PM25CS041': { usn: '4PM25CS041', name: 'DEEPAK KUMAR CHANDRAKANTH BADIGER', batch: 'A2', section: 'CSE • Section A (Batch A-2)', department: 'Computer Science & Engineering' },
  '4PM25CS042': { usn: '4PM25CS042', name: 'DEEPIKA P S', batch: 'A2', section: 'CSE • Section A (Batch A-2)', department: 'Computer Science & Engineering' },
  '4PM25CS043': { usn: '4PM25CS043', name: 'DEVENDRA SANKHLA', batch: 'A2', section: 'CSE • Section A (Batch A-2)', department: 'Computer Science & Engineering' },
  '4PM25CS044': { usn: '4PM25CS044', name: 'DHANUSH R', batch: 'A2', section: 'CSE • Section A (Batch A-2)', department: 'Computer Science & Engineering' },
  '4PM25CS047': { usn: '4PM25CS047', name: 'DIVYA S R', batch: 'A2', section: 'CSE • Section A (Batch A-2)', department: 'Computer Science & Engineering' },
  '4PM25CS048': { usn: '4PM25CS048', name: 'DIVYASHREE G K', batch: 'A2', section: 'CSE • Section A (Batch A-2)', department: 'Computer Science & Engineering' },
  '4PM25CS049': { usn: '4PM25CS049', name: 'DRUSHYA R', batch: 'A2', section: 'CSE • Section A (Batch A-2)', department: 'Computer Science & Engineering' },
  '4PM25CS050': { usn: '4PM25CS050', name: 'FATHIMA ZAHRA', batch: 'A2', section: 'CSE • Section A (Batch A-2)', department: 'Computer Science & Engineering' },
  '4PM25CS051': { usn: '4PM25CS051', name: 'GAGAN C M', batch: 'A2', section: 'CSE • Section A (Batch A-2)', department: 'Computer Science & Engineering' },
  '4PM25CS052': { usn: '4PM25CS052', name: 'GAGANASHREE G A', batch: 'A2', section: 'CSE • Section A (Batch A-2)', department: 'Computer Science & Engineering' },
  '4PM25CS053': { usn: '4PM25CS053', name: 'GANAVI PATEL H G', batch: 'A2', section: 'CSE • Section A (Batch A-2)', department: 'Computer Science & Engineering' },
  '4PM25CS054': { usn: '4PM25CS054', name: 'GANESH R MANE', batch: 'A2', section: 'CSE • Section A (Batch A-2)', department: 'Computer Science & Engineering' },
  '4PM25CS055': { usn: '4PM25CS055', name: 'GEETA LAMANI', batch: 'A2', section: 'CSE • Section A (Batch A-2)', department: 'Computer Science & Engineering' },
  '4PM25CS057': { usn: '4PM25CS057', name: 'GOUTHAMI BHANDARI', batch: 'A2', section: 'CSE • Section A (Batch A-2)', department: 'Computer Science & Engineering' },
  '4PM25CS058': { usn: '4PM25CS058', name: 'GURURAJ', batch: 'A2', section: 'CSE • Section A (Batch A-2)', department: 'Computer Science & Engineering' },
  '4PM25CS059': { usn: '4PM25CS059', name: 'HEMALATHA M', batch: 'A2', section: 'CSE • Section A (Batch A-2)', department: 'Computer Science & Engineering' },
  '4PM25CS060': { usn: '4PM25CS060', name: 'HEMANTH GOWDA S B', batch: 'A2', section: 'CSE • Section A (Batch A-2)', department: 'Computer Science & Engineering' },
  '4PM25CS061': { usn: '4PM25CS061', name: 'INDRAJEETH K C', batch: 'A2', section: 'CSE • Section A (Batch A-2)', department: 'Computer Science & Engineering' },
  '4PM25CS062': { usn: '4PM25CS062', name: 'INDUSHREE R', batch: 'A2', section: 'CSE • Section A (Batch A-2)', department: 'Computer Science & Engineering' },
  '4PM25CS-L01': { usn: '4PM25CS-L01', name: 'AKSHAY B NENAVATHI', batch: 'A2', section: 'CSE • Section A (Batch A-2)', department: 'Computer Science & Engineering' },
  '4PM25CS-L02': { usn: '4PM25CS-L02', name: 'ARPITHA K T', batch: 'A2', section: 'CSE • Section A (Batch A-2)', department: 'Computer Science & Engineering' },
  '4PM25CS-L03': { usn: '4PM25CS-L03', name: 'BHARATH K N', batch: 'A2', section: 'CSE • Section A (Batch A-2)', department: 'Computer Science & Engineering' },
  '4PM25CS-L04': { usn: '4PM25CS-L04', name: 'GAJENDRA S', batch: 'A2', section: 'CSE • Section A (Batch A-2)', department: 'Computer Science & Engineering' },
  '4PM25CS-L05': { usn: '4PM25CS-L05', name: 'HARSHA B M', batch: 'A2', section: 'CSE • Section A (Batch A-2)', department: 'Computer Science & Engineering' },
  '4PM25CS-L06': { usn: '4PM25CS-L06', name: 'INCHARA P AKSHANTH', batch: 'A2', section: 'CSE • Section A (Batch A-2)', department: 'Computer Science & Engineering' },
  '4PM24CS132': { usn: '4PM24CS132', name: 'SANJAY M K', batch: 'A2', section: 'CSE • Section A (Batch A-2)', department: 'Computer Science & Engineering' },
};

/** Look up student record by USN */
export function findStudentByUsn(rawUsn: string | null | undefined): StudentRecord | null {
  if (!rawUsn) return null;
  const clean = rawUsn.trim().toUpperCase();
  if (MASTER_STUDENT_ROSTER[clean]) return MASTER_STUDENT_ROSTER[clean];

  const matchNum = clean.match(/^4PM25CS0*(\d+)$/i);
  if (matchNum) {
    const num = parseInt(matchNum[1]!, 10);
    const paddedUsn = `4PM25CS${String(num).padStart(3, '0')}`;
    if (MASTER_STUDENT_ROSTER[paddedUsn]) return MASTER_STUDENT_ROSTER[paddedUsn];

    const batch = num <= 33 ? 'A1' : 'A2';
    return {
      usn: paddedUsn,
      name: `Student ${paddedUsn}`,
      batch,
      section: `CSE • Section A (Batch ${batch === 'A1' ? 'A-1' : 'A-2'})`,
      department: 'Computer Science & Engineering',
    };
  }

  return null;
}

export function isUsnInBuiltinRange(rawUsn: string | null | undefined): boolean {
  return findStudentByUsn(rawUsn) !== null;
}

export interface BuiltinTimetableBundle {
  subjects: Subject[];
  slots: RecurringSlot[];
  notes: string;
  semesterName: string;
}

/**
 * Generates official Semester III Section A subjects & slots
 * tailored for Batch A-1 or Batch A-2.
 */
export function generateBuiltinSemester3Data(
  semesterId: string = 'sem-iii-2026',
  batch: 'A1' | 'A2' = 'A2',
): BuiltinTimetableBundle {
  const now = nowInstant();

  const rawSubjects: Array<{
    code: string;
    name: string;
    shortName: string;
    faculty: string;
    room: string;
    type: ClassType;
    color: SubjectColorKey;
  }> = [
    { code: 'OOPS', name: 'Object Oriented Programming', shortName: 'OOPS', faculty: 'Mrs Manjula H', room: 'E201', type: 'theory', color: 'indigo' },
    { code: 'DS', name: 'Data Structures', shortName: 'DS', faculty: 'Ms Vinutha H M', room: 'E201', type: 'theory', color: 'sky' },
    { code: 'M3', name: 'Mathematics III', shortName: 'M3', faculty: 'Ms Vandana shetty', room: 'E201', type: 'theory', color: 'emerald' },
    { code: 'DDCO', name: 'Digital Design & Computer Org.', shortName: 'DDCO', faculty: 'Mrs. Yashaswini N G', room: 'E201', type: 'theory', color: 'amber' },
    { code: 'OS', name: 'Operating Systems', shortName: 'OS', faculty: 'Mr. Maruthi S T', room: 'E201', type: 'theory', color: 'violet' },
    { code: 'OOPS-LAB', name: 'OOPS Laboratory', shortName: 'OOPS LAB', faculty: 'Mrs Manjula H', room: 'CC LAB 1', type: 'lab', color: 'indigo' },
    { code: 'DS-LAB', name: 'Data Structures Laboratory', shortName: 'DS LAB', faculty: 'Ms Vinutha H M', room: 'CC LAB 2', type: 'lab', color: 'sky' },
    { code: 'GIT-LAB', name: 'Git & GitHub Laboratory', shortName: 'GIT LAB', faculty: 'Mr Rajesh T H', room: 'CC LAB 3', type: 'lab', color: 'rose' },
    { code: 'COMM-PROJ', name: 'Community Project', shortName: 'COMM. PRO.', faculty: 'Mr. Maruthi S T', room: 'E201', type: 'theory', color: 'emerald' },
  ];

  const subjects: Subject[] = rawSubjects.map((s) => ({
    id: `subj-${s.code.toLowerCase()}`,
    semesterId,
    name: s.name,
    shortName: s.shortName,
    subjectCode: s.code,
    faculty: s.faculty,
    defaultRoom: s.room,
    classType: s.type,
    attendanceCountMode: 'period',
    targetPercentage: null,
    colorKey: s.color,
    archived: false,
    createdAt: now,
    updatedAt: now,
  }));

  const subjMap = new Map<string, Subject>();
  subjects.forEach((sub) => subjMap.set(sub.subjectCode!, sub));

  const slotDrafts: Array<{
    day: DayOfWeek;
    start: string;
    end: string;
    code?: string;
    isBreak?: boolean;
    label?: string;
    periodCount?: number;
  }> = [
    // --- Monday ---
    { day: 1, start: '08:00', end: '09:00', code: 'OOPS' },
    { day: 1, start: '09:00', end: '10:00', code: 'DS' },
    { day: 1, start: '10:00', end: '10:30', isBreak: true, label: 'Morning Break' },
    { day: 1, start: '10:30', end: '11:30', code: 'OS' },
    { day: 1, start: '11:30', end: '12:30', code: 'DDCO' },
    { day: 1, start: '12:30', end: '13:30', isBreak: true, label: 'Lunch Break' },
    { day: 1, start: '13:30', end: '14:30', code: 'M3' },

    // --- Tuesday ---
    { day: 2, start: '08:00', end: '09:00', code: 'OS' },
    { day: 2, start: '09:00', end: '10:00', code: 'DDCO' },
    { day: 2, start: '10:00', end: '10:30', isBreak: true, label: 'Morning Break' },
    { day: 2, start: '10:30', end: '11:30', code: 'DS' },
    { day: 2, start: '11:30', end: '12:30', code: 'M3' },
    { day: 2, start: '12:30', end: '13:30', isBreak: true, label: 'Lunch Break' },
    { day: 2, start: '13:30', end: '14:30', code: 'OOPS' },
    { day: 2, start: '14:30', end: '15:30', code: 'COMM-PROJ' },

    // --- Wednesday ---
    { day: 3, start: '08:00', end: '09:00', code: 'M3' },
    { day: 3, start: '09:00', end: '10:00', code: 'DS' },
    { day: 3, start: '10:00', end: '10:30', isBreak: true, label: 'Morning Break' },
    { day: 3, start: '10:30', end: '11:30', code: 'OOPS' },
    { day: 3, start: '11:30', end: '12:30', code: 'DDCO' },
    { day: 3, start: '12:30', end: '13:30', isBreak: true, label: 'Lunch Break' },
    batch === 'A1'
      ? { day: 3, start: '13:30', end: '14:30', code: 'GIT-LAB', periodCount: 1 }
      : { day: 3, start: '13:30', end: '15:30', code: 'OOPS-LAB', periodCount: 2 },

    // --- Thursday ---
    { day: 4, start: '08:00', end: '09:00', code: 'M3' },
    { day: 4, start: '09:00', end: '10:00', code: 'DS' },
    { day: 4, start: '10:00', end: '10:30', isBreak: true, label: 'Morning Break' },
    { day: 4, start: '10:30', end: '12:30', code: batch === 'A1' ? 'DS-LAB' : 'GIT-LAB', periodCount: 2 },
    { day: 4, start: '12:30', end: '13:30', isBreak: true, label: 'Lunch Break' },

    // --- Friday ---
    { day: 5, start: '09:00', end: '10:00', code: 'OOPS' },
    { day: 5, start: '10:00', end: '10:30', isBreak: true, label: 'Morning Break' },
    { day: 5, start: '10:30', end: '11:30', code: 'M3' },
    { day: 5, start: '11:30', end: '12:30', code: 'OS' },
    { day: 5, start: '12:30', end: '13:30', isBreak: true, label: 'Lunch Break' },

    // --- Saturday ---
    { day: 6, start: '08:00', end: '09:00', code: 'DDCO' },
    { day: 6, start: '09:00', end: '10:00', code: 'OS' },
    { day: 6, start: '10:00', end: '10:30', isBreak: true, label: 'Morning Break' },
    { day: 6, start: '10:30', end: '12:30', code: batch === 'A1' ? 'OOPS-LAB' : 'DS-LAB', periodCount: 2 },
    { day: 6, start: '12:30', end: '13:30', isBreak: true, label: 'Lunch Break' },
  ];

  const slots: RecurringSlot[] = slotDrafts.map((d, index) => {
    const matched = d.code ? subjMap.get(d.code) : undefined;
    return {
      id: `slot-${batch.toLowerCase()}-${index + 1}`,
      timetableVersionId: 'ver-1',
      semesterId,
      subjectId: matched ? matched.id : `subj-auto-${index}`,
      dayOfWeek: d.day,
      startTime: d.start,
      endTime: d.end,
      room: matched?.defaultRoom ?? 'E201',
      facultyOverride: matched?.faculty ?? null,
      classType: matched?.classType ?? 'theory',
      periodCount: d.periodCount ?? 1,
      kind: d.isBreak ? 'break' : 'class',
      label: d.label ?? null,
      createdAt: now,
      updatedAt: now,
    };
  });

  return {
    subjects,
    slots,
    notes: `Official CSE Section A (Batch ${batch === 'A1' ? 'A-1' : 'A-2'}) Timetable`,
    semesterName: `Semester III (Batch ${batch === 'A1' ? 'A-1' : 'A-2'})`,
  };
}

export interface BuiltinSemester3Complete {
  semester: Semester;
  subjects: Subject[];
  version: TimetableVersion;
  slots: RecurringSlot[];
  occurrences: ClassOccurrence[];
}

export function getBuiltinSemester3Complete(
  userId: string = 'local',
  batch: 'A1' | 'A2' = 'A2',
): BuiltinSemester3Complete {
  const semesterId = 'sem-iii-2026';
  const versionId = 'ver-1';
  const now = nowInstant();

  const semester: Semester = {
    id: semesterId,
    userId,
    name: `Semester III - CSE Sec A (Batch ${batch === 'A1' ? 'A-1' : 'A-2'})`,
    startDate: '2026-09-15',
    endDate: '2027-02-15',
    isActive: true,
    archived: false,
    createdAt: now,
    updatedAt: now,
  };

  const data = generateBuiltinSemester3Data(semesterId, batch);

  const slots: RecurringSlot[] = data.slots.map((s, index) => ({
    ...s,
    id: `slot-sem3-${batch.toLowerCase()}-${index + 1}`,
    semesterId,
    timetableVersionId: versionId,
  }));

  const version: TimetableVersion = {
    id: versionId,
    semesterId,
    versionNumber: 1,
    label: `Official Semester III - Section A (Batch ${batch === 'A1' ? 'A-1' : 'A-2'})`,
    notes: `Official Section A Batch ${batch === 'A1' ? 'A-1' : 'A-2'} Timetable`,
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
