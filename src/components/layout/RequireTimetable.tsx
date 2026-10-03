import { Navigate, Outlet } from 'react-router-dom';

import { useClassora } from '@/app/store';

/**
 * Gating wrapper that sends the student to the import wizard until a real
 * timetable has been saved. Attendance, analytics and skip predictions do not
 * make sense without subjects and recurring slots, so those routes live here.
 *
 * Profile, settings and the import screen remain reachable without a timetable
 * (for example, to sign out or adjust the student's identity before uploading).
 */
export function RequireTimetable() {
  const ready = useClassora((state) => state.ready);
  const subjects = useClassora((state) => state.subjects);
  const slots = useClassora((state) => state.slots);

  if (!ready) return null;

  const hasTimetable = subjects.length > 0 && slots.length > 0;
  if (!hasTimetable) {
    return <Navigate to="/timetable/import" replace />;
  }

  return <Outlet />;
}
