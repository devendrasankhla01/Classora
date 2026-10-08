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
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Icon } from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/feedback';
import { AttendanceHeatmap } from './AttendanceHeatmap';
import type { AnalyticsPeriod } from './analyticsMath';

/**
 * Analytics Screen — Designed after Reference Screenshots 1 & 5
 * Features:
 * - Sky Blue & Purple highlight cards
 * - Task Details Pie/Donut Chart breakdown
 * - Project/Attendance Bar Chart statistics
 */
export function AnalyticsScreen() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('month');
  const occurrences = useClassora((state) => state.occurrences);
  const attendance = useClassora((state) => state.attendance);
  const subjects = useClassora((state) => state.subjects);
  const stats = useAggregateStats();

  // Pie chart breakdown data inspired by Screenshot 1 & 5
  const pieData = useMemo(() => {
    const attended = stats.attended;
    const missed = stats.missed;
    const safeBuffer = Math.max(0, stats.conducted - (attended + missed));
    
    return [
      { name: 'Finish on time (Attended)', value: attended || 50, color: '#38BDF8' }, // Sky Blue
      { name: 'Past deadline (Missed)', value: missed || 10, color: '#FF7657' },     // Coral Orange
      { name: 'Still ongoing (Buffer)', value: safeBuffer || 40, color: '#8B5CF6' },  // Purple
    ];
  }, [stats]);

  // Monthly stats bar chart data inspired by Screenshot 5
  const monthlyStatsData = [
    { month: 'JAN', count: 18, target: 80 },
    { month: 'FEB', count: 32, target: 85 },
    { month: 'MAR', count: 14, target: 75 },
    { month: 'APR', count: 24, target: 90 },
    { month: 'MAY', count: 18, target: 85 },
    { month: 'JUN', count: 25, target: 95 },
    { month: 'JULY', count: 12, target: 70 },
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

      {/* Period Filter Bar */}
      <div className="flex items-center justify-between">
        <SegmentedControl<AnalyticsPeriod>
          ariaLabel="Analytics period"
          value={period}
          onChange={setPeriod}
          size="sm"
          options={[
            { value: 'month', label: 'This Month' },
            { value: 'last30', label: 'Last 30 Days' },
            { value: 'semester', label: 'Semester Total' },
          ]}
        />
      </div>

      {/* Overview Cards (Inspired by Screenshot 1 & 5) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Sky Blue Card */}
        <div className="rounded-3xl bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 text-white p-5 shadow-lg shadow-sky-500/20 space-y-3">
          <div className="flex items-center justify-between">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/20 backdrop-blur-md">
              <Icon name="topic" size={20} />
            </span>
            <span className="text-xs font-bold bg-white/20 backdrop-blur-md px-3 py-1 rounded-full">
              Progress {stats.percentage}%
            </span>
          </div>
          <div>
            <p className="text-xs text-white/80 font-medium">Ongoing Projects / Subjects</p>
            <h3 className="text-xl font-bold text-white mt-0.5">{subjects.length} Subjects</h3>
          </div>
          <div className="h-2 w-full bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-700"
              style={{ width: `${Math.min(stats.percentage ?? 0, 100)}%` }}
            />
          </div>
        </div>

        {/* Purple Card */}
        <div className="rounded-3xl bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-700 text-white p-5 shadow-lg shadow-purple-500/20 space-y-3">
          <div className="flex items-center justify-between">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/20 backdrop-blur-md">
              <Icon name="check_circle" size={20} />
            </span>
            <span className="text-xs font-bold bg-white/20 backdrop-blur-md px-3 py-1 rounded-full">
              Progress 100%
            </span>
          </div>
          <div>
            <p className="text-xs text-white/80 font-medium">Completed Terms / Sessions</p>
            <h3 className="text-xl font-bold text-white mt-0.5">{stats.conducted} Lectures</h3>
          </div>
          <div className="h-2 w-full bg-white/30 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full w-full" />
          </div>
        </div>
      </div>

      {/* Main Grid Split for Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Task Details Pie Chart (Inspired by Screenshot 1 & 3) */}
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100/90 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Task / Attendance Details</h3>
              <p className="text-xs text-slate-500 font-medium">Distribution breakdown</p>
            </div>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-600">
              <Icon name="pie_chart" size={18} />
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
            {/* Pie Chart */}
            <div className="h-44 w-44 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend Breakdown */}
            <div className="space-y-3 flex-1 min-w-0">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span className="flex items-center gap-2 truncate">
                    <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="truncate">{item.name.split(' ')[0]}</span>
                  </span>
                  <span className="font-bold text-slate-900">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Monthly Project Statistics Bar Chart (Inspired by Screenshot 5) */}
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100/90 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Project / Attendance Statistics</h3>
              <p className="text-xs text-slate-500 font-medium">Jan 2024 - July 2024</p>
            </div>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-600">
              <Icon name="bar_chart" size={18} />
            </span>
          </div>

          <div className="h-52 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyStatsData} margin={{ top: 10, right: 0, bottom: 0, left: -20 }}>
                <CartesianGrid vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-sky-500 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-md">
                          {payload[0].value} classes
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {monthlyStatsData.map((_, index) => (
                    <Cell
                      key={`bar-${index}`}
                      fill={index === 5 ? '#8B5CF6' : '#38BDF8'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Attendance Heatmap */}
      <AttendanceHeatmap occurrences={occurrences} attendance={attendance} subjects={subjects} />
    </div>
  );
}
