import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { cn } from '@/lib/cn';
import { useClassora } from '@/app/store';
import { useConfidence, useMissingAttendance, useNow } from '@/hooks/useScheduleData';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card, SectionHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/controls';
import { Icon } from '@/components/ui/Icon';
import { StatusChip } from '@/components/ui/chips';
import { EmptyState } from '@/components/ui/feedback';
import { SubjectGlyph } from '@/components/ui/SubjectGlyph';
import { attendanceWeight } from '@/lib/attendance';
import { formatLongDate, formatRelativeDayLabel, formatTimeRange, todayKey } from '@/lib/date';
import type { AttendanceStatus, ClassOccurrence } from '@/types/domain';

type Decision = Extract<AttendanceStatus, 'present' | 'absent'>;

/**
 * Bulk review: the answer to "did anything slip through?". Every unmarked past
 * class is listed with one-tap present/absent and a bulk action per day, which
 * is what keeps Data Confidence honest.
 */
export function ReviewAttendanceScreen() {
  const missing = useMissingAttendance();
  const subjects = useClassora((state) => state.subjects);
  const reviewMissing = useClassora((state) => state.reviewMissing);
  const cancelClass = useClassora((state) => state.cancelClass);
  const markAttendance = useClassora((state) => state.markAttendance);
  const navigate = useNavigate();
  useNow();

  const confidence = useConfidence();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const grouped = useMemo(() => {
    const byDate = new Map<string, ClassOccurrence[]>();
    for (const occurrence of missing) {
      const bucket = byDate.get(occurrence.date) ?? [];
      bucket.push(occurrence);
      byDate.set(occurrence.date, bucket);
    }
    return [...byDate.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, items]) => ({
        date,
        items: items.sort((a, b) => a.startTime.localeCompare(b.startTime)),
      }));
  }, [missing]);

  const allIds = useMemo(() => missing.map((item) => item.id), [missing]);
  const selectedIds = useMemo(() => allIds.filter((id) => selected.has(id)), [allIds, selected]);

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /** Points at stake: how much confidence this single review would restore. */
  const reviewableUnits = useMemo(
    () =>
      missing.reduce((total, occurrence) => {
        const subject = subjects.find((item) => item.id === occurrence.subjectId);
        return total + (subject ? attendanceWeight(subject, occurrence) : Math.max(1, occurrence.periodCount));
      }, 0),
    [missing, subjects],
  );

  const applyBulk = async (action: Decision) => {
    const ids = selectedIds.length > 0 ? selectedIds : allIds;
    if (ids.length === 0) return;
    setSelected(new Set());
    await reviewMissing(ids, action);
  };

  const today = todayKey();

  return (
    <>
      <AppHeader
        title="Review Attendance"
        subtitle={`${missing.length} unmarked ${missing.length === 1 ? 'class' : 'classes'}`}
        showActions={false}
        leading={
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="grid h-11 w-11 place-items-center rounded-full bg-surface text-ink shadow-ambient ring-1 ring-black/[0.04]"
          >
            <Icon name="arrow_back" size={19} />
          </button>
        }
      />

      <div className="space-y-4 px-5">
        <Card className="!bg-warning-50/70">
          <div className="flex gap-3">
            <Icon name="fact_check" size={19} className="mt-0.5 shrink-0 text-warning-600" />
            <div>
              <p className="text-[13px] font-bold text-warning-700">
                Data Confidence {confidence.percent}% — {reviewableUnits}{' '}
                {reviewableUnits === 1 ? 'attendance unit' : 'attendance units'} unresolved
              </p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-warning-700/90">
                These classes are in the past but never marked. They are left out of your percentage rather than
                guessed, so marking them now sharpens every projection in the app.
              </p>
            </div>
          </div>
        </Card>

        {missing.length === 0 ? (
          <Card>
            <EmptyState
              icon="task_alt"
              title="Everything is marked"
              message="There are no unmarked past classes. Your Data Confidence is at its highest."
              action={
                <Button variant="secondary" icon="arrow_back" onClick={() => navigate('/attendance')}>
                  Back to attendance
                </Button>
              }
            />
          </Card>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip
                tone={selected.size > 0 ? 'brand' : 'neutral'}
                label={selected.size > 0 ? `${selected.size} selected` : 'Select classes below'}
                showDot={false}
              />
              {selected.size > 0 ? (
                <button
                  type="button"
                  onClick={() => setSelected(new Set())}
                  className="text-[12.5px] font-semibold text-ink-secondary"
                >
                  Clear
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelected(new Set(allIds))}
                  className="text-[12.5px] font-semibold text-brand-700"
                >
                  Select all {allIds.length}
                </button>
              )}
            </div>

            {grouped.map((group) => (
              <Card key={group.date}>
                <SectionHeader
                  title={formatLongDate(group.date)}
                  subtitle={`${formatRelativeDayLabel(group.date)} · ${group.items.length} unmarked`}
                  action={
                    <button
                      type="button"
                      onClick={() => void Promise.all(group.items.map((item) => markAttendance(item.id, 'present')))}
                      className="text-[12px] font-bold text-brand-700"
                    >
                      All present
                    </button>
                  }
                />

                <ul className="space-y-2">
                  {group.items.map((occurrence) => {
                    const subject = subjects.find((item) => item.id === occurrence.subjectId);
                    const isSelected = selected.has(occurrence.id);
                    const weight = subject
                      ? attendanceWeight(subject, occurrence)
                      : Math.max(1, occurrence.periodCount);

                    return (
                      <li
                        key={occurrence.id}
                        className={cn(
                          'rounded-block border p-3.5 transition',
                          isSelected ? 'border-brand-500 bg-brand-50/50' : 'border-black/[0.06] bg-surface',
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            aria-label={isSelected ? 'Deselect class' : 'Select class'}
                            aria-pressed={isSelected}
                            onClick={() => toggle(occurrence.id)}
                            className={cn(
                              'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-[6px] border transition',
                              isSelected ? 'border-brand-600 bg-brand-600 text-white' : 'border-black/20 bg-white',
                            )}
                          >
                            {isSelected ? <Icon name="check" size={13} /> : null}
                          </button>

                          {subject ? <SubjectGlyph subject={subject} size={38} /> : null}

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[14px] font-bold">{subject?.name ?? 'Class'}</p>
                            <p className="mt-0.5 text-[12px] text-ink-secondary">
                              {formatTimeRange(occurrence.startTime, occurrence.endTime)}
                              {occurrence.room ? ` • ${occurrence.room}` : ''}
                              {weight > 1 ? ` • ${weight} periods` : ''}
                            </p>
                            {occurrence.date < today ? (
                              <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-ink-muted">
                                <Icon name="history" size={12} />
                                {formatRelativeDayLabel(occurrence.date)}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => void markAttendance(occurrence.id, 'present')}
                            className="flex-1 rounded-pill bg-safe-50 py-2.5 text-[12.5px] font-bold text-safe-700 transition active:scale-[0.98]"
                          >
                            Present
                          </button>
                          <button
                            type="button"
                            onClick={() => void markAttendance(occurrence.id, 'absent')}
                            className="flex-1 rounded-pill bg-critical-50 py-2.5 text-[12.5px] font-bold text-critical-600 transition active:scale-[0.98]"
                          >
                            Absent
                          </button>
                          <button
                            type="button"
                            aria-label="This class did not happen"
                            onClick={() =>
                              void cancelClass({ occurrenceId: occurrence.id, reason: 'Not conducted' })
                            }
                            className="rounded-pill bg-surface-sunken px-3.5 py-2.5 text-[12.5px] font-bold text-ink-secondary transition active:scale-[0.98]"
                          >
                            Not held
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            ))}

            <div className="space-y-2.5 pb-2">
              <Button block icon="check_circle" onClick={() => void applyBulk('present')}>
                Mark {selectedIds.length > 0 ? selectedIds.length : allIds.length} present
              </Button>
              <Button
                block
                variant="secondary"
                icon="cancel"
                onClick={() => void applyBulk('absent')}
              >
                Mark {selectedIds.length > 0 ? selectedIds.length : allIds.length} absent
              </Button>
              <p className="px-1 text-center text-[11.5px] text-ink-muted">
                {selectedIds.length > 0
                  ? 'Applies only to the classes you selected.'
                  : 'Nothing is selected, so the bulk action applies to every unmarked class listed above.'}
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
