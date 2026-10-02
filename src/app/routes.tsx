import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { AppShell } from '@/components/layout/AppShell';
import { HomeScreen } from '@/features/home/HomeScreen';
import { MetricCardSkeleton } from '@/components/ui/feedback';

/* Secondary destinations are code-split: the first paint stays small. */
const TimetableScreen = lazy(() =>
  import('@/features/timetable/TimetableScreen').then((module) => ({ default: module.TimetableScreen })),
);
const AttendanceScreen = lazy(() =>
  import('@/features/attendance/AttendanceScreen').then((module) => ({ default: module.AttendanceScreen })),
);
const SubjectDetailScreen = lazy(() =>
  import('@/features/attendance/SubjectDetailScreen').then((module) => ({ default: module.SubjectDetailScreen })),
);
const AnalyticsScreen = lazy(() =>
  import('@/features/analytics/AnalyticsScreen').then((module) => ({ default: module.AnalyticsScreen })),
);
const CanISkipScreen = lazy(() =>
  import('@/features/can-i-skip/CanISkipScreen').then((module) => ({ default: module.CanISkipScreen })),
);
const LeaveImpactScreen = lazy(() =>
  import('@/features/can-i-skip/LeaveImpactScreen').then((module) => ({ default: module.LeaveImpactScreen })),
);
const ProfileScreen = lazy(() =>
  import('@/features/profile/ProfileScreen').then((module) => ({ default: module.ProfileScreen })),
);
const ManageSubjectsScreen = lazy(() =>
  import('@/features/profile/ManageSubjectsScreen').then((module) => ({ default: module.ManageSubjectsScreen })),
);
const SubjectsCrudScreen = lazy(() =>
  import('@/features/profile/SubjectsCrudScreen').then((module) => ({ default: module.SubjectsCrudScreen })),
);
const NotificationSettingsScreen = lazy(() =>
  import('@/features/profile/NotificationSettingsScreen').then((module) => ({
    default: module.NotificationSettingsScreen,
  })),
);
const TimetableVersionsScreen = lazy(() =>
  import('@/features/timetable/TimetableVersionsScreen').then((module) => ({
    default: module.TimetableVersionsScreen,
  })),
);
const AcademicCalendarScreen = lazy(() =>
  import('@/features/timetable/AcademicCalendarScreen').then((module) => ({
    default: module.AcademicCalendarScreen,
  })),
);
const TimetableImportScreen = lazy(() =>
  import('@/features/timetable/TimetableImportScreen').then((module) => ({
    default: module.TimetableImportScreen,
  })),
);
const ReviewAttendanceScreen = lazy(() =>
  import('@/features/attendance/ReviewAttendanceScreen').then((module) => ({
    default: module.ReviewAttendanceScreen,
  })),
);
const NotificationsScreen = lazy(() =>
  import('@/features/notifications/NotificationsScreen').then((module) => ({
    default: module.NotificationsScreen,
  })),
);
const SettingsScreen = lazy(() =>
  import('@/features/profile/SettingsScreen').then((module) => ({ default: module.SettingsScreen })),
);
const ExportScreen = lazy(() =>
  import('@/features/profile/ExportScreen').then((module) => ({ default: module.ExportScreen })),
);

/** The review step is part of the import flow; keep the URL working. */
function TimetableReviewRedirect() {
  return <Navigate to="/timetable/import" replace />;
}

function RouteFallback() {
  return (
    <div className="space-y-4 px-5 pt-safe-plus-2">
      <MetricCardSkeleton />
      <MetricCardSkeleton />
    </div>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/timetable" element={<TimetableScreen />} />
          <Route path="/timetable/import" element={<TimetableImportScreen />} />
          <Route path="/timetable/review" element={<TimetableReviewRedirect />} />
          <Route path="/timetable/versions" element={<TimetableVersionsScreen />} />
          <Route path="/timetable/calendar" element={<AcademicCalendarScreen />} />
          <Route path="/attendance" element={<AttendanceScreen />} />
          <Route path="/attendance/review" element={<ReviewAttendanceScreen />} />
          <Route path="/attendance/:subjectId" element={<SubjectDetailScreen />} />
          <Route path="/analytics" element={<AnalyticsScreen />} />
          <Route path="/can-i-skip" element={<CanISkipScreen />} />
          <Route path="/leave-impact" element={<LeaveImpactScreen />} />
          <Route path="/profile" element={<ProfileScreen />} />
          <Route path="/profile/subjects" element={<SubjectsCrudScreen />} />
          <Route path="/profile/subjects/manage" element={<ManageSubjectsScreen />} />
          <Route path="/profile/notifications" element={<NotificationSettingsScreen />} />
          <Route path="/notifications" element={<NotificationsScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/settings/export" element={<ExportScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
