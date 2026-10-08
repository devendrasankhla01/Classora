import { useState } from 'react';
import { Link } from 'react-router-dom';

import { useClassora } from '@/app/store';
import { useMissingAttendance, useNow, useTodayOccurrences, useAggregateStats } from '@/hooks/useScheduleData';
import { AppHeader } from '@/components/layout/AppHeader';
import { EmptyState } from '@/components/ui/feedback';
import { Icon } from '@/components/ui/Icon';
import { TimelineClassCard } from '@/features/shared/TimelineClassCard';
import { formatLongDate, todayKey } from '@/lib/date';
import { NextClassCard } from './NextClassCard';
import { AttendanceOverviewCard } from './AttendanceOverviewCard';
import { SmartInsightCard } from './SmartInsightCard';

/**
 * Home Screen — Styled exactly after the shahinurstk02 Tasknur UI reference images.
 * Features:
 * - Dynamic multi-device responsive grid (Mobile stack, Tablet/Desktop split columns)
 * - Sky Blue & Purple highlight overview cards with progress meters
 * - Task list with status pills & horizontal progress bars
 */
export function HomeScreen() {
  const profile = useClassora((state) => state.profile);
  const notifications = useClassora((state) => state.notifications);
  const today = useTodayOccurrences();
  const missing = useMissingAttendance();
  const now = useNow();
  const stats = useAggregateStats();

  const [filterTab, setFilterTab] = useState<'all' | 'ongoing' | 'completed'>('all');

  const dateKey = todayKey();
  const unread = notifications.filter((notification) => !notification.readAt).length;
  const yesterdayMissing = missing.filter((occurrence) => occurrence.date < dateKey);

  // Filter classes based on selected filter tab
  const filteredToday = today.filter((occ) => {
    if (filterTab === 'all') return true;
    const isPast = new Date(occ.endDateTime).getTime() <= now.getTime();
    if (filterTab === 'completed') return isPast;
    if (filterTab === 'ongoing') return !isPast;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header matching Reference Screenshots */}
      <AppHeader
        title={`Hi, ${profile?.name?.split(' ')[0] ?? 'Student'}`}
        overline={formatLongDate(dateKey)}
        unreadCount={unread}
        filterTab={filterTab}
        onFilterChange={setFilterTab}
      />

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
              className="flex items-center gap-3.5 rounded-3xl bg-amber-50 p-4 border border-amber-200/80 shadow-sm transition active:scale-[0.99] hover:bg-amber-100/60"
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

          {/* Highlight Overview Cards (Inspired by Screenshots 3 & 5) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Project Overview</h2>
              <span className="text-xs font-semibold text-sky-600">Active Term</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Sky Blue Highlight Card */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 text-white p-5 shadow-lg shadow-sky-500/20 flex flex-col justify-between h-36">
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/20 backdrop-blur-md text-white">
                    <Icon name="auto_stories" size={20} />
                  </span>
                  <span className="text-xs font-bold bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full">
                    Target: {profile?.attendanceTarget ?? 85}%
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Attendance Rate</h3>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-white/90">
                      <span>Overall Progress</span>
                      <span>{stats.percentage}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/30 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(stats.percentage ?? 0, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Electric Purple Highlight Card */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-700 text-white p-5 shadow-lg shadow-purple-500/20 flex flex-col justify-between h-36">
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/20 backdrop-blur-md text-white">
                    <Icon name="event_note" size={20} />
                  </span>
                  <span className="text-xs font-bold bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full">
                    {today.length} Classes Today
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Timetable Status</h3>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-white/90">
                      <span>Attended</span>
                      <span>{stats.attended} / {stats.conducted}</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/30 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white rounded-full transition-all duration-700"
                        style={{ width: `${stats.conducted > 0 ? (stats.attended / stats.conducted) * 100 : 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Today's Schedule Section */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Today's Schedule</h2>
              <Link to="/timetable" className="text-xs font-bold text-sky-600 hover:underline">
                View Timetable
              </Link>
            </div>

            {filteredToday.length === 0 ? (
              <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100 text-center">
                <EmptyState
                  icon="beach_access"
                  title="No classes scheduled"
                  message="Your schedule is clear for this filter. Enjoy the break!"
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredToday.map((occurrence) => (
                  <TimelineClassCard key={occurrence.id} occurrence={occurrence} now={now} />
                ))}
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
