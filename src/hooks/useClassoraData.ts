/**
 * Convenience selectors that turn store functions into memoised data, so
 * components re-render only when the underlying records actually change.
 */
import { useMemo } from 'react';

import { useClassora } from '@/app/store';
import type { Subject } from '@/types/domain';

export function useActiveSubjects(): Subject[] {
  const subjects = useClassora((state) => state.subjects);
  return useMemo(() => subjects.filter((subject) => !subject.archived), [subjects]);
}

export function useArchivedSubjects(): Subject[] {
  const subjects = useClassora((state) => state.subjects);
  return useMemo(() => subjects.filter((subject) => subject.archived), [subjects]);
}

export function useSubject(subjectId: string | undefined): Subject | null {
  const subjects = useClassora((state) => state.subjects);
  return useMemo(
    () => subjects.find((subject) => subject.id === subjectId) ?? null,
    [subjects, subjectId],
  );
}

export function useSemesterRange(): { startDate: string; endDate: string } | null {
  const semester = useClassora((state) => state.semester);
  return useMemo(
    () => (semester ? { startDate: semester.startDate, endDate: semester.endDate } : null),
    [semester],
  );
}
