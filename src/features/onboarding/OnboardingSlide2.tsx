import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';

type ShowcaseTab = 'schedule' | 'recovery' | 'audits';

export function OnboardingSlide2() {
  const [activeTab, setActiveTab] = useState<ShowcaseTab>('schedule');

  return (
    <div className="flex flex-col items-center justify-between text-center min-h-full w-full max-w-app mx-auto px-4 py-2 sm:py-4">
      {/* Header section */}
      <div className="flex flex-col items-center space-y-2 animate-fade-in">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-label-xs font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200/60 shadow-2xs">
          <Icon name="explore" size={14} className="text-purple-600" />
          Feature Discovery
        </span>

        <h1 className="text-headline-lg sm:text-display-lg font-extrabold text-slate-900 tracking-tight leading-tight mt-1">
          Smart Timetable &{' '}
          <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-sky-600 bg-clip-text text-transparent">
            Proactive Recovery.
          </span>
        </h1>

        <p className="text-body-md text-slate-600 max-w-[34ch] leading-relaxed font-medium">
          Handle room swaps, faculty replacements, double-block labs, and automatic recovery plans with ease.
        </p>
      </div>

      {/* Interactive Feature Tabs */}
      <div className="w-full my-3 sm:my-5 animate-rise-in">
        {/* Tab Switcher Bar */}
        <div className="flex p-1 rounded-2xl bg-slate-200/70 border border-slate-300/40 mb-3 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            className={`flex-1 py-2 px-2 rounded-xl text-label-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 ${
              activeTab === 'schedule'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icon name="calendar_today" size={14} />
            Schedule
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('recovery')}
            className={`flex-1 py-2 px-2 rounded-xl text-label-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 ${
              activeTab === 'recovery'
                ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icon name="trending_up" size={14} />
            Recovery
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('audits')}
            className={`flex-1 py-2 px-2 rounded-xl text-label-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 ${
              activeTab === 'audits'
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icon name="event_repeat" size={14} />
            Calendar
          </button>
        </div>

        {/* Tab Preview Display Container */}
        <div className="relative rounded-card glass-card-elevated p-4 border border-white/90 shadow-xl overflow-hidden min-h-[220px] flex flex-col justify-between text-left">
          {/* TAB 1: SCHEDULE */}
          {activeTab === 'schedule' && (
            <div className="space-y-2.5 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-label-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200/60">
                  Today's Live Schedule • Section A
                </span>
                <span className="text-[11px] font-semibold text-slate-400">Wed, Oct 14</span>
              </div>

              {/* Lecture 1 */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/70 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-8 rounded-full bg-indigo-500" />
                  <div>
                    <p className="text-label-md font-bold text-slate-900">Data Structures (DSA)</p>
                    <p className="text-[11px] text-slate-500">08:00 AM – 09:00 AM • Room C-203</p>
                  </div>
                </div>
                <span className="text-label-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Attended ✓
                </span>
              </div>

              {/* Lecture 2 (Replacement) */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-purple-50/70 border border-purple-200/80 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-8 rounded-full bg-purple-600" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-label-md font-bold text-purple-950">Operating Systems (OS)</p>
                      <span className="text-[9.5px] font-bold uppercase bg-purple-200 text-purple-800 px-1.5 py-0.2 rounded">
                        Swap
                      </span>
                    </div>
                    <p className="text-[11px] text-purple-800/80">09:00 AM – 10:00 AM • Room C-204</p>
                  </div>
                </div>
                <span className="text-label-xs font-semibold text-purple-700">Replaced DM</span>
              </div>

              {/* Lecture 3 (Lab Session) */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200/60 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-8 rounded-full bg-emerald-500" />
                  <div>
                    <p className="text-label-md font-bold text-slate-900">Python Programming Lab</p>
                    <p className="text-[11px] text-slate-500">01:30 PM – 03:30 PM • CC LAB 3</p>
                  </div>
                </div>
                <span className="text-label-xs font-semibold text-slate-500">2-Period Block</span>
              </div>
            </div>
          )}

          {/* TAB 2: RECOVERY */}
          {activeTab === 'recovery' && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-label-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200/60">
                  ⚡ Proactive Recovery Engine
                </span>
                <span className="text-[11px] font-semibold text-purple-700 font-mono">Target: 85%</span>
              </div>

              <div className="p-3 rounded-xl bg-gradient-to-r from-purple-50 via-indigo-50 to-white border border-purple-200/80 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-label-md font-bold text-slate-900">Discrete Mathematics (DM)</p>
                    <p className="text-[11px] text-red-600 font-semibold">Current: 78.0% (Below Target)</p>
                  </div>
                  <span className="text-metric-sm font-extrabold text-purple-700 font-mono">+2 Classes</span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10.5px] text-slate-500 font-medium">
                    <span>78.0%</span>
                    <span className="font-bold text-emerald-700">Projected: 86.5%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-purple-500 to-emerald-500 rounded-full w-[86%]" />
                  </div>
                </div>

                <p className="text-[11.5px] text-slate-600 font-medium pt-1">
                  💡 Attend the next <span className="font-bold text-slate-900">2 consecutive lectures</span> to jump back into the Safe Zone by <span className="font-semibold text-purple-700">Oct 16</span>.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: AUDITS */}
          {activeTab === 'audits' && (
            <div className="space-y-2.5 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-label-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
                  🔔 Calendar Overrides & Audit Log
                </span>
                <span className="text-[11px] font-semibold text-slate-400">Semester III</span>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80">
                <Icon name="event" size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-label-md font-bold text-amber-950">Working Saturday • Oct 17</p>
                  <p className="text-[11px] text-amber-800">Following Monday Timetable schedule for contact lectures.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-100/80 border border-slate-200/80">
                <Icon name="cancel" size={18} className="text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-label-md font-bold text-slate-900">Class Cancelled • Oct 12</p>
                  <p className="text-[11px] text-slate-600">Computer Networks cancelled due to faculty seminar.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Value Summary Cards */}
      <div className="grid grid-cols-2 gap-2.5 w-full max-w-app text-left">
        <div className="rounded-2xl bg-white/90 p-3 border border-slate-200/70 shadow-2xs flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
            <Icon name="auto_awesome" size={20} />
          </div>
          <div>
            <p className="text-label-sm font-bold text-slate-900">Zero Manual Math</p>
            <p className="text-[11px] text-slate-500">Auto-calculated safe margins</p>
          </div>
        </div>

        <div className="rounded-2xl bg-white/90 p-3 border border-slate-200/70 shadow-2xs flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
            <Icon name="history" size={20} />
          </div>
          <div>
            <p className="text-label-sm font-bold text-slate-900">Version Registry</p>
            <p className="text-[11px] text-slate-500">Timetable history preserved</p>
          </div>
        </div>
      </div>
    </div>
  );
}
