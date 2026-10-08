import { useState } from 'react';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { AttendanceGauge } from '@/components/attendance/AttendanceGauge';
import { Icon } from '@/components/ui/Icon';

export function OnboardingSlide1() {
  const [simulatedState, setSimulatedState] = useState<'attended' | 'skipped' | 'default'>('default');

  // Dynamic values based on simulation
  const percentage = simulatedState === 'attended' ? 91.2 : simulatedState === 'skipped' ? 84.6 : 88.5;
  const safeMisses = simulatedState === 'attended' ? 5 : simulatedState === 'skipped' ? 1 : 4;
  const isSafe = percentage >= 85;

  return (
    <div className="flex flex-col items-center justify-between text-center min-h-full w-full max-w-app mx-auto px-4 py-2 sm:py-4">
      {/* Header section */}
      <div className="flex flex-col items-center space-y-2 animate-fade-in">
        <div className="relative inline-flex items-center justify-center p-2 rounded-2xl bg-gradient-to-b from-indigo-50 to-white border border-indigo-100/80 shadow-sm">
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-emerald-500/20 blur-md opacity-75" />
          <BrandLogo size="md" className="relative z-10" />
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-label-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200/60 shadow-2xs">
          <Icon name="verified" size={13} className="text-indigo-600" />
          Section A CSE • Academic Assistant
        </span>

        <h1 className="text-headline-lg sm:text-display-lg font-extrabold text-slate-900 tracking-tight leading-tight mt-1">
          Never Dip Below Your{' '}
          <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 bg-clip-text text-transparent">
            85% Target.
          </span>
        </h1>

        <p className="text-body-md text-slate-600 max-w-[34ch] leading-relaxed font-medium">
          Real-time safety margin tracking, lab-period weighting, and instant skip calculations built for college students.
        </p>
      </div>

      {/* Interactive 3D Showcase Card */}
      <div className="w-full my-4 sm:my-6 animate-rise-in">
        <div className="relative rounded-card glass-card-elevated p-4 sm:p-5 border border-white/90 shadow-xl overflow-hidden">
          {/* Subtle ambient card glow background */}
          <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />

          {/* Card Header Tag */}
          <div className="flex items-center justify-between mb-3 text-left">
            <span className="text-label-xs font-bold uppercase tracking-wider text-slate-400">
              Interactive Preview
            </span>
            <span className="inline-flex items-center gap-1 text-label-xs font-semibold text-slate-500 bg-slate-100/80 px-2.5 py-0.5 rounded-full border border-slate-200/60">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
              Live Simulation
            </span>
          </div>

          {/* Attendance Speedometer Gauge */}
          <div className="flex justify-center my-1 transform scale-95 sm:scale-100 transition-transform">
            <AttendanceGauge value={percentage} target={85} size={200} caption="Overall Attendance" />
          </div>

          {/* Live Status Pill */}
          <div className="flex items-center justify-center mt-2">
            {isSafe ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200/80 px-4 py-1.5 text-label-md font-bold text-emerald-800 shadow-2xs">
                <Icon name="check_circle" size={16} className="text-emerald-600" filled />
                Safe Zone · {safeMisses} {safeMisses === 1 ? 'Miss' : 'Misses'} Buffer Left
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full bg-red-50 border border-red-200/80 px-4 py-1.5 text-label-md font-bold text-red-800 shadow-2xs">
                <Icon name="warning" size={16} className="text-red-600" filled />
                Below Target · Attend Next Class!
              </span>
            )}
          </div>

          {/* Interactive Simulation Controls */}
          <div className="mt-4 pt-3 border-t border-slate-200/60">
            <p className="text-label-xs font-semibold text-slate-500 mb-2">Tap to simulate an upcoming class:</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSimulatedState(simulatedState === 'attended' ? 'default' : 'attended')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-label-md font-bold transition-all duration-200 ${
                  simulatedState === 'attended'
                    ? 'bg-emerald-600 text-white shadow-md scale-[1.02]'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 hover:bg-emerald-100/70'
                }`}
              >
                <Icon name="check" size={16} />
                {simulatedState === 'attended' ? 'Attended ✓' : '+ Attend Class'}
              </button>

              <button
                type="button"
                onClick={() => setSimulatedState(simulatedState === 'skipped' ? 'default' : 'skipped')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-label-md font-bold transition-all duration-200 ${
                  simulatedState === 'skipped'
                    ? 'bg-red-600 text-white shadow-md scale-[1.02]'
                    : 'bg-red-50 text-red-700 border border-red-200/80 hover:bg-red-100/70'
                }`}
              >
                <Icon name="close" size={16} />
                {simulatedState === 'skipped' ? 'Skipped ✕' : '- Skip Class'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Pills */}
      <div className="grid grid-cols-3 gap-2 w-full max-w-app text-left">
        <div className="rounded-2xl bg-white/90 p-2.5 border border-slate-200/70 shadow-2xs">
          <Icon name="shield" size={18} className="text-indigo-600 mb-1" />
          <p className="text-label-xs font-bold text-slate-900">Buffer Guard</p>
          <p className="text-[10.5px] text-slate-500 font-medium leading-tight mt-0.5">Alerts before dipping</p>
        </div>
        <div className="rounded-2xl bg-white/90 p-2.5 border border-slate-200/70 shadow-2xs">
          <Icon name="scale" size={18} className="text-purple-600 mb-1" />
          <p className="text-label-xs font-bold text-slate-900">Lab Weights</p>
          <p className="text-[10.5px] text-slate-500 font-medium leading-tight mt-0.5">Period vs Session</p>
        </div>
        <div className="rounded-2xl bg-white/90 p-2.5 border border-slate-200/70 shadow-2xs">
          <Icon name="bolt" size={18} className="text-amber-500 mb-1" />
          <p className="text-label-xs font-bold text-slate-900">Can I Skip?</p>
          <p className="text-[10.5px] text-slate-500 font-medium leading-tight mt-0.5">Instant projection</p>
        </div>
      </div>
    </div>
  );
}
