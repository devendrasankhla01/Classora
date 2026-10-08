import { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
  PieChart,
  Pie,
} from 'recharts';

import { useClassora } from '@/app/store';
import { useAggregateStats } from '@/hooks/useScheduleData';
import { AppHeader } from '@/components/layout/AppHeader';
import { Icon } from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/feedback';
import { AttendanceHeatmap } from './AttendanceHeatmap';
import { AnimatedCounter, StaggerContainer, StaggerItem } from '@/components/ui/AnimatedContainer';

/**
 * Analytics Screen — Crafted after Reference Screenshots 2 & 5 (Tasknur Analytics & Task Details)
 * Features:
 * - Sky Blue & Purple highlight cards ("Ongoing Projects: 16", "Completed Projects: 16")
 * - Project Statistics Bar Chart with active "25 tasks" callout badge
 * - Task Details Pie/Donut Chart breakdown (50% Finish on time, 40% Past deadline, 10% Still ongoing)
 */
export function AnalyticsScreen() {
  const [activeMonthIdx, setActiveMonthIdx] = useState(0);

  const occurrences = useClassora((state) => state.occurrences);
  const attendance = useClassora((state) => state.attendance);
  const subjects = useClassora((state) => state.subjects);
  const stats = useAggregateStats();

  const monthsList = ['Jan 2024', 'Feb 2024', 'Mar 2024', 'Apr 2024', 'May 2024', 'Jun 2024', 'Jul 2024'];

  // Pie chart breakdown data matching Screenshot 1, 3 & 5
  const pieData = useMemo(() => {
    return [
      { name: 'Finish on time', value: 50, color: '#38B6FF' }, // Sky Blue
      { name: 'Past the deadline', value: 40, color: '#9B51E0' }, // Purple
      { name: 'Still ongoing', value: 10, color: '#FF7657' },    // Coral Orange
    ];
  }, []);


  // Monthly stats bar chart data matching Screenshot 5
  const monthlyStatsData = [
    { month: 'JAN', count: 18 },
    { month: 'FEB', count: 32 },
    { month: 'MAR', count: 14 },
    { month: 'APR', count: 24 },
    { month: 'MAY', count: 18 },
    { month: 'JUN', count: 25 },
    { month: 'JULY', count: 12 },
  ];

  if (stats.conducted === 0) {
    return (
      <div className="space-y-6">
        <AppHeader title="Analytics" />
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100 text-center">
          <EmptyState
            icon="insights"
            title="Attendance insights will appear here"
            message="Once your first classes are marked, Classora builds your trend, subject distribution and recovery guidance."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AppHeader title="Analytics" />

      {/* Overview Cards (Exact match to Reference Screenshots 2 & 5) */}
      <div className="space-y-3">
        <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Project overview</h2>
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Sky Blue Card */}
          <StaggerItem className="rounded-3xl bg-gradient-to-br from-[#38b6ff] via-[#1bb0ff] to-[#0094e8] text-white p-5 shadow-lg shadow-sky-500/20 space-y-4">
            <div className="flex items-center justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/20 backdrop-blur-md">
                <Icon name="topic" size={20} />
              </span>
              <span className="text-xs font-bold bg-white/20 backdrop-blur-md px-3 py-1 rounded-full">
                Progress <AnimatedCounter value={stats.percentage} suffix="%" />
              </span>
            </div>
            <div>
              <p className="text-xs text-white/80 font-bold">Ongoing Projects: 16</p>
              <h3 className="text-xl font-black text-white mt-0.5">{subjects.length} Subjects Active</h3>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-white/90">
                <span>Progress</span>
                <span>40%</span>
              </div>
              <div className="h-2 w-full bg-white/30 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full w-[40%]" />
              </div>
            </div>
          </StaggerItem>

          {/* Purple Card */}
          <StaggerItem className="rounded-3xl bg-gradient-to-br from-[#9b51e0] via-[#8b5cf6] to-[#7000ff] text-white p-5 shadow-lg shadow-purple-500/20 space-y-4">
            <div className="flex items-center justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/20 backdrop-blur-md">
                <Icon name="check_circle" size={20} />
              </span>
              <span className="text-xs font-bold bg-white/20 backdrop-blur-md px-3 py-1 rounded-full">
                Progress 100%
              </span>
            </div>
            <div>
              <p className="text-xs text-white/80 font-bold">Completed Projects: 16</p>
              <h3 className="text-xl font-black text-white mt-0.5">{stats.conducted} Lectures Marked</h3>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-white/90">
                <span>Progress</span>
                <span>100%</span>
              </div>
              <div className="h-2 w-full bg-white/30 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full w-full" />
              </div>
            </div>
          </StaggerItem>
        </StaggerContainer>
      </div>

      {/* Charts Section: Side-by-Side on Laptop/Desktop, Stacked on Mobile/Tablet */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Statistics Bar Chart Section matching Screenshot 5 */}
        <div className="neu-card rounded-3xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Project statistics</h3>
            
            {/* Calendar Month Selector matching Screenshot 5 */}
            <div className="flex items-center gap-3 neu-sunken px-3.5 py-1.5 rounded-2xl text-slate-700">
              <span className="text-xs font-extrabold text-slate-900">{monthsList[activeMonthIdx]}</span>
              <Icon name="calendar_today" size={16} className="text-slate-500" />
              <div className="flex items-center gap-1 border-l border-slate-300/60 pl-2">
                <button
                  type="button"
                  onClick={() => setActiveMonthIdx((prev) => Math.max(0, prev - 1))}
                  aria-label="Previous Month"
                  className="text-slate-400 hover:text-slate-700"
                >
                  <Icon name="chevron_left" size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMonthIdx((prev) => Math.min(monthsList.length - 1, prev + 1))}
                  aria-label="Next Month"
                  className="text-slate-400 hover:text-slate-700"
                >
                  <Icon name="chevron_right" size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Bar Chart matching Screenshot 5 styling */}
          <div className="h-56 w-full pt-2 relative">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyStatsData} margin={{ top: 25, right: 0, bottom: 0, left: -25 }}>
                <CartesianGrid vertical={false} stroke="#F1F5F9" strokeDasharray="3 3" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B', fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="relative bg-[#38B6FF] text-white font-extrabold text-xs px-3 py-1.5 rounded-xl shadow-lg shadow-sky-500/30">
                          {payload[0].value} tasks
                          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-6 border-r-6 border-t-6 border-l-transparent border-r-transparent border-t-[#38B6FF]" />
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" radius={[10, 10, 0, 0]}>
                  {monthlyStatsData.map((_, index) => (
                    <Cell
                      key={`bar-${index}`}
                      fill={index === 5 ? '#9B51E0' : '#38B6FF'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Legend row matching Screenshot 5 */}
          <div className="flex items-center justify-center gap-6 pt-2 border-t border-slate-100 text-xs font-extrabold text-slate-600">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#38B6FF]" />
              <span>On-Target</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#9B51E0]" />
              <span>Task-Target</span>
            </div>
          </div>
        </div>

        {/* Task Details Pie / Donut Chart (Exact match to Screenshot 1 & 3) */}
        <div className="neu-card rounded-3xl p-6 space-y-5">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Grocery app design / Task breakdown</h3>
            <p className="text-xs text-slate-400 font-semibold">Distribution status metrics</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
            {/* Donut Chart with percentage labels inside */}
            <div className="h-48 w-48 shrink-0 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend Items matching Screenshot 1 & 3 */}
            <div className="space-y-3 flex-1 min-w-0">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs font-extrabold text-slate-700">
                  <span className="flex items-center gap-2.5 truncate">
                    <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-500 font-semibold truncate">{item.name}</span>
                  </span>
                  <span className="font-extrabold text-slate-900 ml-2">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Heatmap */}
      <AttendanceHeatmap occurrences={occurrences} attendance={attendance} subjects={subjects} />
    </div>
  );
}

