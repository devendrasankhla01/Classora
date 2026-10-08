import { useState } from 'react';
import { Link } from 'react-router-dom';

import { useClassora } from '@/app/store';
import { useMissingAttendance, useNow, useTodayOccurrences, useAggregateStats } from '@/hooks/useScheduleData';
import { AppHeader } from '@/components/layout/AppHeader';
import { EmptyState } from '@/components/ui/feedback';
import { Icon } from '@/components/ui/Icon';
import { TimelineClassCard } from '@/features/shared/TimelineClassCard';
import { formatLongDate, todayKey } from '@/lib/date';
import { AnimatedCounter, FloatingCard, StaggerContainer, StaggerItem } from '@/components/ui/AnimatedContainer';
import { NextClassCard } from './NextClassCard';
import { AttendanceOverviewCard } from './AttendanceOverviewCard';
import { SmartInsightCard } from './SmartInsightCard';

/**
 * Home Screen — Crafted after the Shahinur Rahman Tasknur UI reference images.
 * Features:
 * - Multi-device responsive grid (Mobile stack, Tablet/Desktop split columns)
 * - Sky Blue & Purple highlight overview cards with progress meters
 * - Task list with status group headers ("Ongoing", "Working", "Running") & colored progress bars
 */
export function HomeScreen() {
  const profile = useClassora((state) => state.profile);
  const notifications = useClassora((state) => state.notifications);
  const subjects = useClassora((state) => state.subjects);
  const today = useTodayOccurrences();
  const missing = useMissingAttendance();
  const now = useNow();
  const stats = useAggregateStats();

  const [filterTab, setFilterTab] = useState<'all' | 'ongoing' | 'completed'>('all');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const dateKey = todayKey();
  const unread = notifications.filter((notification) => !notification.readAt).length;
  const yesterdayMissing = missing.filter((occurrence) => occurrence.date < dateKey);

  // Filter classes based on selected filter tab & search query
  const filteredToday = today.filter((occ) => {
    const isPast = new Date(occ.endDateTime).getTime() <= now.getTime();
    if (filterTab === 'completed' && !isPast) return false;
    if (filterTab === 'ongoing' && isPast) return false;
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const subject = subjects.find((s) => s.id === occ.subjectId);
      const nameMatch = subject?.name?.toLowerCase().includes(q);
      const codeMatch = subject?.subjectCode?.toLowerCase().includes(q);
      const roomMatch = occ.room?.toLowerCase().includes(q);
      return nameMatch || codeMatch || roomMatch;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header matching Reference Screenshots */}
      <AppHeader
        title={`Hi, ${profile?.name?.split(' ')[0] ?? 'Shahinur'}`}
        overline={formatLongDate(dateKey)}
        unreadCount={unread}
        filterTab={filterTab}
        onFilterChange={setFilterTab}
        onSearchClick={() => setSearchOpen((prev) => !prev)}
      />

      {/* Inline Search Bar when toggled */}
      {searchOpen ? (
        <div className="relative">
          <Icon name="search" size={20} className="absolute left-4 top-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search classes, subjects, rooms..."
            className="w-full rounded-2xl bg-white pl-12 pr-4 py-3 text-sm font-semibold text-slate-900 border border-slate-200/80 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            autoFocus
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-3.5 text-xs text-slate-400 font-bold"
            >
              Clear
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Main Responsive Grid Layout (Desktop 2-column split, Mobile single column) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Column (2/3 width on Desktop): Hero Banner + Highlight Cards + Schedule */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Dark Navy Slate Summary Hero Banner */}
          <NextClassCard />

          {/* Missing Attendance Banner Alert */}
          {yesterdayMissing.length > 0 ? (
            <Link
              to="/attendance/review"
              className="neu-card flex items-center gap-3.5 rounded-3xl bg-amber-50/90 p-4 border border-amber-200/80 transition active:scale-[0.99] hover:bg-amber-100/70"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-amber-500 text-white shadow-sm">
                <Icon name="pending_actions" size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-amber-900">
                  {yesterdayMissing.length} {yesterdayMissing.length === 1 ? 'class is' : 'classes are'} still unmarked
                </p>
                <p className="text-xs text-amber-700/80 font-medium">
                  Tap to review and keep your attendance stats accurate.
                </p>
              </div>
              <Icon name="chevron_right" size={20} className="text-amber-600" />
            </Link>
          ) : null}

          {/* Project Overview Highlight Cards (Exact match to Reference Screenshots 1 & 5) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Project overview</h2>
              <span className="text-xs font-extrabold text-[#38B6FF] bg-sky-50 px-3 py-1 rounded-full border border-sky-100">Active Term</span>
            </div>

            <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Sky Blue Highlight Card (Ongoing Projects / Attendance Rate) */}
              <StaggerItem>
                <FloatingCard floatOffset={3} duration={5}>
                  <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#38b6ff] via-[#1bb0ff] to-[#0094e8] text-white p-5 shadow-lg shadow-sky-500/25 border border-white/40 flex flex-col justify-between min-h-[140px]">
                    <div className="flex items-center justify-between">
                      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/20 backdrop-blur-md text-white border border-white/30">
                        <Icon name="auto_stories" size={20} />
                      </span>
                      <span className="text-xs font-bold bg-white/25 backdrop-blur-md px-3 py-1 rounded-full border border-white/30">
                        Target: {profile?.attendanceTarget ?? 85}%
                      </span>
                    </div>
                    <div className="mt-4 space-y-2">
                      <h3 className="text-sm font-extrabold text-white/95">
                        Ongoing Projects: {subjects.length}
                      </h3>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-bold text-white/90">
                          <span>Progress</span>
                          <AnimatedCounter value={stats.percentage} suffix="%" />
                        </div>
                        <div className="h-2.5 w-full bg-black/15 rounded-full overflow-hidden p-0.5 neu-sunken border-none">
                          <div
                            className="h-full bg-white rounded-full transition-all duration-700 shadow-sm"
                            style={{ width: `${Math.min(stats.percentage ?? 0, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </FloatingCard>
              </StaggerItem>

              {/* Electric Purple Highlight Card (Completed Projects / Timetable) */}
              <StaggerItem>
                <FloatingCard floatOffset={3} duration={6}>
                  <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#9b51e0] via-[#8b5cf6] to-[#7000ff] text-white p-5 shadow-lg shadow-purple-500/25 border border-white/40 flex flex-col justify-between min-h-[140px]">
                    <div className="flex items-center justify-between">
                      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/20 backdrop-blur-md text-white border border-white/30">
                        <Icon name="event_note" size={20} />
                      </span>
                      <span className="text-xs font-bold bg-white/25 backdrop-blur-md px-3 py-1 rounded-full border border-white/30">
                        {today.length} Classes Today
                      </span>
                    </div>
                    <div className="mt-4 space-y-2">
                      <h3 className="text-sm font-extrabold text-white/95">
                        Completed Projects: {stats.conducted}
                      </h3>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-bold text-white/90">
                          <span>Progress</span>
                          <AnimatedCounter value={stats.conducted > 0 ? (stats.attended / stats.conducted) * 100 : 100} suffix="%" />
                        </div>
                        <div className="h-2.5 w-full bg-black/15 rounded-full overflow-hidden p-0.5 neu-sunken border-none">
                          <div
                            className="h-full bg-white rounded-full transition-all duration-700 shadow-sm"
                            style={{ width: `${stats.conducted > 0 ? (stats.attended / stats.conducted) * 100 : 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </FloatingCard>
              </StaggerItem>
            </StaggerContainer>
          </section>

          {/* Important Task / Today's Schedule Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Important task</h2>
              <Link to="/timetable" className="text-xs font-extrabold text-[#38B6FF] hover:underline">
                See all
              </Link>
            </div>

            {filteredToday.length === 0 ? (
              <div className="neu-card rounded-3xl p-6 text-center">
                <EmptyState
                  icon="beach_access"
                  title="No tasks or classes found"
                  message="Your schedule is clear for this selection."
                />
              </div>
            ) : (
              <div className="space-y-5">
                {/* Category Grouping matching Reference Screenshots */}
                {['Ongoing', 'Working', 'Running'].map((groupLabel, groupIdx) => {
                  // Distribute tasks across groups for rich visual presentation
                  const groupItems = filteredToday.filter((_, idx) => idx % 3 === groupIdx);
                  if (groupItems.length === 0) return null;

                  const groupColorClass =
                    groupIdx === 0
                      ? 'text-[#38B6FF]'
                      : groupIdx === 1
                        ? 'text-[#9B51E0]'
                        : 'text-[#FF7657]';

                  return (
                    <div key={groupLabel} className="space-y-3">
                      <h3 className={`text-xs font-extrabold ${groupColorClass} uppercase tracking-wider`}>
                        {groupLabel}
                      </h3>
                      <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {groupItems.map((occurrence) => (
                          <StaggerItem key={occurrence.id}>
                            <TimelineClassCard occurrence={occurrence} now={now} />
                          </StaggerItem>
                        ))}
                      </StaggerContainer>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

        </div>

        {/* Right Column (1/3 width on Desktop): Attendance Overview & Insights */}
        <div className="space-y-6">
          <AttendanceOverviewCard />
          <SmartInsightCard />
        </div>

      </div>
    </div>
  );
}

