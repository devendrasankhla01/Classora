import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useClassora } from '@/app/store';
import { useNow } from '@/hooks/useScheduleData';
import { AppHeader } from '@/components/layout/AppHeader';
import { SectionHeader } from '@/components/ui/Card';
import { DateStrip } from '@/components/ui/DateStrip';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { EmptyState } from '@/components/ui/feedback';
import { Icon } from '@/components/ui/Icon';
import { Pill, StatusChip } from '@/components/ui/chips';
import { Timeline } from './Timeline';
import { ModifyDaySheet } from './ModifyDaySheet';
import { addDaysToKey, dayOfWeekOf, formatMediumDate, formatTimeRange, todayKey, weekRange } from '@/lib/date';
import type { ClassOccurrence, DateKey } from '@/types/domain';

type View = 'daily' | 'weekly';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Timetable — Crafted with Tasknur style daily timeline & weekly overview.
 */
export function TimetableScreen() {
  const occurrences = useClassora((state) => state.occurrences);
  const slots = useClassora((state) => state.slots);
  const overrides = useClassora((state) => state.overrides);
  const now = useNow();

  const [view, setView] = useState<View>('daily');
  const [selectedDate, setSelectedDate] = useState<DateKey>(todayKey());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [targetOccurrence, setTargetOccurrence] = useState<ClassOccurrence | null>(null);

  const week = useMemo(() => weekRange(new Date(selectedDate)).days.map(todayKey), [selectedDate]);

  const datesWithClasses = useMemo(() => {
    const set = new Set<DateKey>();
    for (const occurrence of occurrences) set.add(occurrence.date);
    return set;
  }, [occurrences]);

  const dayOccurrences = useMemo(
    () =>
      occurrences
        .filter((occurrence) => occurrence.date === selectedDate)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [occurrences, selectedDate],
  );

  const dayBreaks = useMemo(
    () => slots.filter((slot) => slot.kind === 'break' && slot.dayOfWeek === dayOfWeekOf(selectedDate)),
    [slots, selectedDate],
  );

  const dayOverride = overrides.find((override) => override.date === selectedDate) ?? null;
  const sessionCount = dayOccurrences.filter((occurrence) => occurrence.scheduleStatus !== 'holiday').length;

  const openModify = (occurrence?: ClassOccurrence) => {
    setTargetOccurrence(occurrence ?? null);
    setSheetOpen(true);
  };

  return (
    <>
      <AppHeader
        title="Timetable"
        subtitle={selectedDate === todayKey() ? 'Today’s Schedule' : formatMediumDate(selectedDate)}
        showActions
      />

      <div className="space-y-5">
        <SegmentedControl<View>
          ariaLabel="Timetable view"
          value={view}
          onChange={setView}
          options={[
            { value: 'daily', label: 'Daily View' },
            { value: 'weekly', label: 'Weekly View' },
          ]}
        />

        {view === 'daily' ? (
          <>
            <DateStrip
              dates={week}
              value={selectedDate}
              onChange={setSelectedDate}
              activeDates={datesWithClasses}
            />

            {dayOverride ? (
              <div className="flex items-center gap-2.5 rounded-2xl bg-sky-50 px-4 py-3 border border-sky-100">
                <Icon name="info" size={18} className="text-[#38B6FF]" />
                <p className="text-xs font-extrabold text-sky-900">
                  {dayOverride.kind === 'holiday'
                    ? dayOverride.label ?? 'College holiday'
                    : dayOverride.kind === 'no_class'
                      ? dayOverride.label ?? 'No classes today'
                      : dayOverride.label ?? 'Special schedule'}
                </p>
              </div>
            ) : null}

            <section className="space-y-3">
              <SectionHeader
                title="Timeline"
                action={
                  <div className="flex items-center gap-3">
                    <Pill icon="event_note">
                      {sessionCount} {sessionCount === 1 ? 'Session' : 'Sessions'}
                    </Pill>
                    <button
                      type="button"
                      onClick={() => openModify()}
                      className="inline-flex min-h-[36px] items-center gap-1.5 text-xs font-extrabold text-[#38B6FF] hover:underline"
                    >
                      <Icon name="edit_calendar" size={16} />
                      Modify Day
                    </button>
                  </div>
                }
              />

              {dayOccurrences.length === 0 ? (
                <div className="neu-card rounded-3xl p-6 text-center">
                  <EmptyState
                    icon="event_available"
                    title="Your schedule is clear"
                    message="No classes on this date. Add a custom lecture if the timetable changed."
                    action={
                      <button
                        type="button"
                        onClick={() => openModify()}
                        className="neu-pill-btn inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-white font-extrabold text-xs active:scale-95"
                      >
                        <Icon name="add" size={18} />
                        Add Custom Lecture
                      </button>
                    }
                  />
                </div>
              ) : (
                <>
                  <Timeline
                    occurrences={dayOccurrences}
                    breaks={dayBreaks}
                    now={now}
                    onModify={(occurrence) => openModify(occurrence)}
                  />
                  <div className="flex justify-center pt-2 pb-2">
                    <button
                      type="button"
                      onClick={() => openModify()}
                      className="neu-pill-btn w-full sm:w-auto inline-flex justify-center items-center gap-2 px-6 py-3 rounded-2xl text-white font-extrabold text-xs active:scale-95"
                    >
                      <Icon name="add" size={18} />
                      Add Custom Lecture
                    </button>
                  </div>
                </>
              )}
            </section>
          </>
        ) : (
          <WeeklyView
            weekDates={week}
            onSelectDate={(date) => {
              setSelectedDate(date);
              setView('daily');
            }}
          />
        )}

        <div className="neu-card rounded-3xl p-5">
          <div className="flex items-center gap-3.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-sky-50 text-[#38B6FF] neu-btn-soft">
              <Icon name="auto_awesome" size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold text-slate-900">Import timetable with AI</p>
              <p className="text-xs text-slate-400 font-semibold">
                Upload a PDF, photo or screenshot and review extracted classes.
              </p>
            </div>
            <Link
              to="/timetable/import"
              className="neu-pill-btn grid h-10 w-10 shrink-0 place-items-center rounded-full text-white active:scale-95"
              aria-label="Import timetable"
            >
              <Icon name="arrow_forward" size={18} />
            </Link>
          </div>
        </div>
      </div>

      <ModifyDaySheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        date={selectedDate}
        occurrence={targetOccurrence}
      />
    </>
  );
}

function WeeklyView({
  weekDates,
  onSelectDate,
}: {
  weekDates: DateKey[];
  onSelectDate: (date: DateKey) => void;
}) {
  const occurrences = useClassora((state) => state.occurrences);
  const subjects = useClassora((state) => state.subjects);
  const days = weekDates.slice(0, 6);

  return (
    <div className="space-y-3">
      {days.map((date, index) => {
        const dayOccurrences = occurrences
          .filter((occurrence) => occurrence.date === date && occurrence.scheduleStatus !== 'holiday')
          .sort((a, b) => a.startTime.localeCompare(b.startTime));

        return (
          <div key={date} className="rounded-3xl bg-white p-4 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-extrabold text-slate-900">{WEEKDAY_LABELS[index]}</span>
                <span className="text-xs text-slate-400 font-semibold">{formatMediumDate(date)}</span>
              </div>
              <button
                type="button"
                onClick={() => onSelectDate(date)}
                className="text-xs font-extrabold text-[#38B6FF] hover:underline"
              >
                Open day
              </button>
            </div>

            {dayOccurrences.length === 0 ? (
              <p className="mt-2 text-xs text-slate-400 font-medium">No classes.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {dayOccurrences.map((occurrence) => {
                  const subject = subjects.find((item) => item.id === occurrence.subjectId);
                  return (
                    <li
                      key={occurrence.id}
                      className="flex items-center gap-3 rounded-2xl bg-[#F6F8FA] px-3.5 py-2.5"
                    >
                      <span
                        className="h-8 w-1.5 rounded-full"
                        style={{ backgroundColor: subject?.colorKey === 'rose' ? '#FF7657' : '#38B6FF' }}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-extrabold text-slate-900">
                          {subject?.shortName ?? 'Class'}
                        </span>
                        <span className="block text-[11px] font-semibold text-slate-400">
                          {formatTimeRange(occurrence.startTime, occurrence.endTime)}
                          {occurrence.room ? ` • ${occurrence.room}` : ''}
                        </span>
                      </span>
                      {occurrence.occurrenceType !== 'regular' ? (
                        <StatusChip
                          tone={occurrence.occurrenceType === 'extra' ? 'upcoming' : 'neutral'}
                          label={occurrence.occurrenceType === 'extra' ? 'Extra' : 'Replacement'}
                        />
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}

      <p className="px-1 pb-2 text-center text-xs text-slate-400 font-semibold">
        Showing {formatMediumDate(days[0]!)} – {formatMediumDate(addDaysToKey(days[0]!, 5))}
      </p>
    </div>
  );
}

