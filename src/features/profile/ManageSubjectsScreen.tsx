import { useState } from 'react';

import { useClassora } from '@/app/store';
import { useActiveSubjects, useArchivedSubjects } from '@/hooks/useClassoraData';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card, SectionHeader } from '@/components/ui/Card';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button, Field, SelectInput, TextInput } from '@/components/ui/controls';
import { Icon } from '@/components/ui/Icon';
import { StatusChip } from '@/components/ui/chips';
import { SubjectGlyph } from '@/components/ui/SubjectGlyph';
import { EmptyState } from '@/components/ui/feedback';
import { nowInstant } from '@/lib/date';
import { createId } from '@/lib/id';
import type { Subject, SubjectColorKey } from '@/types/domain';

const TONES: SubjectColorKey[] = ['indigo', 'amber', 'emerald', 'rose', 'sky', 'violet'];

/**
 * Manage Subjects — add, edit and archive. Subjects are never deleted while
 * they hold attendance history.
 */
export function ManageSubjectsScreen() {
  const subjects = useActiveSubjects();
  const archived = useArchivedSubjects();
  const semester = useClassora((state) => state.semester);
  const upsertSubject = useClassora((state) => state.upsertSubject);
  const archiveSubject = useClassora((state) => state.archiveSubject);

  const [editing, setEditing] = useState<Subject | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <>
      <AppHeader title="Manage Subjects" subtitle={`${subjects.length} active`} />

      <div className="space-y-4 px-5">
        <Button block icon="add" onClick={() => setCreating(true)}>
          Add subject
        </Button>

        {subjects.length === 0 ? (
          <Card>
            <EmptyState
              icon="library_books"
              title="No subjects yet"
              message="Add your subjects or import a timetable to get started."
            />
          </Card>
        ) : (
          <ul className="space-y-2.5">
            {subjects.map((subject) => (
              <li key={subject.id}>
                <Card className="!p-4">
                  <div className="flex items-start gap-3.5">
                    <SubjectGlyph subject={subject} />
                    <div className="min-w-0 flex-1">
                      <p className="text-label-lg">{subject.name}</p>
                      <p className="mt-0.5 text-body-sm text-ink-secondary">
                        {[subject.subjectCode, subject.faculty, subject.defaultRoom].filter(Boolean).join(' • ')}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <StatusChip tone="neutral" label={subject.classType === 'lab' ? 'Lab' : 'Theory'} showDot={false} />
                        <StatusChip
                          tone="brand"
                          label={subject.attendanceCountMode === 'session' ? 'One session' : 'Per period'}
                          showDot={false}
                        />
                        {subject.targetPercentage !== null ? (
                          <StatusChip tone="warning" label={`Target ${subject.targetPercentage}%`} showDot={false} />
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button variant="secondary" icon="edit" onClick={() => setEditing(subject)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      icon="archive"
                      onClick={() => void archiveSubject(subject.id)}
                    >
                      Archive
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}

        {archived.length > 0 ? (
          <Card>
            <SectionHeader title="Archived" subtitle="History is kept — these subjects no longer count" />
            <ul className="space-y-2">
              {archived.map((subject) => (
                <li key={subject.id} className="flex items-center justify-between gap-3 rounded-block bg-surface-muted px-3.5 py-3">
                  <span className="min-w-0">
                    <span className="block truncate text-label-lg">{subject.name}</span>
                    <span className="block text-label-sm text-ink-secondary">{subject.subjectCode ?? '—'}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      void upsertSubject({ ...subject, archived: false, updatedAt: nowInstant() })
                    }
className="text-label-md text-brand-700"
                  >
                    Restore
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>

      <SubjectSheet
        open={creating || editing !== null}
        subject={editing}
        semesterId={semester?.id ?? ''}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSave={async (subject) => {
          await upsertSubject(subject);
          setCreating(false);
          setEditing(null);
        }}
      />
    </>
  );
}

export function SubjectSheet({
  open,
  subject,
  semesterId,
  onClose,
  onSave,
}: {
  open: boolean;
  subject: Subject | null;
  semesterId: string;
  onClose: () => void;
  onSave: (subject: Subject) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Partial<Subject>>({});

  const value = <K extends keyof Subject>(key: K, fallback: Subject[K]): Subject[K] =>
    (draft[key] ?? subject?.[key] ?? fallback) as Subject[K];

  const patch = (next: Partial<Subject>) => setDraft((current) => ({ ...current, ...next }));

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={subject ? 'Edit subject' : 'Add subject'}
      description="Short names keep the timetable readable."
      footer={
        <Button
          block
          icon="check"
          onClick={() => {
            const now = nowInstant();
            const built: Subject = {
              id: subject?.id ?? createId('sub'),
              semesterId: subject?.semesterId ?? semesterId,
              name: value('name', ''),
              shortName: value('shortName', value('name', '').slice(0, 12)),
              subjectCode: value('subjectCode', null),
              faculty: value('faculty', null),
              defaultRoom: value('defaultRoom', null),
              classType: value('classType', 'theory'),
              attendanceCountMode: value('attendanceCountMode', 'period'),
              targetPercentage: value('targetPercentage', null),
              colorKey: value('colorKey', 'indigo'),
              archived: subject?.archived ?? false,
              createdAt: subject?.createdAt ?? now,
              updatedAt: now,
            };
            void onSave(built);
          }}
          disabled={value('name', '').trim().length === 0}
        >
          Save subject
        </Button>
      }
    >
      <div className="space-y-3.5 pt-1">
        <Field label="Subject name">
          <TextInput
            value={value('name', '')}
            onChange={(event) => patch({ name: event.target.value })}
            placeholder="e.g. Operating Systems"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Short name">
            <TextInput
              value={value('shortName', '')}
              onChange={(event) => patch({ shortName: event.target.value })}
              placeholder="OS"
            />
          </Field>
          <Field label="Subject code">
            <TextInput
              value={value('subjectCode', '') ?? ''}
              onChange={(event) => patch({ subjectCode: event.target.value })}
              placeholder="CS-204"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Faculty">
            <TextInput
              value={value('faculty', '') ?? ''}
              onChange={(event) => patch({ faculty: event.target.value })}
              placeholder="Dr. R. Kulkarni"
            />
          </Field>
          <Field label="Default room">
            <TextInput
              value={value('defaultRoom', '') ?? ''}
              onChange={(event) => patch({ defaultRoom: event.target.value })}
              placeholder="C-204"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Class type">
            <SelectInput
              value={value('classType', 'theory')}
              onChange={(event) => patch({ classType: event.target.value as Subject['classType'] })}
            >
              <option value="theory">Theory</option>
              <option value="lab">Lab</option>
              <option value="other">Other</option>
            </SelectInput>
          </Field>
          <Field label="Attendance counting">
            <SelectInput
              value={value('attendanceCountMode', 'period')}
              onChange={(event) =>
                patch({ attendanceCountMode: event.target.value as Subject['attendanceCountMode'] })
              }
            >
              <option value="period">Individual periods</option>
              <option value="session">One session</option>
            </SelectInput>
          </Field>
        </div>
        <Field label="Target override" hint="Leave blank to use your global target">
          <TextInput
            type="number"
            min={50}
            max={100}
            value={value('targetPercentage', null) ?? ''}
            onChange={(event) =>
              patch({ targetPercentage: event.target.value === '' ? null : Number(event.target.value) })
            }
            placeholder="75"
          />
        </Field>
        <Field label="Accent colour" hint="Used for the subject glyph and charts">
          <div className="flex gap-2">
            {TONES.map((tone) => (
              <button
                key={tone}
                type="button"
                aria-label={tone}
                aria-pressed={value('colorKey', 'indigo') === tone}
                onClick={() => patch({ colorKey: tone })}
                className={
                  value('colorKey', 'indigo') === tone
                    ? 'h-9 w-9 rounded-full ring-2 ring-brand-500 ring-offset-2'
                    : 'h-9 w-9 rounded-full ring-1 ring-edge'
                }
                style={{ backgroundColor: TONE_HEX[tone] }}
              />
            ))}
          </div>
        </Field>
        <p className="text-label-sm text-ink-muted">
          <Icon name="info" size={13} className="mr-1 inline align-middle" />
          Changing the counting rule only affects future calculations; existing records keep the weight they
          were marked with.
        </p>
      </div>
    </BottomSheet>
  );
}

const TONE_HEX: Record<SubjectColorKey, string> = {
  indigo: '#4F46E5',
  amber: '#F59E0B',
  emerald: '#10B981',
  rose: '#F87171',
  sky: '#2563EB',
  violet: '#7C3AED',
};
