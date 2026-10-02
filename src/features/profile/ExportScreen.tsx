import { useMemo, useState } from 'react';

import { cn } from '@/lib/cn';
import { useClassora } from '@/app/store';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card, SectionHeader } from '@/components/ui/Card';
import { Button, Field, SelectInput } from '@/components/ui/controls';
import { Icon } from '@/components/ui/Icon';
import { Pill } from '@/components/ui/chips';
import { useActiveSubjects, useSemesterRange } from '@/hooks/useClassoraData';
import { useAggregateStats } from '@/hooks/useScheduleData';
import { formatMediumDate } from '@/lib/date';
import { formatPercent } from '@/lib/attendance';
import { files, share } from '@/platform';
import type { AttendanceStatus } from '@/types/domain';

type ExportFormat = 'csv' | 'json';
type CsvScope = 'all' | 'range';

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  unmarked: 'Unmarked',
};

/**
 * Export — a real CSV attendance statement and a complete JSON backup.
 * Everything is generated on-device from the records in the store.
 */
export function ExportScreen() {
  const profile = useClassora((state) => state.profile);
  const semester = useClassora((state) => state.semester);
  const subjects = useActiveSubjects();
  const occurrences = useClassora((state) => state.occurrences);
  const attendance = useClassora((state) => state.attendance);
  const versions = useClassora((state) => state.versions);
  const slots = useClassora((state) => state.slots);
  const overrides = useClassora((state) => state.overrides);
  const announce = useClassora((state) => state.announce);
  const range = useSemesterRange();

  const [format, setFormat] = useState<ExportFormat>('csv');
  const [scope, setScope] = useState<CsvScope>('all');
  const [busy, setBusy] = useState(false);

  const summary = useAggregateStats();

  const rows = useMemo(() => {
    return attendance
      .map((record) => {
        const occurrence = occurrences.find((item) => item.id === record.occurrenceId);
        if (!occurrence) return null;
        if (scope === 'range' && range) {
          if (occurrence.date < range.startDate || occurrence.date > range.endDate) return null;
        }
        const subject = subjects.find((item) => item.id === occurrence.subjectId);
        return {
          date: occurrence.date,
          day: new Date(`${occurrence.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' }),
          start: occurrence.startTime,
          end: occurrence.endTime,
          subject: subject?.name ?? 'Unknown',
          code: subject?.subjectCode ?? '',
          faculty: occurrence.facultyOverride ?? subject?.faculty ?? '',
          room: occurrence.room ?? subject?.defaultRoom ?? '',
          type: subject?.classType === 'lab' ? 'Lab' : 'Theory',
          status: STATUS_LABEL[record.status],
          weight: String(record.weight),
          note: occurrence.notes ?? '',
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
  }, [attendance, occurrences, subjects, scope, range]);

  const buildCsv = (): string => {
    const header = [
      'Date',
      'Day',
      'Start',
      'End',
      'Subject',
      'Code',
      'Faculty',
      'Room',
      'Type',
      'Status',
      'Attendance units',
      'Note',
    ];
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const body = rows.map((row) =>
      [
        row.date,
        row.day,
        row.start,
        row.end,
        row.subject,
        row.code,
        row.faculty,
        row.room,
        row.type,
        row.status,
        row.weight,
        row.note,
      ]
        .map(escape)
        .join(','),
    );

    const meta = [
      ['Classora attendance statement'],
      ['Student', profile?.name ?? ''],
      ['Student ID', profile?.studentId ?? ''],
      ['Semester', semester?.name ?? ''],
      ['Semester window', range ? `${range.startDate} to ${range.endDate}` : 'not set'],
      ['Target', `${profile?.attendanceTarget ?? 75}%`],
      ['Overall attendance', formatPercent(summary.percentage)],
      ['Attended / Conducted', `${summary.attended} / ${summary.conducted}`],
      [],
    ].map((line) => line.map(escape).join(','));

    return [...meta, header.map(escape).join(','), ...body].join('\r\n');
  };

  const buildJson = (): string =>
    JSON.stringify(
      {
        app: 'Classora',
        exportVersion: 1,
        exportedAt: new Date().toISOString(),
        profile,
        semester,
        subjects,
        timetableVersions: versions,
        recurringSlots: slots,
        occurrences,
        attendance,
        calendarOverrides: overrides,
      },
      null,
      2,
    );

  const filename = (extension: string, suffix: string) =>
    `classora-${suffix}-${new Date().toISOString().slice(0, 10)}.${extension}`;

  const runExport = async (mode: 'download' | 'share') => {
    setBusy(true);
    try {
      const contents = format === 'csv' ? buildCsv() : buildJson();
      const name = filename(format, format === 'csv' ? 'attendance' : 'backup');
      const mimeType = format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json';

      if (rows.length === 0) {
        announce({ tone: 'warning', message: 'Nothing to export for this scope yet.' });
        return;
      }

      if (mode === 'share') {
        const result = await share.file({
          filename: name,
          contents,
          mimeType,
          title: 'Classora attendance',
        });
        announce({
          tone: result ? 'success' : 'warning',
          message: result ? 'Export shared' : 'Sharing is not available on this device',
        });
      } else {
        await files.save({ filename: name, contents, mimeType });
        announce({ tone: 'success', message: `${name} downloaded` });
      }
    } catch {
      announce({ tone: 'error', message: 'The export could not be created on this device.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <AppHeader title="Export Data" subtitle="Your records, your copy" />

      <div className="space-y-4 px-5">
        <Card>
          <SectionHeader title="Format" subtitle="Choose what you need the file for" />
          <div className="grid grid-cols-2 gap-2.5">
            <FormatTile
              active={format === 'csv'}
              icon="table_view"
              title="CSV statement"
              caption="One row per marked class — open it in Excel or Sheets."
              onClick={() => setFormat('csv')}
            />
            <FormatTile
              active={format === 'json'}
              icon="data_object"
              title="JSON backup"
              caption="Everything: timetable, versions, overrides and notes."
              onClick={() => setFormat('json')}
            />
          </div>

          {format === 'csv' ? (
            <div className="mt-3.5">
              <Field label="Scope">
                <SelectInput value={scope} onChange={(event) => setScope(event.target.value as CsvScope)}>
                  <option value="all">All recorded classes ({attendance.length})</option>
                  <option value="range" disabled={!range}>
                    Semester window only ({range ? `${range.startDate} → ${range.endDate}` : 'not set'})
                  </option>
                </SelectInput>
              </Field>
            </div>
          ) : null}
        </Card>

        <Card>
          <SectionHeader title="Preview" subtitle={`${rows.length} records ready`} />
          <div className="overflow-hidden rounded-block border border-black/[0.06]">
            <table className="w-full text-left text-[11.5px]">
              <thead className="bg-surface-muted text-ink-secondary">
                <tr>
                  <th className="px-3 py-2 font-bold">Date</th>
                  <th className="px-3 py-2 font-bold">Subject</th>
                  <th className="px-3 py-2 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.05]">
                {rows.slice(0, 5).map((row) => (
                  <tr key={`${row.date}-${row.start}-${row.subject}`}>
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums">{formatMediumDate(row.date)}</td>
                    <td className="max-w-[130px] truncate px-3 py-2 font-semibold">{row.subject}</td>
                    <td className="px-3 py-2">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 5 ? (
            <p className="mt-2 text-[11.5px] text-ink-muted">
              Showing the first 5 of {rows.length} rows.
            </p>
          ) : null}

          <div className="mt-3.5 flex flex-wrap gap-2">
            <Pill tone="muted">{format === 'csv' ? 'text/csv' : 'application/json'}</Pill>
            <Pill tone="muted">{rows.length} records</Pill>
            <Pill tone="muted">{profile?.name ?? 'Student'}</Pill>
          </div>
        </Card>

        <Card className="!bg-brand-50/50">
          <div className="flex gap-3">
            <Icon name="lock" size={19} className="mt-0.5 shrink-0 text-brand-600" />
            <p className="text-[12.5px] leading-relaxed text-ink-secondary">
              The file is generated on this device. Classora never uploads your attendance to a server in Local
              mode, and tokens for cloud sync are never written into an export.
            </p>
          </div>
        </Card>

        <div className="space-y-2.5 pb-2">
          <Button
            block
            icon="download"
            disabled={busy}
            onClick={() => void runExport('download')}
          >
            {busy ? 'Preparing file…' : `Download ${format === 'csv' ? 'CSV statement' : 'JSON backup'}`}
          </Button>
          <Button
            block
            variant="secondary"
            icon="ios_share"
            disabled={busy}
            onClick={() => void runExport('share')}
          >
            Share file
          </Button>
        </div>
      </div>
    </>
  );
}

function FormatTile({
  active,
  icon,
  title,
  caption,
  onClick,
}: {
  active: boolean;
  icon: string;
  title: string;
  caption: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-block border p-3.5 text-left transition',
        active ? 'border-brand-500 bg-brand-50/60' : 'border-black/[0.07] bg-surface',
      )}
    >
      <Icon name={icon} size={20} className={active ? 'text-brand-600' : 'text-ink-muted'} />
      <span className={cn('mt-2 block text-[13px] font-bold', active ? 'text-brand-700' : 'text-ink')}>
        {title}
      </span>
      <span className="mt-1 block text-[11.5px] leading-snug text-ink-secondary">{caption}</span>
    </button>
  );
}
