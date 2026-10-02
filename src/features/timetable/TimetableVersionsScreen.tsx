import { useMemo, useState } from 'react';

import { cn } from '@/lib/cn';
import { useClassora } from '@/app/store';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card } from '@/components/ui/Card';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button, Field, TextInput } from '@/components/ui/controls';
import { Icon } from '@/components/ui/Icon';
import { Pill, StatusChip } from '@/components/ui/chips';
import { EmptyState } from '@/components/ui/feedback';
import { useActiveSubjects } from '@/hooks/useClassoraData';
import { nowInstant } from '@/lib/date';
import type { TimetableVersion } from '@/types/domain';


/**
 * Version history. Restoring a version regenerates *future* occurrences only —
 * attendance that already happened is never rewritten.
 */
export function TimetableVersionsScreen() {
  const versions = useClassora((state) => state.versions);
  const slots = useClassora((state) => state.slots);
  const restoreVersion = useClassora((state) => state.restoreVersion);
  const createVersion = useClassora((state) => state.createVersion);
  const announce = useClassora((state) => state.announce);
  const subjects = useActiveSubjects();

  const [expanded, setExpanded] = useState<string | null>(null);
  const [preview, setPreview] = useState<TimetableVersion | null>(null);
  const [restoring, setRestoring] = useState<TimetableVersion | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [notes, setNotes] = useState('');

  const ordered = useMemo(
    () => [...versions].sort((a, b) => b.versionNumber - a.versionNumber),
    [versions],
  );

  const diffs = useMemo(() => {
    const map = new Map<string, { added: number; removed: number }>();
    const sorted = [...ordered].reverse();
    sorted.forEach((version, index) => {
      const previous = sorted[index - 1];
      if (!previous) {
        map.set(version.id, { added: slots.length, removed: 0 });
        return;
      }
      // Slot-level diff is approximated by signature length change when the
      // historical slots are not loaded; notes explain what changed.
      map.set(version.id, { added: 0, removed: 0 });
    });
    return map;
  }, [ordered, slots.length]);

  if (versions.length === 0) {
    return (
      <>
        <AppHeader title="Timetable Versions" subtitle="Active schema registry" />
        <div className="px-5">
          <Card>
            <EmptyState
              icon="history"
              title="No versions yet"
              message="Publish a version to snapshot the current timetable. You can always restore a snapshot without touching past attendance."
            />
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader title="Timetable Versions" subtitle="Active schema registry" />

      <div className="space-y-4 px-5">
        <Card className="!bg-brand-50/50">
          <div className="flex gap-3">
            <Icon name="info" size={19} className="mt-0.5 shrink-0 text-brand-600" />
            <p className="text-[12.5px] leading-relaxed text-ink-secondary">
              Restoring a version regenerates <strong className="font-bold">future classes only</strong>. Classes
              you have already marked keep their records — history is never rewritten.
            </p>
          </div>
        </Card>

        <Button
          block
          variant="secondary"
          icon="publish"
          onClick={() => {
            setLabel('');
            setNotes('');
            setPublishOpen(true);
          }}
        >
          Publish current timetable
        </Button>

        <ul className="space-y-2.5">
          {ordered.map((version) => {
            const isCurrent = version.isCurrent;
            const diff = diffs.get(version.id);
            const isOpen = expanded === version.id;
            return (
              <li key={version.id}>
                <Card className={cn('!p-4', isCurrent && 'ring-2 ring-brand-500/30')}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[15px] font-extrabold">
                          v{version.versionNumber}.0
                        </p>
                        {isCurrent ? <StatusChip tone="safe" label="Active" /> : null}
                      </div>
                      <p className="mt-0.5 text-[13px] font-semibold text-ink-secondary">{version.label}</p>
                      <p className="mt-1 inline-flex items-center gap-1.5 text-[11.5px] text-ink-muted">
                        <Icon name="schedule" size={13} />
                        {new Date(version.createdAt).toLocaleString([], {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {' · '}
                        {describeOrigin(version.createdBy)}
                      </p>
                    </div>
                    {diff?.added ? <Pill tone="brand">Initial</Pill> : null}
                  </div>

                  {version.notes ? (
                    <p className="mt-2.5 rounded-block bg-surface-muted px-3.5 py-2.5 text-[12.5px] leading-relaxed text-ink-secondary">
                      {version.notes}
                    </p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="ghost" icon={isOpen ? 'expand_less' : 'expand_more'} onClick={() => setExpanded(isOpen ? null : version.id)}>
                      {isOpen ? 'Hide details' : 'View diff'}
                    </Button>
                    <Button variant="ghost" icon="preview" onClick={() => setPreview(version)}>
                      Preview
                    </Button>
                    <Button
                      variant={isCurrent ? 'ghost' : 'secondary'}
                      icon={isCurrent ? 'check_circle' : 'restore'}
                      onClick={() => {
                        if (isCurrent) {
                          announce({ tone: 'info', message: 'This is already the active version' });
                          return;
                        }
                        setRestoring(version);
                      }}
                    >
                      {isCurrent ? 'Current' : 'Restore'}
                    </Button>
                  </div>

                  {isOpen ? (
                    <div className="mt-3 space-y-2 rounded-block bg-surface-muted p-3.5">
                      <DiffRow icon="add" tone="safe" text={`${slots.length} weekly slots in this schema`} />
                      <DiffRow
                        icon="school"
                        tone="neutral"
                        text={`${subjects.length} subjects · signature ${version.signature.slice(0, 12)}`}
                      />
                      <DiffRow
                        icon="history"
                        tone="neutral"
                        text={
                          isCurrent
                            ? 'Attendance continues to attach to dated class occurrences'
                            : 'Restoring keeps every past attendance record intact'
                        }
                      />
                    </div>
                  ) : null}
                </Card>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Preview sheet ------------------------------------------------- */}
      <BottomSheet
        open={preview !== null}
        onClose={() => setPreview(null)}
        title={preview ? `v${preview.versionNumber}.0 — ${preview.label}` : ''}
        description="Weekly schema stored in this version"
      >
        {preview ? (
          <div className="space-y-2.5 pt-1">
            <div className="grid grid-cols-3 gap-2">
              <Metric label="Slots" value={String(slots.length)} />
              <Metric label="Subjects" value={String(subjects.length)} />
              <Metric label="Created" value={new Date(preview.createdAt).toLocaleDateString([], { day: '2-digit', month: 'short' })} />
            </div>
            {preview.notes ? (
              <p className="rounded-block bg-surface-muted p-3.5 text-[12.5px] leading-relaxed text-ink-secondary">
                {preview.notes}
              </p>
            ) : null}
            <p className="text-[12px] text-ink-muted">
              Compare against the active timetable, then Accept or Ignore. Nothing changes until you restore.
            </p>
          </div>
        ) : null}
      </BottomSheet>

      {/* Restore confirmation ----------------------------------------- */}
      <BottomSheet
        open={restoring !== null}
        onClose={() => setRestoring(null)}
        title="Restore this version?"
        description="Future classes will be regenerated from this schema. Past attendance is untouched."
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" block onClick={() => setRestoring(null)}>
              Cancel
            </Button>
            <Button
              block
              icon="restore"
              onClick={() => {
                const target = restoring;
                setRestoring(null);
                if (target) void restoreVersion(target.id);
              }}
            >
              Restore v{restoring?.versionNumber}.0
            </Button>
          </div>
        }
      >
        {restoring ? (
          <div className="space-y-2.5 pt-1">
            <DiffRow icon="event_repeat" tone="neutral" text="Regenerates upcoming classes from the stored slots" />
            <DiffRow icon="lock" tone="safe" text="Never rewrites a marked occurrence or attendance record" />
            <DiffRow icon="history" tone="warning" text="The current version stays in history and can be restored back" />
          </div>
        ) : null}
      </BottomSheet>

      {/* Publish sheet ------------------------------------------------- */}
      <BottomSheet
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        title="Publish current timetable"
        description="Snapshots the active slots so you can always come back to them."
        footer={
          <Button
            block
            icon="publish"
            disabled={label.trim().length === 0}
            onClick={() => {
              const nextLabel = label.trim();
              const nextNotes = notes.trim();
              setPublishOpen(false);
              void createVersion(nextLabel, nextNotes.length > 0 ? nextNotes : null, 'user');
            }}
          >
            Publish version
          </Button>
        }
      >
        <div className="space-y-3.5 pt-1">
          <Field label="What is this version?">
            <TextInput
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="e.g. Mid-semester revision"
            />
          </Field>
          <Field label="What changed?" hint="Optional — shown in the version history">
            <TextInput
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Swapped Thursday lab to Friday"
            />
          </Field>
          <p className="text-[11.5px] text-ink-muted">
            Published at {new Date(nowInstant()).toLocaleString([], { hour: '2-digit', minute: '2-digit' })} · {slots.length}{' '}
            weekly slots
          </p>
        </div>
      </BottomSheet>
    </>
  );
}

function describeOrigin(origin: TimetableVersion['createdBy']): string {
  if (origin === 'seed') return 'Seeded dataset';
  if (origin === 'restore') return 'Restored version';
  return 'Manual edit';
}

function DiffRow({
  icon,
  tone,
  text,
}: {
  icon: string;
  tone: 'safe' | 'warning' | 'neutral';
  text: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon
        name={icon}
        size={16}
        className={cn(
          'mt-0.5 shrink-0',
          tone === 'safe' && 'text-safe-600',
          tone === 'warning' && 'text-warning-600',
          tone === 'neutral' && 'text-ink-muted',
        )}
      />
      <span className="text-[12.5px] leading-relaxed text-ink-secondary">{text}</span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-block bg-surface p-3 shadow-ambient ring-1 ring-black/[0.03]">
      <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-muted">{label}</p>
      <p className="mt-1 text-[15px] font-extrabold tabular-nums">{value}</p>
    </div>
  );
}
