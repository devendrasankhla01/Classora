import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { cn } from '@/lib/cn';
import { useClassora } from '@/app/store';
import { useActiveSubjects } from '@/hooks/useClassoraData';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card, SectionHeader } from '@/components/ui/Card';
import { Button, Field, SelectInput, TextInput } from '@/components/ui/controls';
import { Icon } from '@/components/ui/Icon';
import { StatusChip } from '@/components/ui/chips';
import { LoadingSteps } from '@/components/ui/feedback';
import { SubjectGlyph } from '@/components/ui/SubjectGlyph';
import { nowInstant } from '@/lib/date';
import { createId } from '@/lib/id';
import { findConflictFor, normalizeSignature } from '@/lib/schedule';
import { extractTimetable, isAiProviderConfigured } from '@/services/timetable-ai/extractTimetable';
import { formatBytes, validateUpload } from '@/services/timetable-ai/validation';
import { ExtractionError } from '@/services/timetable-ai/types';
import type {
  ClassType,
  DateKey,
  DayOfWeek,
  ExtractedSlot,
  ExtractedTimetable,
  RecurringSlot,
  Subject,
} from '@/types/domain';

type Step = 'upload' | 'extracting' | 'review' | 'applied';

interface DraftSubject extends ExtractedSubjectDraft {
  id: string;
  include: boolean;
}

interface ExtractedSubjectDraft {
  name: string;
  shortName: string;
  subjectCode: string | null;
  faculty: string | null;
  room: string | null;
  classType: ClassType;
  attendanceCountMode: 'period' | 'session';
  confidence: number;
}

interface DraftRow extends ExtractedSlot {
  id: string;
  include: boolean;
  subjectDraftId: string | null;
}

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Normalised row used to build real recurring slots. */
interface SlotInput {
  subjectKey: string;
  dayOfWeek: DayOfWeek | null;
  startTime: string;
  endTime: string;
  room: string | null;
  faculty: string | null;
  classType: ClassType;
  periodCount: number;
  isBreak: boolean;
  breakLabel: string | null;
}

function fromExtracted(timetable: ExtractedTimetable): SlotInput[] {
  return timetable.schedule.map((slot) => ({
    subjectKey: slot.subjectCode ?? `name:${slot.subjectName}`,
    dayOfWeek: slot.dayOfWeek,
    startTime: slot.startTime,
    endTime: slot.endTime,
    room: slot.room,
    faculty: slot.faculty,
    classType: slot.classType,
    periodCount: slot.periodCount,
    isBreak: slot.isBreak,
    breakLabel: slot.breakLabel,
  }));
}

function fromDraftRows(rows: DraftRow[]): SlotInput[] {
  return rows.map((row) => ({
    subjectKey: row.isBreak ? 'break' : row.subjectDraftId ?? `name:${row.subjectName}`,
    dayOfWeek: row.dayOfWeek,
    startTime: row.startTime,
    endTime: row.endTime,
    room: row.room,
    faculty: row.faculty,
    classType: row.classType,
    periodCount: row.periodCount,
    isBreak: row.isBreak,
    breakLabel: row.breakLabel,
  }));
}

/**
 * AI timetable import.
 *
 * The multimodal model runs server-side only; when no provider is configured
 * the extraction is an explicitly labelled demo fixture. Nothing is written to
 * the timetable until the student reviews and confirms it here.
 */
export function TimetableImportScreen() {
  const navigate = useNavigate();
  const applyImportedTimetable = useClassora((state) => state.applyImportedTimetable);
  const versions = useClassora((state) => state.versions);
  const slots = useClassora((state) => state.slots);
  const occurrences = useClassora((state) => state.occurrences);
  const existingSubjects = useActiveSubjects();
  const announce = useClassora((state) => state.announce);

  const fileInput = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'ai' | 'demo-fixture' | null>(null);
  const [provider, setProvider] = useState<string>('');
  const [timetable, setTimetable] = useState<ExtractedTimetable | null>(null);
  const [subjectsDraft, setSubjectsDraft] = useState<DraftSubject[]>([]);
  const [rowsDraft, setRowsDraft] = useState<DraftRow[]>([]);

  const aiConfigured = isAiProviderConfigured();
  const signature = useMemo(
    () => (timetable ? normalizeSignature(buildSlots(fromExtracted(timetable), 'sig', 'pending')) : null),
    [timetable],
  );
  const duplicateOf = useMemo(
    () =>
      signature
        ? versions.find((version) => version.signature === signature && version.isCurrent) ?? null
        : null,
    [signature, versions],
  );

  const existingSignature = useMemo(
    () => normalizeSignature(slots.filter((slot) => slot.kind === 'class')),
    [slots],
  );

  const activeRows = rowsDraft.filter((row) => row.include && !row.isBreak);

  const handleFile = async (selected: File) => {
    setError(null);
    try {
      validateUpload(selected);
    } catch (thrown) {
      const message =
        thrown instanceof ExtractionError ? thrown.message : 'That file could not be read. Try another one.';
      setError(message);
      return;
    }

    setFile(selected);
    setStep('extracting');

    try {
      const result = await extractTimetable({ file: selected });
      setSource(result.source);
      setProvider(result.provider);
      setTimetable(result.timetable);

      const drafts: DraftSubject[] = result.timetable.subjects.map((subject) => ({
        id: createId('draft-sub'),
        include: true,
        name: subject.name,
        shortName: subject.shortName ?? abbreviate(subject.name),
        subjectCode: subject.subjectCode,
        faculty: subject.faculty,
        room: subject.room,
        classType: subject.classType,
        attendanceCountMode: subject.attendanceCountMode ?? (subject.classType === 'lab' ? 'session' : 'period'),
        confidence: subject.confidence,
      }));

      setSubjectsDraft(drafts);
      setRowsDraft(
        result.timetable.schedule.map((slot) => ({
          ...slot,
          id: createId('draft-row'),
          include: true,
          subjectDraftId:
            drafts.find(
              (draft) =>
                draft.name.toLowerCase() === slot.subjectName.toLowerCase() ||
                (draft.subjectCode && draft.subjectCode === slot.subjectCode),
            )?.id ?? null,
        })),
      );
      setStep('review');
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : 'Extraction failed. Please try again.');
      setStep('upload');
    }
  };

  const patchSubject = (id: string, patch: Partial<DraftSubject>) =>
    setSubjectsDraft((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const patchRow = (id: string, patch: Partial<DraftRow>) =>
    setRowsDraft((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const apply = async () => {
    if (!timetable) return;

    const now = nowInstant();
    const semesterId = useClassora.getState().semester?.id ?? '';
    const userId = useClassora.getState().profile?.id ?? 'local';

    const keptSubjects = subjectsDraft.filter((subject) => subject.include);
    const subjectIdByDraft = new Map<string, string>();

    const builtSubjects: Subject[] = keptSubjects.map((draft) => {
      const existing = existingSubjects.find(
        (subject) =>
          subject.name.toLowerCase() === draft.name.toLowerCase() ||
          (draft.subjectCode && subject.subjectCode === draft.subjectCode),
      );
      const id = existing?.id ?? createId('sub');
      subjectIdByDraft.set(draft.id, id);
      return {
        id,
        semesterId,
        name: draft.name,
        shortName: draft.shortName,
        subjectCode: draft.subjectCode,
        faculty: draft.faculty,
        defaultRoom: draft.room,
        classType: draft.classType,
        attendanceCountMode: draft.attendanceCountMode,
        targetPercentage: existing?.targetPercentage ?? null,
        colorKey: existing?.colorKey ?? 'indigo',
        archived: false,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
    });

    const builtSlots = buildSlots(fromDraftRows(rowsDraft.filter((row) => row.include)), createId('imp'), semesterId)
      .filter((slot) => slot.kind === 'break' || subjectIdByDraft.has(slot.subjectId))
      .map((slot) => ({
        ...slot,
        subjectId: slot.kind === 'break' ? 'break' : subjectIdByDraft.get(slot.subjectId)!,
      }));

    void userId;
    await applyImportedTimetable({
      subjects: builtSubjects,
      slots: builtSlots,
      notes: `Imported from ${file?.name ?? 'timetable'} — ${source === 'ai' ? provider : 'demo fixture'}`,
    });
    setStep('applied');
  };

  return (
    <>
      <AppHeader
        title="Import Timetable"
        subtitle="AI-assisted extraction"
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
        {step === 'upload' ? (
          <>
            <Card>
              <SectionHeader
                title="Upload your timetable"
                subtitle="A photo, screenshot or PDF from your college portal"
              />
              <input
                ref={fileInput}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(event) => {
                  const selected = event.target.files?.[0];
                  if (selected) void handleFile(selected);
                  event.target.value = '';
                }}
              />

              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="flex w-full flex-col items-center gap-2.5 rounded-card border-2 border-dashed border-brand-500/40 bg-brand-50/40 px-5 py-9 text-center transition active:scale-[0.99]"
              >
                <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-brand-600 shadow-ambient">
                  <Icon name="upload_file" size={24} />
                </span>
                <span className="text-[14.5px] font-bold">Choose a file</span>
                <span className="text-[12.5px] text-ink-secondary">
                  PNG, JPG, WebP, HEIC or PDF · up to 12 MB
                </span>
              </button>

              {error ? (
                <div className="mt-3 flex items-start gap-2.5 rounded-block bg-critical-50 p-3.5">
                  <Icon name="error" size={17} className="mt-0.5 shrink-0 text-critical-500" />
                  <p className="text-[12.5px] leading-relaxed text-critical-700">{error}</p>
                </div>
              ) : null}
            </Card>

            <Card className={cn(!aiConfigured && '!bg-warning-50/70')}>
              <div className="flex gap-3">
                <Icon
                  name={aiConfigured ? 'auto_awesome' : 'science'}
                  size={19}
                  className={cn('mt-0.5 shrink-0', aiConfigured ? 'text-brand-600' : 'text-warning-600')}
                />
                <div>
                  <p className="text-[13px] font-bold">
                    {aiConfigured ? 'AI extraction is enabled' : 'AI provider not configured — demo fixture'}
                  </p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-ink-secondary">
                    {aiConfigured
                      ? 'The model runs on the server, never in the browser, so no key can leak into the app bundle.'
                      : 'Without an API key, Classora extracts a clearly labelled sample timetable so you can test the whole review workflow. It never pretends a live model read your file.'}
                  </p>
                </div>
              </div>
            </Card>
          </>
        ) : null}

        {step === 'extracting' ? (
          <Card>
            <p className="mb-4 text-[13px] font-bold">
              {file ? `${file.name} · ${formatBytes(file.size)}` : 'Preparing your file'}
            </p>
            <LoadingSteps
              steps={[
                { label: 'Uploading securely', state: 'done' },
                {
                  label: aiConfigured ? 'Reading the timetable layout' : 'Building the demo fixture',
                  state: 'active',
                },
                { label: 'Validating every row', state: 'pending' },
              ]}
            />
          </Card>
        ) : null}

        {step === 'review' && timetable ? (
          <>
            {source === 'demo-fixture' ? (
              <Card className="!bg-warning-50/70">
                <div className="flex gap-3">
                  <Icon name="info" size={19} className="mt-0.5 shrink-0 text-warning-600" />
                  <p className="text-[12.5px] leading-relaxed text-warning-700">
                    <strong className="font-bold">Demo extraction.</strong> No AI provider is configured, so these
                    rows are sample data generated locally. Review them before applying.
                  </p>
                </div>
              </Card>
            ) : (
              <Card className="!bg-brand-50/60">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 text-[13px] font-bold text-brand-700">
                    <Icon name="auto_awesome" size={17} />
                    Extracted by {provider}
                  </span>
                  <StatusChip tone="brand" label="AI" showDot={false} />
                </div>
              </Card>
            )}

            {duplicateOf || signature === existingSignature ? (
              <Card className="!bg-critical-50/70">
                <div className="flex gap-3">
                  <Icon name="content_copy" size={19} className="mt-0.5 shrink-0 text-critical-500" />
                  <div>
                    <p className="text-[13px] font-bold text-critical-700">
                      This looks like a timetable you already have
                    </p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-critical-700/90">
                      The weekly signature matches{' '}
                      {duplicateOf ? `version v${duplicateOf.versionNumber}.0` : 'your active timetable'}. Applying
                      it would not change your schedule — you can still continue if you want to refresh names.
                    </p>
                  </div>
                </div>
              </Card>
            ) : null}

            <Card>
              <SectionHeader
                title="Subjects found"
                subtitle={`${subjectsDraft.filter((item) => item.include).length} of ${subjectsDraft.length} kept`}
              />
              <ul className="space-y-2.5">
                {subjectsDraft.map((draft) => (
                  <li
                    key={draft.id}
                    className={cn(
                      'rounded-block border p-3.5',
                      draft.include ? 'border-black/[0.06] bg-surface' : 'border-black/[0.06] bg-surface-muted opacity-60',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Icon name={draft.classType === 'lab' ? 'science' : 'menu_book'} size={19} className="mt-0.5 text-ink-muted" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-bold">{draft.name}</p>
                        <p className="mt-0.5 text-[11.5px] text-ink-secondary">
                          {[draft.subjectCode, draft.faculty, draft.room].filter(Boolean).join(' • ') || 'No extra details'}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <StatusChip
                            tone={draft.confidence >= 0.9 ? 'safe' : draft.confidence >= 0.7 ? 'warning' : 'critical'}
                            label={`${Math.round(draft.confidence * 100)}% confidence`}
                            showDot={false}
                          />
                          <span className="text-[11px] text-ink-muted">
                            {draft.attendanceCountMode === 'session' ? 'Counts as one session' : 'Counts per period'}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        aria-pressed={draft.include}
                        onClick={() => patchSubject(draft.id, { include: !draft.include })}
                        className={cn(
                          'grid h-7 w-7 shrink-0 place-items-center rounded-full',
                          draft.include ? 'bg-brand-600 text-white' : 'bg-surface-sunken text-ink-secondary',
                        )}
                      >
                        <Icon name={draft.include ? 'check' : 'add'} size={16} />
                      </button>
                    </div>

                    {draft.confidence < 0.8 && draft.include ? (
                      <div className="mt-3 space-y-2.5">
                        <Field label="Subject name">
                          <TextInput value={draft.name} onChange={(event) => patchSubject(draft.id, { name: event.target.value })} />
                        </Field>
                        <div className="grid grid-cols-2 gap-2.5">
                          <Field label="Code">
                            <TextInput
                              value={draft.subjectCode ?? ''}
                              onChange={(event) => patchSubject(draft.id, { subjectCode: event.target.value })}
                            />
                          </Field>
                          <Field label="Counts">
                            <SelectInput
                              value={draft.attendanceCountMode}
                              onChange={(event) =>
                                patchSubject(draft.id, {
                                  attendanceCountMode: event.target.value as DraftSubject['attendanceCountMode'],
                                })
                              }
                            >
                              <option value="period">Per period</option>
                              <option value="session">One session</option>
                            </SelectInput>
                          </Field>
                        </div>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <SectionHeader
                title="Weekly slots"
                subtitle={`${activeRows.length} classes will be scheduled`}
              />
              <ul className="space-y-2">
                {rowsDraft.map((row) => {
                  const subject = subjectsDraft.find((item) => item.id === row.subjectDraftId);
                  const conflict = row.isBreak
                    ? null
                    : findConflictFor(
                        {
                          id: row.id,
                          date: previewDateFor(row.dayOfWeek),
                          startTime: row.startTime,
                          endTime: row.endTime,
                        },
                        occurrences.filter((item) => item.date === previewDateFor(row.dayOfWeek)),
                      );
                  return (
                    <li
                      key={row.id}
                      className={cn(
                        'rounded-block border p-3',
                        row.include ? 'border-black/[0.06] bg-surface' : 'border-black/[0.06] bg-surface-muted opacity-60',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          aria-pressed={row.include}
                          onClick={() => patchRow(row.id, { include: !row.include })}
                          className={cn(
                            'grid h-5 w-5 shrink-0 place-items-center rounded-[6px] border',
                            row.include ? 'border-brand-600 bg-brand-600 text-white' : 'border-black/20 bg-white',
                          )}
                        >
                          {row.include ? <Icon name="check" size={13} /> : null}
                        </button>

                        {subject ? (
                          <SubjectGlyph subject={{ classType: subject.classType, colorKey: 'indigo' }} size={34} />
                        ) : (
                          <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-surface-sunken text-ink-muted">
                            <Icon name="free_breakfast" size={16} />
                          </span>
                        )}

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-bold">
                            {row.isBreak ? row.breakLabel ?? 'Break' : subject?.name ?? row.subjectName}
                          </p>
                          <p className="text-[11.5px] text-ink-secondary">
                            {DAY_LABELS[row.dayOfWeek ?? 1]} · {row.startTime}–{row.endTime}
                            {row.room ? ` • ${row.room}` : ''}
                            {row.periodCount > 1 ? ` • ${row.periodCount} periods` : ''}
                          </p>
                        </div>

                        {row.isBreak ? (
                          <StatusChip tone="neutral" label="Break" showDot={false} />
                        ) : (
                          <StatusChip
                            tone={row.confidence >= 0.9 ? 'safe' : row.confidence >= 0.7 ? 'warning' : 'critical'}
                            label={`${Math.round(row.confidence * 100)}%`}
                            showDot={false}
                          />
                        )}
                      </div>

                      {conflict && row.include ? (
                        <p className="mt-2.5 flex items-start gap-2 rounded-block bg-warning-50 px-3 py-2 text-[11.5px] leading-relaxed text-warning-700">
                          <Icon name="warning" size={14} className="mt-0.5 shrink-0" />
                          Overlaps an existing class on {DAY_LABELS[row.dayOfWeek ?? 1]} — resolve it after
                          applying with Modify Day.
                        </p>
                      ) : null}

                      {row.confidence < 0.8 && row.include && !row.isBreak ? (
                        <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                          <Field label="Starts">
                            <TextInput
                              type="time"
                              value={row.startTime}
                              onChange={(event) => patchRow(row.id, { startTime: event.target.value })}
                            />
                          </Field>
                          <Field label="Ends">
                            <TextInput
                              type="time"
                              value={row.endTime}
                              onChange={(event) => patchRow(row.id, { endTime: event.target.value })}
                            />
                          </Field>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>

              {timetable.warnings.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {timetable.warnings.map((warning) => (
                    <li key={warning} className="flex items-start gap-2 text-[11.5px] leading-relaxed text-ink-secondary">
                      <Icon name="info" size={14} className="mt-0.5 shrink-0 text-ink-muted" />
                      {warning}
                    </li>
                  ))}
                </ul>
              ) : null}
            </Card>

            <div className="space-y-2.5 pb-2">
              <Button block icon="check_circle" onClick={() => void apply()}>
                Accept & apply import
              </Button>
              <Button block variant="secondary" icon="restart_alt" onClick={() => {
                setStep('upload');
                setFile(null);
                setTimetable(null);
                setRowsDraft([]);
                setSubjectsDraft([]);
              }}>
                Start over
              </Button>
            </div>
          </>
        ) : null}

        {step === 'applied' ? (
          <>
            <Card>
              <div className="flex flex-col items-center py-4 text-center">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-safe-500 text-white">
                  <Icon name="check" size={28} />
                </span>
                <h2 className="mt-3 text-[19px] font-extrabold tracking-[-0.02em]">Timetable imported</h2>
                <p className="mt-1.5 max-w-[280px] text-[13px] leading-relaxed text-ink-secondary">
                  A new version was created and future classes were generated. Past attendance was not touched.
                </p>
              </div>
            </Card>

            <div className="space-y-2.5 pb-2">
              <Button block icon="calendar_month" onClick={() => navigate('/timetable')}>
                Open timetable
              </Button>
              <Button block variant="secondary" icon="history" onClick={() => navigate('/timetable/versions')}>
                Compare versions
              </Button>
              <Button
                block
                variant="ghost"
                icon="delete_sweep"
                onClick={() => {
                  announce({
                    tone: 'info',
                    message: 'Nothing to undo — imports can be reverted from Timetable Versions',
                  });
                  navigate('/timetable/versions');
                }}
              >
                Changed my mind
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Helpers                                                             *
 * ------------------------------------------------------------------ */

function abbreviate(name: string): string {
  const words = name.split(/\s+/).filter((word) => /^[A-Za-z]/.test(word));
  if (words.length === 1) return words[0]!.slice(0, 8);
  return words
    .slice(0, 3)
    .map((word) => word[0]!.toUpperCase())
    .join('');
}

/** Preview date used for conflict checking: the next occurrence of that weekday. */
function previewDateFor(dayOfWeek: number | null): DateKey {
  const now = new Date();
  const target = dayOfWeek ?? now.getDay();
  const delta = (target - now.getDay() + 7) % 7;
  now.setDate(now.getDate() + delta);
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}` as DateKey;
}

/**
 * Convert normalised rows into the app's recurring-slot shape.
 *
 * `subjectId` still holds a draft key here; the caller remaps the kept rows to
 * real subject ids once the subjects are created (or matched to existing ones).
 */
function buildSlots(rows: SlotInput[], versionId: string, semesterId: string): RecurringSlot[] {
  const now = nowInstant();

  return rows
    .filter((row) => row.dayOfWeek !== null)
    .map((row, index) => ({
      id: `import-${versionId}-${index}`,
      timetableVersionId: versionId,
      semesterId,
      subjectId: row.subjectKey,
      dayOfWeek: row.dayOfWeek!,
      startTime: row.startTime,
      endTime: row.endTime,
      room: row.room,
      facultyOverride: row.faculty,
      classType: row.classType === 'other' ? 'theory' : row.classType,
      periodCount: row.periodCount,
      kind: row.isBreak ? 'break' : 'class',
      label: row.breakLabel,
      createdAt: now,
      updatedAt: now,
    }));
}
