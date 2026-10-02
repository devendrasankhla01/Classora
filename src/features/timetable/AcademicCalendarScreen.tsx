import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { cn } from '@/lib/cn';
import { useClassora } from '@/app/store';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card, SectionHeader } from '@/components/ui/Card';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button, Field, SelectInput, TextInput } from '@/components/ui/controls';
import { Icon } from '@/components/ui/Icon';
import { StatusChip } from '@/components/ui/chips';
import { useActiveSubjects } from '@/hooks/useClassoraData';
import {
  addDaysToKey,
  dayOfWeekOf,
  formatLongDate,
  formatMonthShort,
  formatWeekdayShort,
  todayKey,
} from '@/lib/date';
import { slotsForDate } from '@/lib/schedule';
import type { CalendarOverride, DateKey, DayOfWeek } from '@/types/domain';

type OverrideKind = CalendarOverride['kind'];

const KIND_META: Record<OverrideKind, { label: string; icon: string; tone: string; hint: string }> = {
  holiday: {
    label: 'Holiday',
    icon: 'beach_access',
    tone: 'bg-brand-50 text-brand-700',
    hint: 'College closed — scheduled classes are excluded from attendance.',
  },
  no_class: {
    label: 'No classes',
    icon: 'do_not_disturb_on',
    tone: 'bg-warning-50 text-warning-700',
    hint: 'Day off for you only — nothing is counted.',
  },
  working_saturday: {
    label: 'Working Saturday',
    icon: 'event_available',
    tone: 'bg-safe-50 text-safe-700',
    hint: 'Runs another weekday’s timetable on this Saturday.',
  },
  follow_day: {
    label: 'Follow another day',
    icon: 'content_copy',
    tone: 'bg-violet-50 text-violet-700',
    hint: 'Swap this day’s schedule for another weekday’s.',
  },
  custom_schedule: {
    label: 'Custom schedule',
    icon: 'edit_calendar',
    tone: 'bg-sky-50 text-sky-700',
    hint: 'Hand-built day — use Modify Day for the timings.',
  },
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Academic calendar: holidays, no-class days, working Saturdays and
 * follow-another-day overrides. Each change re-materialises only that date.
 */
export function AcademicCalendarScreen() {
  const navigate = useNavigate();
  const overrides = useClassora((state) => state.overrides);
  const occurrences = useClassora((state) => state.occurrences);
  const slots = useClassora((state) => state.slots);
  const semester = useClassora((state) => state.semester);
  const markDayOverride = useClassora((state) => state.markDayOverride);
  const clearDayOverride = useClassora((state) => state.clearDayOverride);
  const subjects = useActiveSubjects();

  const today = todayKey();
  const [editing, setEditing] = useState<DateKey | null>(null);
  const [draftKind, setDraftKind] = useState<OverrideKind>('holiday');
  const [draftFollow, setDraftFollow] = useState<DayOfWeek>(1);
  const [draftLabel, setDraftLabel] = useState('');

  const upcoming = useMemo(() => {
    const byDate = new Map<DateKey, { date: DateKey; kinds: CalendarOverride[]; classes: number }>();

    for (const day of Array.from({ length: 91 }, (_, index) => addDaysToKey(today, index))) {
      if (semester && (day < semester.startDate || day > semester.endDate)) continue;
      const dayOverrides = overrides.filter((item) => item.date === day);
      const { slots: daySlots } = slotsForDate(day, slots.filter((slot) => slot.kind === 'class'), overrides);
      const classes = occurrences.filter((item) => item.date === day && item.scheduleStatus !== 'cancelled').length;
      if (dayOverrides.length === 0 && classes === 0) continue;
      byDate.set(day, { date: day, kinds: dayOverrides, classes: daySlots.length || classes });
    }

    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [overrides, occurrences, slots, semester, today]);

  const activeOverride = editing ? overrides.find((item) => item.date === editing) ?? null : null;

  const openDay = (date: DateKey) => {
    const existing = overrides.find((item) => item.date === date) ?? null;
    setDraftKind(existing?.kind === 'custom_schedule' ? 'follow_day' : existing?.kind ?? 'holiday');
    setDraftFollow(existing?.followDayOfWeek ?? dayOfWeekOf(date));
    setDraftLabel(existing?.label ?? '');
    setEditing(date);
  };

  const counts = useMemo(
    () => ({
      holidays: overrides.filter((item) => item.kind === 'holiday').length,
      noClass: overrides.filter((item) => item.kind === 'no_class').length,
      saturdays: overrides.filter((item) => item.kind === 'working_saturday').length,
      totalClasses: occurrences.filter((item) => item.date >= today && item.scheduleStatus !== 'cancelled').length,
    }),
    [overrides, occurrences, today],
  );

  return (
    <>
      <AppHeader title="Academic Calendar" subtitle="Holidays & working days" />

      <div className="space-y-4 px-5">
        <div className="grid grid-cols-3 gap-2.5">
          <Stat label="Holidays" value={String(counts.holidays)} icon="beach_access" />
          <Stat label="No class" value={String(counts.noClass)} icon="do_not_disturb_on" />
          <Stat label="Working Sat" value={String(counts.saturdays)} icon="event_available" />
        </div>

        <Card className="!bg-brand-50/50">
          <div className="flex gap-3">
            <Icon name="info" size={19} className="mt-0.5 shrink-0 text-brand-600" />
            <p className="text-[12.5px] leading-relaxed text-ink-secondary">
              A holiday or no-class day never counts against you — those classes are excluded from the
              attendance maths entirely, and past marks are untouched.
            </p>
          </div>
        </Card>

        <section>
          <SectionHeader
            title="Next 90 days"
            subtitle={`${upcoming.length} scheduled ${upcoming.length === 1 ? 'day' : 'days'} · tap a day to change it`}
            action={
              <button
                type="button"
                className="text-[12.5px] font-bold text-brand-700"
                onClick={() => openDay(today)}
              >
                Mark today
              </button>
            }
          />

          <ul className="space-y-2.5">
            {upcoming.slice(0, 40).map((day) => {
              const dayNumber = day.date.slice(-2);
              const override = day.kinds[0] ?? null;
              const meta = override ? KIND_META[override.kind] : null;
              return (
                <li key={day.date}>
                  <button
                    type="button"
                    onClick={() => openDay(day.date)}
                    className="flex w-full items-center gap-3.5 rounded-card bg-surface p-4 text-left shadow-ambient ring-1 ring-black/[0.03] transition active:scale-[0.995]"
                  >
                    <span
                      className={cn(
                        'grid h-12 w-12 shrink-0 place-items-center rounded-[14px]',
                        meta ? meta.tone : 'bg-surface-sunken text-ink-secondary',
                      )}
                    >
                      <span className="text-center leading-none">
                        <span className="block text-[15px] font-extrabold">{dayNumber}</span>
                        <span className="block text-[10px] font-bold uppercase tracking-wide">
                          {formatMonthShort(day.date)}
                        </span>
                      </span>
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="text-[14px] font-bold">
                          {formatWeekdayShort(day.date)}, {formatLongDate(day.date)}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-[12px] text-ink-secondary">
                        {meta ? meta.label : `${day.classes} ${day.classes === 1 ? 'class' : 'classes'}`}
                        {override?.followDayOfWeek !== null && override?.followDayOfWeek !== undefined
                          ? ` · follows ${DAY_NAMES[override.followDayOfWeek]}`
                          : ''}
                        {override?.label ? ` · ${override.label}` : ''}
                      </span>
                    </span>

                    {override ? (
                      <StatusChip tone={override.kind === 'holiday' ? 'brand' : 'warning'} label={DAY_NAMES[dayOfWeekOf(day.date)].slice(0, 3)} showDot={false} />
                    ) : null}
                    <Icon name="chevron_right" size={18} className="shrink-0 text-ink-muted" />
                  </button>
                </li>
              );
            })}
          </ul>

          {upcoming.length === 0 ? (
            <Card>
              <p className="text-[13px] text-ink-secondary">
                No classes scheduled in the next 90 days. Import a timetable to populate the calendar.
              </p>
            </Card>
          ) : null}
        </section>

        <div className="grid grid-cols-2 gap-2.5 pb-2">
          <Button variant="secondary" icon="upload_file" onClick={() => navigate('/timetable/import')}>
            Import timetable
          </Button>
          <Button variant="secondary" icon="history" onClick={() => navigate('/timetable/versions')}>
            Versions
          </Button>
        </div>
      </div>

      {/* Day editor ----------------------------------------------------- */}
      <BottomSheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing ? formatLongDate(editing) : ''}
        description={`${formatWeekdayShort(editing ?? today)} · ${subjects.length} subjects in the syllabus`}
        footer={
          <div className="flex gap-2">
            {activeOverride ? (
              <Button
                variant="ghost"
                icon="restart_alt"
                onClick={() => {
                  const date = editing;
                  setEditing(null);
                  if (date) void clearDayOverride(date);
                }}
              >
                Reset day
              </Button>
            ) : null}
            <Button
              block
              icon="check"
              onClick={() => {
                const date = editing;
                setEditing(null);
                if (!date) return;
                const needsFollowDay = draftKind === 'follow_day' || draftKind === 'working_saturday';
                void markDayOverride({
                  date,
                  kind: needsFollowDay ? 'follow_day' : draftKind,
                  followDayOfWeek: needsFollowDay ? draftFollow : null,
                  label: draftLabel.trim().length > 0 ? draftLabel.trim() : null,
                });
              }}
            >
              Save day
            </Button>
          </div>
        }
      >
        <div className="space-y-3.5 pt-1">
          <Field label="Day type">
            <SelectInput value={draftKind} onChange={(event) => setDraftKind(event.target.value as OverrideKind)}>
              <option value="holiday">Holiday — college closed</option>
              <option value="no_class">No classes for me</option>
              <option value="follow_day">Follow another weekday</option>
              <option value="working_saturday">Working Saturday</option>
            </SelectInput>
          </Field>

          {draftKind === 'follow_day' || draftKind === 'working_saturday' ? (
            <Field label="Which day's timetable?" hint="Handy for working Saturdays and swapped days">
              <SelectInput
                value={String(draftFollow)}
                onChange={(event) => setDraftFollow(Number(event.target.value) as DayOfWeek)}
              >
                {DAY_NAMES.map((name, index) => (
                  <option key={name} value={index}>
                    {name}
                  </option>
                ))}
              </SelectInput>
            </Field>
          ) : null}

          <Field label="Note" hint="Optional — shown in the calendar list">
            <TextInput
              value={draftLabel}
              onChange={(event) => setDraftLabel(event.target.value)}
              placeholder={
                draftKind === 'working_saturday' ? 'Mid-semester working Saturday' : 'e.g. Founder’s Day'
              }
            />
          </Field>

          <div className="rounded-block bg-surface-muted p-3.5">
            <p className="text-[12.5px] font-bold text-ink">
              {KIND_META[draftKind].label}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-secondary">
              {KIND_META[draftKind].hint}
            </p>
          </div>

          <p className="text-[11.5px] text-ink-muted">
            The change applies to {formatLongDate(editing ?? today)} only. Occurrences already marked keep their
            attendance records.
          </p>
        </div>
      </BottomSheet>
    </>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="rounded-card bg-surface p-3.5 shadow-ambient ring-1 ring-black/[0.03]">
      <Icon name={icon} size={18} className="text-ink-muted" />
      <p className="mt-2 text-[19px] font-extrabold leading-none tabular-nums">{value}</p>
      <p className="mt-1 text-[11px] font-semibold text-ink-secondary">{label}</p>
    </div>
  );
}
