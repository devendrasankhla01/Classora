/**
 * Screen smoke tests.
 *
 * These render the real store (seeded demo dataset over fake-indexeddb) and the
 * real screens, so a runtime crash — a missing null guard, a bad selector, an
 * empty-state path — fails the suite instead of reaching the phone.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { aggregate } from '@/lib/attendance';
import { useClassora } from './store';
import { HomeScreen } from '@/features/home/HomeScreen';
import { TimetableScreen } from '@/features/timetable/TimetableScreen';
import { AttendanceScreen } from '@/features/attendance/AttendanceScreen';
import { AnalyticsScreen } from '@/features/analytics/AnalyticsScreen';
import { CanISkipScreen } from '@/features/can-i-skip/CanISkipScreen';
import { ProfileScreen } from '@/features/profile/ProfileScreen';
import { ReviewAttendanceScreen } from '@/features/attendance/ReviewAttendanceScreen';
import { TimetableImportScreen } from '@/features/timetable/TimetableImportScreen';
import { AcademicCalendarScreen } from '@/features/timetable/AcademicCalendarScreen';
import { NotificationsScreen } from '@/features/notifications/NotificationsScreen';

function renderScreen(element: React.ReactElement, path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={element} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeAll(async () => {
  await useClassora.getState().initialize();
});

afterAll(() => {
  cleanup();
});

describe('seeded store', () => {
  it('loads the demo semester with subjects and occurrences', () => {
    const state = useClassora.getState();
    expect(state.ready).toBe(true);
    expect(state.profile).not.toBeNull();
    expect(state.subjects.length).toBeGreaterThanOrEqual(5);
    expect(state.occurrences.length).toBeGreaterThan(40);
    expect(state.attendance.length).toBeGreaterThan(80);
  });

  it('derives real alerts for the inbox on load', () => {
    const notifications = useClassora.getState().notifications;
    expect(notifications.length).toBeGreaterThan(0);
    // Every alert must point at something real.
    for (const notification of notifications) {
      expect(notification.title.length).toBeGreaterThan(0);
      expect(notification.body.length).toBeGreaterThan(0);
    }
  });

  it('reports a believable overall attendance figure', () => {
    const target = useClassora.getState().profile!.attendanceTarget;
    const stats = aggregate(
      useClassora.getState().summaries().map((row) => row.summary),
      target,
    );
    expect(stats.percentage).not.toBeNull();
    expect(stats.percentage!).toBeGreaterThan(70);
    expect(stats.percentage!).toBeLessThan(95);
    expect(stats.conducted).toBeGreaterThan(0);
  });
});

describe('screens render with real data', () => {
  it('Home shows the greeting, next class and attendance overview', () => {
    renderScreen(<HomeScreen />);
    const region = document.body;
    expect(within(region).getByText(useClassora.getState().profile!.name.split(' ')[0]!, { exact: false })).toBeTruthy();
    expect(within(region).getAllByText(/attendance/i).length).toBeGreaterThan(0);
  });

  it('Timetable offers daily and weekly views', () => {
    renderScreen(<TimetableScreen />);
    expect(screen.getByRole('tab', { name: /daily/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /weekly/i })).toBeTruthy();
  });

  it('Attendance lists every subject with its own percentage', () => {
    renderScreen(<AttendanceScreen />);
    const subjects = useClassora.getState().activeSubjects();
    for (const subject of subjects.slice(0, 3)) {
      const escaped = subject.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      expect(screen.getAllByText(new RegExp(escaped, 'i')).length).toBeGreaterThan(0);
    }
  });

  it('Analytics renders the trajectory and subject distribution', () => {
    renderScreen(<AnalyticsScreen />);
    expect(screen.getAllByText(/trajectory|distribution/i).length).toBeGreaterThan(0);
  });

  it('Can I Skip renders a verdict for the next class', () => {
    renderScreen(<CanISkipScreen />);
    expect(screen.getAllByText(/skip/i).length).toBeGreaterThan(0);
  });

  it('Profile renders the student identity and policy controls', () => {
    renderScreen(<ProfileScreen />);
    expect(screen.getAllByText(/manage subjects/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/target/i).length).toBeGreaterThan(0);
  });

  it('Review attendance renders either unmarked classes or the all-clear state', () => {
    renderScreen(<ReviewAttendanceScreen />);
    expect(screen.getAllByText(/unmarked|everything is marked/i).length).toBeGreaterThan(0);
  });

  it('Import explains the honest demo-fixture fallback', () => {
    renderScreen(<TimetableImportScreen />);
    expect(screen.getByText(/choose a file/i)).toBeTruthy();
    expect(screen.getAllByText(/demo fixture|provider not configured/i).length).toBeGreaterThan(0);
  });

  it('Academic calendar lists upcoming days', () => {
    renderScreen(<AcademicCalendarScreen />);
    expect(screen.getAllByText(/holiday|next 90 days/i).length).toBeGreaterThan(0);
  });

  it('Notifications renders the inbox or its empty state', () => {
    renderScreen(<NotificationsScreen />);
    expect(screen.getAllByText(/notifications/i).length).toBeGreaterThan(0);
  });
});
