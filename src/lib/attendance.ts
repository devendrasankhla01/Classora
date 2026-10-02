/**
 * Classora attendance engine.
 *
 * This module is intentionally pure: it takes domain records and returns
 * numbers. No database, no React, no I/O — which is what makes it testable and
 * what lets the same maths power the dashboard, the subject pages, the
 * "Can I Skip" simulator and the leave planner.
 *
 * Core definitions (see README):
 *   P = confirmed attended units
 *   C = confirmed conducted units
 *   Attendance = P / C * 100        (never NaN, never Infinity)
 *
 * Class-state contribution to the calculation:
 *   present       → C += w, P += w
 *   absent        → C += w
 *   cancelled     → nothing        (not conducted)
 *   not_conducted → nothing
 *   holiday       → nothing
 *   replaced      → nothing (the replacement occurrence carries the weight)
 *   unmarked      → nothing to P/C; lowers Data Confidence instead
 */
import type {
  AttendanceRecord,
  AttendanceStatus,
  ClassOccurrence,
  DateKey,
  ScheduleStatus,
  Subject,
} from '@/types/domain';

/** Attendance health bands, used for colour + label everywhere in the UI. */
export type AttendanceHealth = 'safe' | 'warning' | 'critical' | 'no_data';

/** Occurrence states that can never contribute to attendance. */
const NON_COUNTABLE_STATUSES: ReadonlySet<ScheduleStatus> = new Set<ScheduleStatus>([
  'cancelled',
  'not_conducted',
  'holiday',
  'replaced',
]);

/** Round for display only — raw integer units are always kept internally. */
export function roundPercent(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function formatPercent(value: number | null, decimals = 1): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return `${roundPercent(value, decimals).toFixed(decimals)}%`;
}

/** A class that counts as "scheduled" (eligible for review / simulation). */
export function isCountable(occurrence: ClassOccurrence): boolean {
  return !NON_COUNTABLE_STATUSES.has(occurrence.scheduleStatus);
}

export function isPast(occurrence: ClassOccurrence, now: Date): boolean {
  return new Date(occurrence.endDateTime).getTime() <= now.getTime();
}

export function isInProgress(occurrence: ClassOccurrence, now: Date): boolean {
  const start = new Date(occurrence.startDateTime).getTime();
  const end = new Date(occurrence.endDateTime).getTime();
  const current = now.getTime();
  return current >= start && current < end;
}

/**
 * How many attendance units a class is worth.
 *
 * `session`-counted subjects (typically labs) always weigh 1, however many
 * periods they span; `period`-counted subjects weigh their period count.
 */
export function attendanceWeight(
  subject: Pick<Subject, 'attendanceCountMode'>,
  occurrence: Pick<ClassOccurrence, 'periodCount'>,
): number {
  const periods = Math.max(1, Math.round(occurrence.periodCount) || 1);
  return subject.attendanceCountMode === 'session' ? 1 : periods;
}

/** A single resolved (or unresolved) contribution to a subject's tally. */
export interface AttendanceUnit {
  occurrence: ClassOccurrence;
  status: AttendanceStatus;
  weight: number;
  date: DateKey;
}

export interface AttendanceSummary {
  /** Confirmed attended units (P). */
  attended: number;
  /** Confirmed conducted units (C). */
  conducted: number;
  /** Units lost to recorded absences (C - P). */
  missed: number;
  /** Past countable classes that are still unmarked. */
  unresolvedUnits: number;
  unresolvedClasses: number;
  /** Classes explicitly cancelled / not conducted / holiday — excluded. */
  cancelledClasses: number;
  /** P / C as a percentage, or `null` when nothing has been conducted yet. */
  percentage: number | null;
  /** Data Confidence: how complete historical marking is (0–100). */
  confidence: number;
  health: AttendanceHealth;
}

export interface AttendanceStatusResult {
  health: AttendanceHealth;
  label: string;
  /** Percentage points above (+) or below (–) the target. */
  margin: number;
}

/**
 * Status thresholds. Kept in one place so they are configurable and testable.
 *  - critical → below target
 *  - warning  → above target but within `warningBand` points, or no safe miss left
 *  - safe     → comfortable margin
 */
export const STATUS_THRESHOLDS = {
  /** Percentage-point band above the target that still reads as "warning". */
  warningBand: 5,
} as const;

export function classifyAttendance(
  percentage: number | null,
  target: number,
  safeMisses: number | null = null,
  band: number = STATUS_THRESHOLDS.warningBand,
): AttendanceStatusResult {
  const label = (health: AttendanceHealth) =>
    health === 'safe'
      ? 'Safe'
      : health === 'warning'
        ? 'Warning'
        : health === 'critical'
          ? 'Critical'
          : 'No data yet';

  if (percentage === null) {
    return { health: 'no_data', label: label('no_data'), margin: 0 };
  }

  const margin = roundPercent(percentage - target, 1);

  if (percentage < target) return { health: 'critical', label: label('critical'), margin };
  if (margin <= band || (safeMisses !== null && safeMisses <= 0)) {
    return { health: 'warning', label: label('warning'), margin };
  }
  return { health: 'safe', label: label('safe'), margin };
}

/** Percentage from raw counts. Safe for C = 0 (returns null, never NaN). */
export function percentageOf(attended: number, conducted: number): number | null {
  if (!Number.isFinite(conducted) || conducted <= 0) return null;
  return (attended / conducted) * 100;
}

/**
 * Aggregate raw attendance units into a summary.
 * `units` must already be filtered to the relevant scope (subject / semester).
 */
export function summarize(
  units: readonly AttendanceUnit[],
  target: number,
  today: DateKey,
): AttendanceSummary {
  let attended = 0;
  let conducted = 0;
  let unresolvedUnits = 0;
  let unresolvedClasses = 0;
  let cancelledClasses = 0;

  for (const unit of units) {
    if (!isCountable(unit.occurrence)) {
      cancelledClasses += 1;
      continue;
    }

    if (unit.status === 'present') {
      conducted += unit.weight;
      attended += unit.weight;
      continue;
    }
    if (unit.status === 'absent') {
      conducted += unit.weight;
      continue;
    }

    // Unmarked: only matters once the class is actually over.
    if (unit.date < today) {
      unresolvedUnits += unit.weight;
      unresolvedClasses += 1;
    } else if (unit.date === today) {
      // Today's unmarked classes are expected — they don't hurt confidence.
    }
  }

  const percentage = percentageOf(attended, conducted);
  const resolvedUnits = conducted + unresolvedUnits;
  const confidence = resolvedUnits > 0 ? (conducted / resolvedUnits) * 100 : 100;

  const health = classifyAttendance(percentage, target).health;

  return {
    attended,
    conducted,
    missed: conducted - attended,
    unresolvedUnits,
    unresolvedClasses,
    cancelledClasses,
    percentage,
    confidence: roundPercent(Math.min(100, Math.max(0, confidence)), 0),
    health,
  };
}

/** Build attendance units from occurrences + their (optional) records. */
export function buildUnits(
  occurrences: readonly ClassOccurrence[],
  records: readonly AttendanceRecord[],
  weightOf: (occurrence: ClassOccurrence) => number = (o) => Math.max(1, o.periodCount),
): AttendanceUnit[] {
  const byOccurrence = new Map<string, AttendanceRecord>();
  for (const record of records) byOccurrence.set(record.occurrenceId, record);

  return occurrences.map((occurrence) => {
    const record = byOccurrence.get(occurrence.id);
    return {
      occurrence,
      status: record?.status ?? 'unmarked',
      weight: record?.weight ?? weightOf(occurrence),
      date: occurrence.date,
    };
  });
}

/* ------------------------------------------------------------------ *
 * Projection simulator                                                *
 * ------------------------------------------------------------------ */

export interface Projection {
  attended: number;
  conducted: number;
  percentage: number | null;
  /** Change in percentage points compared with the current value. */
  delta: number;
  safeMisses: number;
}

export interface SimulationContext {
  summary: AttendanceSummary;
  target: number;
  /**
   * Weights of the subject's upcoming countable classes, in chronological
   * order. Required for accurate safe-miss / recovery simulation, because a
   * 2-period lab consumes two units of buffer, not one.
   */
  upcomingWeights: readonly number[];
}

/** Simulate the outcome of marking the next class present / absent. */
export function projectWithNextClass(
  context: SimulationContext,
  status: Extract<AttendanceStatus, 'present' | 'absent'>,
  weightOverride?: number,
): Projection {
  const weight = weightOverride ?? context.upcomingWeights[0] ?? 1;
  const attended = context.summary.attended + (status === 'present' ? weight : 0);
  const conducted = context.summary.conducted + weight;
  const percentage = percentageOf(attended, conducted);
  return {
    attended,
    conducted,
    percentage,
    delta: roundPercent((percentage ?? 0) - (context.summary.percentage ?? 0), 1),
    safeMisses: safeMissesAfter(context, { attended, conducted }, weight, status),
  };
}

function safeMissesAfter(
  context: SimulationContext,
  base: { attended: number; conducted: number },
  consumedWeight: number,
  consumedStatus: 'present' | 'absent',
): number {
  const remaining = consumedStatus === 'absent' ? context.upcomingWeights.slice(1) : context.upcomingWeights;
  return countSafeMisses(base, remaining, context.target);
}

/**
 * How many further *absences* (in units, respecting lab weights) the student
 * can take before dropping below the target. Simulated, never negative.
 */
export function countSafeMisses(
  base: { attended: number; conducted: number },
  upcomingWeights: readonly number[],
  target: number,
): number {
  if (!Number.isFinite(target) || target <= 0) return 0;

  let attended = base.attended;
  let conducted = base.conducted;
  let safe = 0;

  for (const weight of upcomingWeights) {
    const nextConducted = conducted + weight;
    const nextPercentage = percentageOf(attended, nextConducted);
    if (nextPercentage === null) break;
    if (nextPercentage < target) break;
    conducted = nextConducted;
    safe += 1;
  }

  return safe;
}

export function safeMisses(context: SimulationContext): number {
  return countSafeMisses(
    { attended: context.summary.attended, conducted: context.summary.conducted },
    context.upcomingWeights,
    context.target,
  );
}

export interface RecoveryPlan {
  /** Attended units that must be added consecutively. */
  units: number;
  /** Whole classes that must be attended (weight-aware). */
  classes: number;
  /** Attendance percentage after completing the plan, or null if unreachable. */
  projected: number | null;
  /** True when the upcoming schedule cannot lift the subject back to target. */
  unreachable: boolean;
}

/**
 * Minimum consecutive classes the student must attend to climb back to target.
 * Simulated over the real upcoming weights (a 2-period lab recovers faster).
 */
export function recoveryPlan(context: SimulationContext): RecoveryPlan {
  const { summary, target } = context;

  if (summary.percentage !== null && summary.percentage >= target) {
    return { units: 0, classes: 0, projected: summary.percentage, unreachable: false };
  }

  let attended = summary.attended;
  let conducted = summary.conducted;
  let units = 0;
  let classes = 0;

  for (const weight of context.upcomingWeights) {
    attended += weight;
    conducted += weight;
    units += weight;
    classes += 1;
    const percentage = percentageOf(attended, conducted);
    if (percentage !== null && percentage >= target) {
      return { units, classes, projected: percentage, unreachable: false };
    }
  }

  const best = percentageOf(attended, conducted);
  return { units, classes, projected: best, unreachable: true };
}

/* ------------------------------------------------------------------ *
 * Recovery forecast                                                   *
 * ------------------------------------------------------------------ */

export interface RecoveryForecast {
  /** Date on which the subject is projected to return to target. */
  date: DateKey | null;
  classesNeeded: number;
  /** Percentage once recovered. */
  projected: number | null;
  unreachable: boolean;
}

/**
 * Iterate the subject's real upcoming occurrences, assuming perfect attendance,
 * and report the date attendance is projected to reach the target.
 */
export function recoveryForecast(
  context: SimulationContext,
  upcoming: readonly { date: DateKey; weight: number }[],
): RecoveryForecast {
  const { summary, target } = context;

  if (summary.percentage !== null && summary.percentage >= target) {
    return { date: null, classesNeeded: 0, projected: summary.percentage, unreachable: false };
  }

  let attended = summary.attended;
  let conducted = summary.conducted;

  for (let index = 0; index < upcoming.length; index += 1) {
    const item = upcoming[index]!;
    attended += item.weight;
    conducted += item.weight;
    const percentage = percentageOf(attended, conducted);
    if (percentage !== null && percentage >= target) {
      return {
        date: item.date,
        classesNeeded: index + 1,
        projected: percentage,
        unreachable: false,
      };
    }
  }

  return { date: null, classesNeeded: upcoming.length, projected: null, unreachable: true };
}

/* ------------------------------------------------------------------ *
 * Aggregate (all subjects)                                            *
 * ------------------------------------------------------------------ */

export interface AggregateStats {
  attended: number;
  conducted: number;
  missed: number;
  percentage: number | null;
  confidence: number;
  health: AttendanceHealth;
}

export function aggregate(
  summaries: readonly AttendanceSummary[],
  target: number,
): AggregateStats {
  let attended = 0;
  let conducted = 0;
  let unresolved = 0;

  for (const summary of summaries) {
    attended += summary.attended;
    conducted += summary.conducted;
    unresolved += summary.unresolvedUnits;
  }

  const percentage = percentageOf(attended, conducted);
  const resolved = conducted + unresolved;

  return {
    attended,
    conducted,
    missed: conducted - attended,
    percentage,
    confidence: resolved > 0 ? roundPercent((conducted / resolved) * 100, 0) : 100,
    health: classifyAttendance(percentage, target).health,
  };
}

/* ------------------------------------------------------------------ *
 * Leave simulation                                                    *
 * ------------------------------------------------------------------ */

export interface LeaveSimulationLine {
  subjectId: string;
  subjectName: string;
  shortName: string;
  before: number | null;
  after: number | null;
  delta: number;
  healthBefore: AttendanceHealth;
  healthAfter: AttendanceHealth;
  classes: number;
  units: number;
}

export interface LeaveSimulationResult {
  date: DateKey;
  lines: LeaveSimulationLine[];
  totalClasses: number;
  /** Subjects below target once the leave is applied (includes ones already below). */
  belowTargetAfter: string[];
  /** Subjects the leave would newly push below target. */
  newlyBreaking: string[];
}

export interface LeaveSimulationInput {
  subject: Pick<Subject, 'id' | 'name' | 'shortName' | 'targetPercentage'>;
  summary: AttendanceSummary;
  /** Weighted units of the classes affected by the leave window. */
  affectedUnits: number;
  globalTarget: number;
}

/**
 * Simulate a set of absences WITHOUT persisting anything.
 * Never returns a wrong-ish number: percentages are recomputed from raw units.
 */
export function simulateLeave(
  date: DateKey,
  inputs: readonly LeaveSimulationInput[],
): LeaveSimulationResult {
  const lines: LeaveSimulationLine[] = inputs
    .filter((input) => input.affectedUnits > 0)
    .map((input) => {
      const target = input.subject.targetPercentage ?? input.globalTarget;
      const { attended, conducted } = input.summary;
      const afterConducted = conducted + input.affectedUnits;
      const after = percentageOf(attended, afterConducted);
      const before = input.summary.percentage;

      return {
        subjectId: input.subject.id,
        subjectName: input.subject.name,
        shortName: input.subject.shortName,
        before,
        after,
        delta: roundPercent((after ?? 0) - (before ?? 0), 1),
        healthBefore: classifyAttendance(before, target).health,
        healthAfter: classifyAttendance(after, target).health,
        classes: input.affectedUnits,
        units: input.affectedUnits,
      };
    });

  return {
    date,
    lines,
    totalClasses: lines.reduce((sum, line) => sum + line.classes, 0),
    belowTargetAfter: lines
      .filter((line) => line.healthAfter === 'critical')
      .map((line) => line.subjectName),
    newlyBreaking: lines
      .filter((line) => line.healthAfter === 'critical' && line.healthBefore !== 'critical')
      .map((line) => line.subjectName),
  };
}

/* ------------------------------------------------------------------ *
 * Data confidence (semester-wide)                                     *
 * ------------------------------------------------------------------ */

/**
 * How complete historical attendance marking is:
 * resolved past countable classes / all past possibly-countable classes.
 */
export function dataConfidence(
  occurrences: readonly ClassOccurrence[],
  records: readonly AttendanceRecord[],
  today: DateKey,
): { percent: number; missingClasses: number } {
  const marked = new Set(records.map((record) => record.occurrenceId));

  /** Past classes that required a decision: countable + explicitly not held. */
  let decisionsRequired = 0;
  /** Past classes the student has already resolved (marked or marked not-held). */
  let decisionsMade = 0;
  /** Past countable classes with no attendance status yet. */
  let missingClasses = 0;

  for (const occurrence of occurrences) {
    if (occurrence.date >= today) continue;
    // Replaced originals are superseded by the replacement occurrence.
    if (occurrence.scheduleStatus === 'replaced') continue;

    if (!isCountable(occurrence)) {
      // Cancelled / not conducted / holiday — explicitly resolved, no marking.
      decisionsRequired += 1;
      decisionsMade += 1;
      continue;
    }

    decisionsRequired += 1;
    if (marked.has(occurrence.id)) {
      decisionsMade += 1;
    } else {
      missingClasses += 1;
    }
  }

  const percent = decisionsRequired > 0 ? (decisionsMade / decisionsRequired) * 100 : 100;

  return {
    percent: roundPercent(Math.min(100, Math.max(0, percent)), 0),
    missingClasses,
  };
}
