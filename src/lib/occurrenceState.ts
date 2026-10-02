/**
 * The lifecycle state of a dated class, derived from the clock and its
 * attendance record. Used for status chips across Home, Timetable and history.
 */
import type { AttendanceStatus, ClassOccurrence } from '@/types/domain';
import type { ChipTone } from '@/components/ui/chips';

export type OccurrenceState =
  | 'completed'
  | 'in_progress'
  | 'upcoming'
  | 'unmarked'
  | 'cancelled'
  | 'not_conducted'
  | 'holiday'
  | 'replaced';

export interface OccurrenceStateInfo {
  state: OccurrenceState;
  label: string;
  tone: ChipTone;
  icon?: string;
}

export function occurrenceState(
  occurrence: ClassOccurrence,
  now: Date,
  attendanceStatus?: AttendanceStatus,
): OccurrenceStateInfo {
  switch (occurrence.scheduleStatus) {
    case 'cancelled':
      return { state: 'cancelled', label: 'Cancelled', tone: 'cancelled', icon: 'block' };
    case 'not_conducted':
      return { state: 'not_conducted', label: 'Not Conducted', tone: 'cancelled', icon: 'do_not_disturb_on' };
    case 'holiday':
      return { state: 'holiday', label: 'Holiday', tone: 'neutral', icon: 'beach_access' };
    case 'replaced':
      return { state: 'replaced', label: 'Replaced', tone: 'neutral', icon: 'swap_horiz' };
    default:
      break;
  }

  const start = new Date(occurrence.startDateTime).getTime();
  const end = new Date(occurrence.endDateTime).getTime();
  const current = now.getTime();

  if (current < start) {
    return occurrence.occurrenceType === 'extra'
      ? { state: 'upcoming', label: 'Extra Class', tone: 'upcoming', icon: 'add_circle' }
      : occurrence.occurrenceType === 'replacement'
        ? { state: 'upcoming', label: 'Replacement', tone: 'upcoming', icon: 'swap_horiz' }
        : { state: 'upcoming', label: 'Upcoming', tone: 'upcoming' };
  }

  if (current >= start && current < end) {
    return { state: 'in_progress', label: 'In Progress', tone: 'brand', icon: 'schedule' };
  }

  if (attendanceStatus === 'present') {
    return { state: 'completed', label: 'Present', tone: 'completed', icon: 'check_circle' };
  }
  if (attendanceStatus === 'absent') {
    return { state: 'completed', label: 'Absent', tone: 'critical', icon: 'cancel' };
  }
  return { state: 'unmarked', label: 'Unmarked', tone: 'warning', icon: 'error' };
}

/** True when the class is finished and still needs a decision. */
export function needsReview(occurrence: ClassOccurrence, now: Date, attendanceStatus?: AttendanceStatus): boolean {
  const info = occurrenceState(occurrence, now, attendanceStatus);
  return info.state === 'unmarked';
}
