import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import {
  OnboardingScreen,
  isOnboardingCompleted,
  ONBOARDING_COMPLETED_KEY,
} from './OnboardingScreen';

describe('OnboardingScreen', () => {
  beforeEach(() => {
    cleanup();
    const store: Record<string, string> = {};
    const mockStorage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        for (const k in store) delete store[k];
      },
    };
    Object.defineProperty(window, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true,
    });
  });

  it('renders Slide 1 by default with CampusOne branding and target safety headline', () => {
    render(
      <MemoryRouter>
        <OnboardingScreen />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Never Dip Below Your/i)).toBeTruthy();
    expect(screen.getByText(/85% Target/i)).toBeTruthy();
    expect(screen.getByText(/Section A CSE • Academic Assistant/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Skip' })).toBeTruthy();
  });

  it('navigates from Slide 1 to Slide 2 when Next is clicked', () => {
    render(
      <MemoryRouter>
        <OnboardingScreen />
      </MemoryRouter>,
    );

    const nextBtn = screen.getByRole('button', { name: /^next/i });
    fireEvent.click(nextBtn);

    expect(screen.getByText(/Smart Timetable/i)).toBeTruthy();
    expect(screen.getByText(/Feature Discovery/i)).toBeTruthy();
  });

  it('navigates from Slide 1 -> Slide 2 -> Slide 3 (Developer Shout-Out)', () => {
    render(
      <MemoryRouter>
        <OnboardingScreen />
      </MemoryRouter>,
    );

    // Go to slide 2
    fireEvent.click(screen.getByRole('button', { name: /^next/i }));
    // Go to slide 3
    fireEvent.click(screen.getByRole('button', { name: /^next/i }));

    expect(screen.getByText(/Made with Passion/i)).toBeTruthy();
    expect(screen.getAllByText(/Devendra Sankhla/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/3rd Semester • Computer Science & Engineering/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Get Started with CampusOne/i })).toBeTruthy();
  });

  it('persists onboarding completion when Get Started is clicked', () => {
    render(
      <MemoryRouter>
        <OnboardingScreen />
      </MemoryRouter>,
    );

    // Go to slide 3
    fireEvent.click(screen.getByRole('button', { name: /^next/i }));
    fireEvent.click(screen.getByRole('button', { name: /^next/i }));

    const getStartedBtn = screen.getByRole('button', { name: /Get Started with CampusOne/i });
    fireEvent.click(getStartedBtn);

    expect(isOnboardingCompleted()).toBe(true);
    if (typeof localStorage !== 'undefined') {
      expect(localStorage.getItem(ONBOARDING_COMPLETED_KEY)).toBe('true');
    }
  });

  it('persists onboarding completion when Skip is clicked', () => {
    render(
      <MemoryRouter>
        <OnboardingScreen />
      </MemoryRouter>,
    );

    const skipBtn = screen.getByRole('button', { name: 'Skip' });
    fireEvent.click(skipBtn);

    expect(isOnboardingCompleted()).toBe(true);
  });

  it('supports keyboard navigation (ArrowRight and ArrowLeft)', () => {
    render(
      <MemoryRouter>
        <OnboardingScreen />
      </MemoryRouter>,
    );

    // Press ArrowRight -> Slide 2
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByText(/Feature Discovery/i)).toBeTruthy();

    // Press ArrowLeft -> Slide 1
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByText(/Never Dip Below Your/i)).toBeTruthy();
  });
});
