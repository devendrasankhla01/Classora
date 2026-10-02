/**
 * Date & time helpers.
 *
 * Classora deliberately treats a class as belonging to a *local calendar day*.
 * Everything user-facing is keyed by `DateKey` ("yyyy-MM-dd") or `TimeKey`
 * ("HH:mm") so a class at 08:00 on 2 October stays on 2 October regardless of
 * the viewer's timezone, and midnight boundaries can never shift a record.
 */
import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  parse,
  startOfWeek,
  subDays,
} from 'date-fns';

import type { DateKey, DayOfWeek, Instant, TimeKey } from '@/types/domain';

const DATE_KEY_FORMAT = 'yyyy-MM-dd';
const TIME_KEY_FORMAT = 'HH:mm';

export function toDateKey(date: Date): DateKey {
  return format(date, DATE_KEY_FORMAT);
}

export function fromDateKey(key: DateKey): Date {
  return parse(key, DATE_KEY_FORMAT, new Date());
}

export function toTimeKey(date: Date): TimeKey {
  return format(date, TIME_KEY_FORMAT);
}

/** Minutes since local midnight for a `HH:mm` value. */
export function timeToMinutes(time: TimeKey): number {
  const [hours, minutes] = time.split(':');
  return Number(hours ?? 0) * 60 + Number(minutes ?? 0);
}

/** Build a local `Date` for a date key + time key (no UTC parsing involved). */
export function toLocalDateTime(date: DateKey, time: TimeKey): Date {
  const base = fromDateKey(date);
  const minutes = timeToMinutes(time);
  base.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return base;
}

export function toInstant(date: DateKey, time: TimeKey): Instant {
  return toLocalDateTime(date, time).toISOString();
}

export function dayOfWeekOf(date: DateKey): DayOfWeek {
  return fromDateKey(date).getDay() as DayOfWeek;
}

export function todayKey(now: Date = new Date()): DateKey {
  return toDateKey(now);
}

export function nowTimeKey(now: Date = new Date()): TimeKey {
  return toTimeKey(now);
}

/** Monday-first week containing `date`. */
export function weekRange(date: Date): { start: Date; end: Date; days: Date[] } {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = endOfWeek(date, { weekStartsOn: 1 });
  return { start, end, days: eachDayOfInterval({ start, end }) };
}

export function addDaysToKey(key: DateKey, amount: number): DateKey {
  return toDateKey(addDays(fromDateKey(key), amount));
}

export function subDaysFromKey(key: DateKey, amount: number): DateKey {
  return toDateKey(subDays(fromDateKey(key), amount));
}

export function isToday(key: DateKey, now: Date = new Date()): boolean {
  return key === toDateKey(now);
}

export function isSameDateKey(a: DateKey, b: DateKey): boolean {
  return a === b;
}

export function isDateKeyWithin(key: DateKey, start: DateKey, end: DateKey): boolean {
  return key >= start && key <= end;
}

export function daysBetween(a: DateKey, b: DateKey): number {
  return differenceInCalendarDays(fromDateKey(b), fromDateKey(a));
}

export function sameCalendarDay(a: Date, b: Date): boolean {
  return isSameDay(a, b);
}

/** Inclusive list of date keys between two dates. */
export function dateKeyRange(start: DateKey, end: DateKey): DateKey[] {
  if (start > end) return [];
  return eachDayOfInterval({ start: fromDateKey(start), end: fromDateKey(end) }).map(toDateKey);
}

/** "10:00 AM" — the format used across the approved design. */
export function formatTimeLabel(time: TimeKey): string {
  return format(toLocalDateTime('2000-01-01', time), 'hh:mm a');
}

/** "10:00 – 11:00 AM" style range used on Home and Timetable cards. */
export function formatTimeRange(start: TimeKey, end: TimeKey): string {
  return `${formatTimeLabel(start)} – ${formatTimeLabel(end)}`;
}

/** "Thursday, 2 October" — Home header eyebrow. */
export function formatLongDate(date: DateKey): string {
  return format(fromDateKey(date), 'EEEE, d MMMM');
}

/** "Thu 02" — compact date strip labels. */
export function formatWeekdayShort(date: DateKey): string {
  return format(fromDateKey(date), 'EEE');
}

export function formatDayNumber(date: DateKey): string {
  return format(fromDateKey(date), 'dd');
}

export function formatMonthShort(date: DateKey): string {
  return format(fromDateKey(date), 'MMM');
}

export function formatMediumDate(date: DateKey): string {
  return format(fromDateKey(date), 'd MMM yyyy');
}

export function formatRelativeDayLabel(date: DateKey, now: Date = new Date()): string {
  const diff = differenceInCalendarDays(fromDateKey(date), now);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return format(fromDateKey(date), 'EEE, d MMM');
}

export function secondsUntil(target: Date, now: Date = new Date()): number {
  return Math.max(0, Math.round((target.getTime() - now.getTime()) / 1000));
}

/** "in 24 min" / "in 1 h 05 m" / "Now" — used by the Next Class engine. */
export function formatCountdown(seconds: number): string {
  if (seconds <= 0) return 'Now';
  const totalMinutes = Math.floor(seconds / 60);
  if (totalMinutes < 60) return `in ${Math.max(1, totalMinutes)} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `in ${hours} h` : `in ${hours} h ${String(minutes).padStart(2, '0')} m`;
}

export function greetingFor(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export function nowInstant(): Instant {
  return new Date().toISOString();
}
