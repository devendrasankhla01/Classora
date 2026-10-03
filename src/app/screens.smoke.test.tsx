/**
 * Screen smoke tests.
 *
 * Render the real store (over fake-indexeddb) and the real screens, so runtime
 * crashes — missing null guards, bad selectors, empty-state paths — fail the
 * suite instead of reaching the phone.
 *
 * The app no longer ships a fake demo dataset on first run, so these tests
 * focus on the real onboarding paths (empty state + import screen + login).
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { useClassora } from './store';
import { TimetableImportScreen } from '@/features/timetable/TimetableImportScreen';
import { LoginScreen, writeStoredSession } from '@/features/auth/LoginScreen';

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
  if (!useClassora.getState().profile) {
    await useClassora.getState().updateProfile({ name: 'Test Student' });
  }
  await new Promise((resolve) => setTimeout(resolve, 10));
});

afterEach(() => {
  cleanup();
});

describe('initialised store', () => {
  it('is ready with a profile but no auto-seeded fake data', () => {
    const state = useClassora.getState();
    expect(state.ready).toBe(true);
    expect(state.profile).not.toBeNull();
    expect(state.subjects).toHaveLength(0);
  });
});

describe('import screen', () => {
  it('invites you to upload a file or start from blank', () => {
    renderScreen(<TimetableImportScreen />);
    expect(screen.getByText(/choose a file/i)).toBeTruthy();
    expect(screen.getAllByText(/blank timetable|on-device/i).length).toBeGreaterThan(0);
  });

  it('requires at least one included class before applying', () => {
    renderScreen(<TimetableImportScreen />);
    fireEvent.click(screen.getByRole('button', { name: /start with a blank timetable/i }));

    const applyButton = screen.getByRole('button', { name: /add a class to continue/i });
    expect(applyButton).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /^add class$/i }));
    expect(screen.getByRole('button', { name: /accept & apply import/i })).toBeEnabled();
  });
});

describe('auth screen', () => {
  it('Login renders the sign-in tabs and guest continue action', () => {
    writeStoredSession(null);
    renderScreen(<LoginScreen />, '/login');
    expect(screen.getByRole('tab', { name: /sign in/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /create/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /magic link/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /skip for now/i })).toBeTruthy();
  });
});
