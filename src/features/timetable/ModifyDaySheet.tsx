import { useMemo, useState } from 'react';

import { useClassora } from '@/app/store';
import { useActiveSubjects } from '@/hooks/useClassoraData';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button, Field, SelectInput, TextInput } from '@/components/ui/controls';
import { Icon } from '@/components/ui/Icon';
import { StatusChip } from '@/components/ui/chips';
import { formatMediumDate, timeToMinutes } from '@/lib/date';
import { findConflictFor } from '@/lib/schedule';
import type { CalendarOverride, ClassOccurrence, DateKey, DayOfWeek } from '@/types/domain';

type Mode =
  | 'menu'
  | 'extra'
  | 'replace'
  | 'cancel'
  | 'time'
  | 'room'
  | 'follow'
  | 'holiday'
  | 'no_class';

const WEEKDAYS: { value: DayOfWeek; label: string }[] = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

interface ModifyDaySheetProps {
  open: boolean;
  onClose: () => void;
  date: DateKey;
  /** When opened from a specific class card, that class is pre-selected. */
  occurrence?: ClassOccurrence | null;
}

/**
 * "Modify Day" — every action writes a change for the selected date only and
 * never rewrites the repeating weekly template.
 */
export function ModifyDaySheet({ open, onClose, date, occurrence }: ModifyDaySheetProps) {
  const [mode, setMode] = useState<Mode>('menu');
  const [selectedId, setSelectedId] = useState<string | null>(occurrence?.id ?? null);

  const reset = () => {
    setMode('menu');
    setSelectedId(occurrence?.id ?? null);
  };

  const close = () => {
    reset();
    onClose();
  };

  return (
    <BottomSheet
      open={open}
      onClose={close}
      title={mode === 'menu' ? 'Modify Day' : undefined}
      description={mode === 'menu' ? `${formatMediumDate(date)} — changes apply to this date only.` : undefined}
    >
      {mode === 'menu' ? (
        <div className="space-y-2 pt-2">
          <ActionRow icon="add_circle" label="Add Extra Class" hint="One-off lecture or lab" onClick={() => setMode('extra')} />
          <ActionRow
            icon="swap_horiz"
            label="Replace Class"
            hint="Another subject takes this slot"
            onClick={() => setMode('replace')}
          />
          <ActionRow
            icon="block"
            label="Cancel Class"
            hint="Remains in history, never counted"
            onClick={() => setMode('cancel')}
          />
          <ActionRow icon="schedule" label="Change Time" hint="Temporary shift for this date" onClick={() => setMode('time')} />
          <ActionRow icon="meeting_room" label="Change Room" hint="Room swap for this date" onClick={() => setMode('room')} />
          <div className="!mt-4 border-t border-black/[0.05] pt-4">
            <ActionRow
              icon="calendar_view_week"
              label="Follow Another Day"
              hint="Run Monday's timetable today"
              onClick={() => setMode('follow')}
            />
            <ActionRow
              icon="beach_access"
              label="Mark No-Class Day"
              hint="No classes, nothing counted"
              onClick={() => setMode('no_class')}
            />
            <ActionRow
              icon="event_busy"
              label="Mark College Holiday"
              hint="Department or college holiday"
              onClick={() => setMode('holiday')}
            />
          </div>
        </div>
      ) : null}

      {mode !== 'menu' ? (
        <div className="pt-1">
          <button
            type="button"
            onClick={reset}
            className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-secondary"
          >
            <Icon name="arrow_back" size={16} />
            Back
          </button>

          {mode === 'extra' ? <ExtraClassForm date={date} onDone={close} /> : null}
          {mode === 'replace' ? (
            <ReplaceForm date={date} selectedId={selectedId} onSelect={setSelectedId} onDone={close} />
          ) : null}
          {mode === 'cancel' ? (
            <CancelForm date={date} selectedId={selectedId} onSelect={setSelectedId} onDone={close} />
          ) : null}
          {mode === 'time' ? (
            <TimeForm date={date} selectedId={selectedId} onSelect={setSelectedId} onDone={close} />
          ) : null}
          {mode === 'room' ? (
            <RoomForm date={date} selectedId={selectedId} onSelect={setSelectedId} onDone={close} />
          ) : null}
          {mode === 'follow' ? <FollowDayForm date={date} onDone={close} /> : null}
          {mode === 'holiday' || mode === 'no_class' ? (
            <DayOverrideForm
              date={date}
              kind={mode === 'holiday' ? 'holiday' : 'no_class'}
              onDone={close}
            />
          ) : null}
        </div>
      ) : null}
    </BottomSheet>
  );
}

function ActionRow({
  icon,
  label,
  hint,
  onClick,
}: {
  icon: string;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3.5 rounded-block bg-surface p-3.5 text-left shadow-ambient ring-1 ring-black/[0.03] transition active:scale-[0.99]"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] bg-brand-50 text-brand-600">
        <Icon name={icon} size={19} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] font-bold text-ink">{label}</span>
        <span className="block text-[12.5px] text-ink-secondary">{hint}</span>
      </span>
      <Icon name="chevron_right" size={20} className="text-ink-muted" />
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * Forms                                                               *
 * ------------------------------------------------------------------ */

function useDayOccurrences(date: DateKey): ClassOccurrence[] {
  const occurrences = useClassora((state) => state.occurrences);
  return useMemo(
    () =>
      occurrences
        .filter((occurrence) => occurrence.date === date)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [occurrences, date],
  );
}

function OccurrencePicker({
  occurrences,
  selectedId,
  onSelect,
}: {
  occurrences: ClassOccurrence[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const subjects = useClassora((state) => state.subjects);

  if (occurrences.length === 0) {
    return (
      <p className="rounded-block bg-surface-sunken p-4 text-[13px] text-ink-secondary">
        There are no classes on this date to change.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {occurrences.map((occurrence) => {
        const subject = subjects.find((item) => item.id === occurrence.subjectId);
        const selected = occurrence.id === selectedId;
        return (
          <button
            key={occurrence.id}
            type="button"
            onClick={() => onSelect(occurrence.id)}
            aria-pressed={selected}
            className={
              selected
                ? 'flex w-full items-center justify-between gap-3 rounded-block border-2 border-brand-500 bg-brand-50/50 p-3.5 text-left'
                : 'flex w-full items-center justify-between gap-3 rounded-block border-2 border-transparent bg-surface p-3.5 text-left shadow-ambient ring-1 ring-black/[0.03]'
            }
          >
            <span className="min-w-0">
              <span className="block text-[14.5px] font-bold text-ink">
                {subject?.shortName ?? 'Class'} · {occurrence.startTime}–{occurrence.endTime}
              </span>
              <span className="block text-[12.5px] text-ink-secondary">
                {occurrence.room ?? 'Room TBA'}
                {occurrence.scheduleStatus !== 'scheduled' ? ` • ${occurrence.scheduleStatus}` : ''}
              </span>
            </span>
            {selected ? <StatusChip tone="brand" label="Selected" /> : null}
          </button>
        );
      })}
    </div>
  );
}

function ExtraClassForm({ date, onDone }: { date: DateKey; onDone: () => void }) {
  const subjects = useActiveSubjects();
  const occurrences = useDayOccurrences(date);
  const addExtraClass = useClassora((state) => state.addExtraClass);
  const announce = useClassora((state) => state.announce);

  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? '');
  const [startTime, setStartTime] = useState('15:00');
  const [endTime, setEndTime] = useState('16:00');
  const [room, setRoom] = useState('');
  const [conflict, setConflict] = useState<ClassOccurrence | null>(null);
  const [error, setError] = useState<string | null>(null);

  const subject = subjects.find((item) => item.id === subjectId);
  const periodCount = Math.max(1, Math.round((timeToMinutes(endTime) - timeToMinutes(startTime)) / 60));

  const save = async (force = false) => {
    setError(null);
    if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      setError('The end time must be after the start time.');
      return;
    }
    if (!subjectId) {
      setError('Choose a subject for this class.');
      return;
    }

    const clash = findConflictFor(
      { id: 'new', date, startTime, endTime },
      occurrences.filter((occurrence) => occurrence.scheduleStatus !== 'cancelled'),
    );

    if (clash && !force) {
      setConflict(clash);
      return;
    }

    await addExtraClass({
      subjectId,
      date,
      startTime,
      endTime,
      room: room.trim() || subject?.defaultRoom || null,
      classType: subject?.classType ?? 'theory',
      periodCount,
    });
    onDone();
  };

  return (
    <div className="space-y-3.5">
      <h3 className="text-[17px] font-bold">Add Extra Class</h3>
      <Field label="Subject">
        <SelectInput value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
          {subjects.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </SelectInput>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start">
          <TextInput type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
        </Field>
        <Field label="End">
          <TextInput type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
        </Field>
      </div>
      <Field label="Room" hint="Leave blank to use the subject's usual room">
        <TextInput
          value={room}
          placeholder={subject?.defaultRoom ?? 'e.g. C-203'}
          onChange={(event) => setRoom(event.target.value)}
        />
      </Field>
      <p className="text-[12px] text-ink-muted">
        Counts as {periodCount} {periodCount === 1 ? 'period' : 'periods'}. Extra classes never change the
        repeating timetable.
      </p>

      {error ? <p className="text-[12.5px] font-semibold text-critical-600">{error}</p> : null}

      {conflict ? (
        <div className="rounded-block border border-warning-500/30 bg-warning-50 p-3.5">
          <p className="text-[13px] font-bold text-warning-700">Schedule conflict</p>
          <p className="mt-1 text-[12.5px] text-warning-700/90">
            {conflict.room ?? 'Another class'} already exists between {conflict.startTime}–{conflict.endTime}{' '}
            on this date.
          </p>
          <div className="mt-3 flex gap-2">
            <Button variant="secondary" onClick={() => setConflict(null)}>
              Change time
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                void save(true);
                announce({ message: 'Added despite the overlap', tone: 'warning' });
              }}
            >
              Add anyway
            </Button>
          </div>
        </div>
      ) : (
        <Button block icon="add" onClick={() => void save()}>
          Add class to {formatMediumDate(date)}
        </Button>
      )}
    </div>
  );
}

function ReplaceForm({
  date,
  selectedId,
  onSelect,
  onDone,
}: {
  date: DateKey;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDone: () => void;
}) {
  const occurrences = useDayOccurrences(date);
  const subjects = useActiveSubjects();
  const replaceClass = useClassora((state) => state.replaceClass);
  const [subjectId, setSubjectId] = useState('');

  const selected = occurrences.find((occurrence) => occurrence.id === selectedId) ?? null;

  return (
    <div className="space-y-3.5">
      <h3 className="text-[17px] font-bold">Replace Class</h3>
      <p className="text-[12.5px] text-ink-secondary">
        The original class stays in history as <span className="font-semibold">replaced</span> and is never
        counted. The substitute subject receives the attendance.
      </p>
      <OccurrencePicker occurrences={occurrences} selectedId={selectedId} onSelect={onSelect} />
      <Field label="Replace with">
        <SelectInput value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
          <option value="">Choose a subject…</option>
          {subjects
            .filter((subject) => subject.id !== selected?.subjectId)
            .map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
        </SelectInput>
      </Field>
      <Button
        block
        icon="swap_horiz"
        disabled={!selected || !subjectId}
        onClick={() => {
          if (!selected || !subjectId) return;
          void replaceClass({ occurrenceId: selected.id, subjectId });
          onDone();
        }}
      >
        Replace for this date
      </Button>
    </div>
  );
}

function CancelForm({
  date,
  selectedId,
  onSelect,
  onDone,
}: {
  date: DateKey;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDone: () => void;
}) {
  const occurrences = useDayOccurrences(date);
  const cancelClass = useClassora((state) => state.cancelClass);
  const [reason, setReason] = useState('Faculty unavailable');
  const [notConducted, setNotConducted] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const selected = occurrences.find((occurrence) => occurrence.id === selectedId) ?? null;
  const hasRecord = useClassora((state) =>
    state.attendance.some((record) => record.occurrenceId === selectedId),
  );

  return (
    <div className="space-y-3.5">
      <h3 className="text-[17px] font-bold">Cancel Class</h3>
      <OccurrencePicker occurrences={occurrences} selectedId={selectedId} onSelect={onSelect} />
      <Field label="Reason" hint="Optional — shown in the class history">
        <SelectInput value={reason} onChange={(event) => setReason(event.target.value)}>
          <option value="Faculty unavailable">Faculty unavailable</option>
          <option value="College event">College event</option>
          <option value="Other">Other</option>
        </SelectInput>
      </Field>
      <label className="flex items-center gap-2.5 text-[13px] font-medium text-ink-secondary">
        <input
          type="checkbox"
          checked={notConducted}
          onChange={(event) => setNotConducted(event.target.checked)}
          className="h-4 w-4 rounded border-black/20"
        />
        The class was not conducted at all
      </label>

      {hasRecord ? (
        <div className="rounded-block border border-critical-500/25 bg-critical-50 p-3.5">
          <p className="text-[13px] font-bold text-critical-700">Attendance already recorded</p>
          <p className="mt-1 text-[12.5px] text-critical-700/90">
            Cancelling removes this class from your attendance calculation. An audit entry is kept.
          </p>
        </div>
      ) : null}

      {confirming ? (
        <div className="flex gap-2">
          <Button variant="secondary" block onClick={() => setConfirming(false)}>
            Keep as is
          </Button>
          <Button
            variant="danger"
            block
            onClick={() => {
              if (!selected) return;
              void cancelClass({ occurrenceId: selected.id, reason, notConducted });
              onDone();
            }}
          >
            Confirm cancel
          </Button>
        </div>
      ) : (
        <Button
          block
          variant="secondary"
          icon="block"
          disabled={!selected}
          onClick={() => (hasRecord ? setConfirming(true) : selected && void cancelClass({ occurrenceId: selected.id, reason, notConducted }) || onDone())}
        >
          Cancel this class
        </Button>
      )}
    </div>
  );
}

function TimeForm({
  date,
  selectedId,
  onSelect,
  onDone,
}: {
  date: DateKey;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDone: () => void;
}) {
  const occurrences = useDayOccurrences(date);
  const changeOccurrenceTime = useClassora((state) => state.changeOccurrenceTime);
  const selected = occurrences.find((occurrence) => occurrence.id === selectedId) ?? null;
  const [startTime, setStartTime] = useState(selected?.startTime ?? '10:00');
  const [endTime, setEndTime] = useState(selected?.endTime ?? '11:00');
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-3.5">
      <h3 className="text-[17px] font-bold">Change Time</h3>
      <OccurrencePicker
        occurrences={occurrences}
        selectedId={selectedId}
        onSelect={(id) => {
          onSelect(id);
          const next = occurrences.find((occurrence) => occurrence.id === id);
          if (next) {
            setStartTime(next.startTime);
            setEndTime(next.endTime);
          }
        }}
      />
      <div className="grid grid-cols-2 gap-3">
        <Field label="New start">
          <TextInput type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
        </Field>
        <Field label="New end">
          <TextInput type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
        </Field>
      </div>
      {error ? <p className="text-[12.5px] font-semibold text-critical-600">{error}</p> : null}
      <p className="text-[12px] text-ink-muted">Applies to this date only. Future weeks keep the template.</p>
      <Button
        block
        icon="schedule"
        disabled={!selected}
        onClick={() => {
          if (!selected) return;
          if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
            setError('The end time must be after the start time.');
            return;
          }
          void changeOccurrenceTime(selected.id, startTime, endTime);
          onDone();
        }}
      >
        Update this date
      </Button>
    </div>
  );
}

function RoomForm({
  date,
  selectedId,
  onSelect,
  onDone,
}: {
  date: DateKey;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDone: () => void;
}) {
  const occurrences = useDayOccurrences(date);
  const changeOccurrenceRoom = useClassora((state) => state.changeOccurrenceRoom);
  const selected = occurrences.find((occurrence) => occurrence.id === selectedId) ?? null;
  const [room, setRoom] = useState(selected?.room ?? '');

  return (
    <div className="space-y-3.5">
      <h3 className="text-[17px] font-bold">Change Room</h3>
      <OccurrencePicker
        occurrences={occurrences}
        selectedId={selectedId}
        onSelect={(id) => {
          onSelect(id);
          const next = occurrences.find((occurrence) => occurrence.id === id);
          setRoom(next?.room ?? '');
        }}
      />
      <Field label="New room">
        <TextInput value={room} placeholder="e.g. C-108" onChange={(event) => setRoom(event.target.value)} />
      </Field>
      <Button
        block
        icon="meeting_room"
        disabled={!selected || room.trim().length === 0}
        onClick={() => {
          if (!selected) return;
          void changeOccurrenceRoom(selected.id, room.trim());
          onDone();
        }}
      >
        Update this date
      </Button>
    </div>
  );
}

function FollowDayForm({ date, onDone }: { date: DateKey; onDone: () => void }) {
  const markDayOverride = useClassora((state) => state.markDayOverride);
  const slots = useClassora((state) => state.slots);
  const subjects = useClassora((state) => state.subjects);
  const [day, setDay] = useState<DayOfWeek>(1);

  const preview = slots
    .filter((slot) => slot.kind === 'class' && slot.dayOfWeek === day)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div className="space-y-3.5">
      <h3 className="text-[17px] font-bold">Follow Another Day</h3>
      <p className="text-[12.5px] text-ink-secondary">
        Useful for working Saturdays and schedule swaps. Only this date changes — the weekly template is not
        touched.
      </p>
      <Field label="Follow timetable of">
        <SelectInput value={day} onChange={(event) => setDay(Number(event.target.value) as DayOfWeek)}>
          {WEEKDAYS.map((weekday) => (
            <option key={weekday.value} value={weekday.value}>
              {weekday.label}
            </option>
          ))}
        </SelectInput>
      </Field>

      <div className="rounded-block bg-surface p-3.5 shadow-ambient ring-1 ring-black/[0.03]">
        <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-muted">
          Preview · {preview.length} {preview.length === 1 ? 'class' : 'classes'}
        </p>
        <ul className="mt-2 space-y-1.5">
          {preview.length === 0 ? (
            <li className="text-[13px] text-ink-secondary">No classes configured for that day.</li>
          ) : (
            preview.map((slot) => (
              <li key={slot.id} className="flex items-center justify-between text-[13px]">
                <span className="font-semibold text-ink">
                  {subjects.find((subject) => subject.id === slot.subjectId)?.shortName ?? 'Class'}
                </span>
                <span className="tabular-nums text-ink-secondary">
                  {slot.startTime}–{slot.endTime}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>

      <Button
        block
        icon="calendar_view_week"
        disabled={preview.length === 0}
        onClick={() => {
          void markDayOverride({
            date,
            kind: 'working_saturday',
            followDayOfWeek: day,
            label: `Follows ${WEEKDAYS.find((weekday) => weekday.value === day)?.label}`,
          });
          onDone();
        }}
      >
        Apply to {formatMediumDate(date)}
      </Button>
    </div>
  );
}

function DayOverrideForm({
  date,
  kind,
  onDone,
}: {
  date: DateKey;
  kind: Extract<CalendarOverride['kind'], 'holiday' | 'no_class'>;
  onDone: () => void;
}) {
  const markDayOverride = useClassora((state) => state.markDayOverride);
  const clearDayOverride = useClassora((state) => state.clearDayOverride);
  const existing = useClassora((state) => state.overrides.find((override) => override.date === date) ?? null);
  const [label, setLabel] = useState('');

  const isHoliday = kind === 'holiday';

  return (
    <div className="space-y-3.5">
      <h3 className="text-[17px] font-bold">{isHoliday ? 'Mark College Holiday' : 'Mark No-Class Day'}</h3>
      <p className="text-[12.5px] text-ink-secondary">
        Nothing on this date counts towards attendance and no reminders are sent. Existing records are kept in
        history.
      </p>
      <Field label="Label" hint="Shown on the calendar and in the timetable">
        <TextInput
          value={label}
          placeholder={isHoliday ? 'e.g. Independence Day' : 'e.g. Mid-semester break'}
          onChange={(event) => setLabel(event.target.value)}
        />
      </Field>
      <Button
        block
        icon={isHoliday ? 'event_busy' : 'beach_access'}
        onClick={() => {
          void markDayOverride({
            date,
            kind,
            label: label.trim() || (isHoliday ? 'College holiday' : 'No classes'),
          });
          onDone();
        }}
      >
        Apply to {formatMediumDate(date)}
      </Button>
      {existing ? (
        <Button
          block
          variant="secondary"
          onClick={() => {
            void clearDayOverride(date);
            onDone();
          }}
        >
          Remove existing override
        </Button>
      ) : null}
    </div>
  );
}
