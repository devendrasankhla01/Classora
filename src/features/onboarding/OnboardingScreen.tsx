import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useClassora } from '@/app/store';
import { readStoredSession } from '@/features/auth/LoginScreen';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Icon } from '@/components/ui/Icon';
import { OnboardingSlide1 } from './OnboardingSlide1';
import { OnboardingSlide2 } from './OnboardingSlide2';
import { OnboardingSlide3 } from './OnboardingSlide3';

export const ONBOARDING_COMPLETED_KEY = 'campusone_onboarding_completed_v1';

export function isOnboardingCompleted(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(ONBOARDING_COMPLETED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markOnboardingCompleted(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
  } catch {
    // Storage restricted — ignore
  }
}

export interface OnboardingScreenProps {
  onFinish?: () => void;
}

export function OnboardingScreen({ onFinish }: OnboardingScreenProps) {
  const navigate = useNavigate();
  const saveSettings = useClassora((state) => state.saveSettings);

  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const totalSlides = 3;

  const handleComplete = () => {
    markOnboardingCompleted();
    void saveSettings({ onboarded: true });

    if (onFinish) {
      onFinish();
      return;
    }

    // Determine navigation target based on auth session
    const session = readStoredSession();
    if (session !== null) {
      navigate('/', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  };

  const handleNext = () => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1);
    }
  };

  // Touch Swipe Gesture Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0]?.clientX ?? null;
    touchEndX.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0]?.clientX ?? null;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 45;

    if (distance > minSwipeDistance) {
      // Swiped Left -> Next Slide
      if (currentSlide < totalSlides - 1) {
        setCurrentSlide((prev) => prev + 1);
      }
    } else if (distance < -minSwipeDistance) {
      // Swiped Right -> Previous Slide
      if (currentSlide > 0) {
        setCurrentSlide((prev) => prev - 1);
      }
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        if (currentSlide < totalSlides - 1) {
          e.preventDefault();
          setCurrentSlide((prev) => prev + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentSlide > 0) {
          e.preventDefault();
          setCurrentSlide((prev) => prev - 1);
        }
      } else if (e.key === 'Escape') {
        handleComplete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide]);

  return (
    <div
      role="region"
      aria-label="CampusOne Onboarding Experience"
      className="fixed inset-0 z-50 flex flex-col justify-between bg-canvas overflow-y-auto no-scrollbar pt-safe pb-safe select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Bar: Brand Logo & Skip Action */}
      <header className="w-full max-w-app mx-auto px-4 pt-3 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-2">
          <BrandLogo variant="mark" size="sm" />
          <span className="text-label-sm font-bold text-slate-800 tracking-tight">
            Campus<span className="text-indigo-600">One</span>
          </span>
        </div>

        {currentSlide < totalSlides - 1 ? (
          <button
            type="button"
            onClick={handleComplete}
            className="px-3.5 py-1.5 rounded-full text-label-xs font-bold text-slate-500 hover:text-slate-900 bg-slate-200/50 hover:bg-slate-200/80 transition-all duration-200"
          >
            Skip
          </button>
        ) : (
          <span className="text-label-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-full">
            Final Step
          </span>
        )}
      </header>

      {/* Slide Carousel Content */}
      <main className="flex-1 w-full max-w-app mx-auto flex items-center justify-center my-auto py-2">
        <div className="w-full h-full flex flex-col justify-between">
          {currentSlide === 0 && <OnboardingSlide1 />}
          {currentSlide === 1 && <OnboardingSlide2 />}
          {currentSlide === 2 && <OnboardingSlide3 onGetStarted={handleComplete} />}
        </div>
      </main>

      {/* Bottom Navigation Dock */}
      <footer className="w-full max-w-app mx-auto px-4 pb-4 pt-2 shrink-0 z-20">
        <div className="flex items-center justify-between gap-4">
          {/* Back Button */}
          <div className="w-20">
            {currentSlide > 0 ? (
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-1 text-label-md font-bold text-slate-600 hover:text-slate-900 py-2 px-3 rounded-full hover:bg-slate-200/50 transition-all"
              >
                <Icon name="chevron_left" size={18} />
                Back
              </button>
            ) : null}
          </div>

          {/* Progress Indicator Dots */}
          <div className="flex items-center gap-2" aria-label={`Slide ${currentSlide + 1} of ${totalSlides}`}>
            {Array.from({ length: totalSlides }).map((_, index) => {
              const active = currentSlide === index;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => setCurrentSlide(index)}
                  aria-label={`Go to slide ${index + 1}`}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    active
                      ? 'w-8 bg-gradient-to-r from-indigo-600 to-purple-600 shadow-sm'
                      : 'w-2.5 bg-slate-300 hover:bg-slate-400'
                  }`}
                />
              );
            })}
          </div>

          {/* Next Button (Slides 1 & 2) */}
          <div className="w-20 flex justify-end">
            {currentSlide < totalSlides - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-1 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-label-md font-bold py-2 px-4 rounded-full shadow-md hover:shadow-lg active:scale-95 transition-all"
              >
                Next
                <Icon name="chevron_right" size={18} />
              </button>
            ) : null}
          </div>
        </div>
      </footer>
    </div>
  );
}
