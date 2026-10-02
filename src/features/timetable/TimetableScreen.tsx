import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useClassora } from '@/app/store';
import { useNow } from '@/hooks/useScheduleData';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card, SectionHeader } from '@/components/ui/Card';
import { DateStrip } from '@/components/ui/DateStrip';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Button } from '@/components/ui/controls';
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
 * Timetable — daily timeline (default) and weekly overview, both driven by the
 * materialised class occurrences for the active semester.
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

      <div className="space-y-5 px-5">
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
              <div className="flex items-center gap-2.5 rounded-block bg-brand-50 px-3.5 py-3">
                <Icon name="info" size={17} className="text-brand-600" />
                <p className="text-[12.5px] font-semibold text-brand-700">
                  {dayOverride.kind === 'holiday'
                    ? dayOverride.label ?? 'College holiday'
                    : dayOverride.kind === 'no_class'
                      ? dayOverride.label ?? 'No classes today'
                      : dayOverride.label ?? 'Special schedule'}
                </p>
              </div>
            ) : null}

            <section>
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
                      className="inline-flex min-h-[36px] items-center gap-1.5 text-[13px] font-bold text-brand-700"
                    >
                      <Icon name="edit_calendar" size={16} />
                      Modify Day
                    </button>
                  </div>
                }
              />

              {dayOccurrences.length === 0 ? (
                <Card>
                  <EmptyState
                    icon="event_available"
                    title="Your schedule is clear"
                    message="No classes on this date. Add a custom lecture if the timetable changed."
                    action={
                      <Button icon="add" onClick={() => openModify()}>
                        Add Custom Lecture
                      </Button>
                    }
                  />
                </Card>
              ) : (
                <Timeline
                  occurrences={dayOccurrences}
                  breaks={dayBreaks}
                  now={now}
                  onModify={(occurrence) => openModify(occurrence)}
                />
              )}
            </section>

            <div className="flex justify-center pb-2">
              <Button icon="add" block onClick={() => openModify()}>
                Add Custom Lecture
              </Button>
            </div>
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

        <Card className="!p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] bg-brand-50 text-brand-600">
              <Icon name="auto_awesome" size={19} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-bold">Import a timetable with AI</p>
              <p className="text-[12.5px] text-ink-secondary">
                Upload a PDF, photo or screenshot and review the extracted classes.
              </p>
            </div>
            <Link
              to="/timetable/import"
              className="grid h-10 w-10 place-items-center rounded-full bg-brand-600 text-white"
              aria-label="Import timetable"
            >
              <Icon name="arrow_forward" size={18} />
            </Link>
          </div>
        </Card>
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
          <Card key={date} className="!p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-[15px] font-bold">{WEEKDAY_LABELS[index]}</span>
                <span className="text-[12.5px] text-ink-secondary">{formatMediumDate(date)}</span>
              </div>
              <button
                type="button"
                onClick={() => onSelectDate(date)}
                className="text-[12.5px] font-bold text-brand-700"
              >
                Open day
              </button>
            </div>

            {dayOccurrences.length === 0 ? (
              <p className="mt-2.5 text-[13px] text-ink-muted">No classes.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {dayOccurrences.map((occurrence) => {
                  const subject = subjects.find((item) => item.id === occurrence.subjectId);
                  return (
                    <li
                      key={occurrence.id}
                      className="flex items-center gap-3 rounded-block bg-surface-muted px-3 py-2.5"
                    >
                      <span
                        className="h-8 w-1 rounded-full"
                        style={{ backgroundColor: subject?.colorKey === 'rose' ? '#F87171' : '#6366F1' }}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-semibold">
                          {subject?.shortName ?? 'Class'}
                        </span>
                        <span className="block text-[11.5px] text-ink-secondary">
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
          </Card>
        );
      })}

      <p className="px-1 pb-2 text-center text-[12px] text-ink-muted">
        Showing {formatMediumDate(days[0]!)} – {formatMediumDate(addDaysToKey(days[0]!, 5))}
      </p>
    </div>
  );
}
