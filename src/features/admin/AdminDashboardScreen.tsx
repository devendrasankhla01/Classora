import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { Card, SectionHeader } from '@/components/ui/Card';
import { Button, TextInput } from '@/components/ui/controls';
import { Icon } from '@/components/ui/Icon';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { getSupabaseClient, isCloudModeEnabled } from '@/services/cloud/client';
import { MASTER_STUDENT_ROSTER } from '@/services/usnTimetable';

const ADMIN_SESSION_KEY = 'classora_admin_auth_v1';

interface StudentData {
  id: string;
  name: string;
  email: string | null;
  studentId: string | null;
  department: string | null;
  departmentLabel: string | null;
  semesterLabel: string | null;
  attendanceTarget: number;
  createdAt: string;
}

export function AdminDashboardScreen() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true';
  });

  /* Admin Login Form State */
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* Dashboard State */
  const [students, setStudents] = useState<StudentData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [fetchError, setFetchError] = useState<string | null>(null);

  /* Load data whenever authenticated */
  useEffect(() => {
    if (isAuthenticated) {
      void fetchStudentsData();
    }
  }, [isAuthenticated]);

  async function fetchStudentsData() {
    setIsLoading(true);
    setFetchError(null);

    try {
      const client = await getSupabaseClient();
      if (client) {
        // Query profiles directly from Supabase
        const { data, error } = await client
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const mapped: StudentData[] = data.map((row) => ({
            id: String(row.id),
            name: String(row.name ?? 'Student'),
            email: (row.email as string) ?? null,
            studentId: (row.student_id as string) ?? (row.batch_roll as string) ?? null,
            department: (row.department as string) ?? null,
            departmentLabel: (row.department_label as string) ?? 'CSE • Section A',
            semesterLabel: (row.semester_label as string) ?? 'Semester III',
            attendanceTarget: Number(row.attendance_target ?? 75),
            createdAt: String(row.created_at ?? new Date().toISOString()),
          }));

          setStudents(mapped);
          setIsLoading(false);
          return;
        }
      }

      // Fallback: Populate official 64 Section A student roster if cloud database empty
      const officialMaster: StudentData[] = Object.values(MASTER_STUDENT_ROSTER).map((st, idx) => ({
        id: `master-${st.usn}`,
        name: st.name,
        email: `${st.usn.toLowerCase()}@college.edu`,
        studentId: st.usn,
        department: st.department,
        departmentLabel: st.section,
        semesterLabel: 'Semester III',
        attendanceTarget: 75,
        createdAt: new Date(Date.now() - idx * 3600000).toISOString(),
      }));

      setStudents(officialMaster);
    } catch (err) {
      console.error('Failed to load admin student roster:', err);
      setFetchError('Could not connect to database. Showing cached records.');
    } finally {
      setIsLoading(false);
    }
  }

  function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    setIsSubmitting(true);

    setTimeout(() => {
      const cleanLoginId = loginId.trim();
      if (cleanLoginId === 'Dev123' && password === 'Dev@2026') {
        sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
        setIsAuthenticated(true);
        setAuthError(null);
      } else {
        setAuthError('Invalid Admin ID or Password. Check credentials and try again.');
      }
      setIsSubmitting(false);
    }, 400);
  }

  function handleAdminLogout() {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    setIsAuthenticated(false);
    setLoginId('');
    setPassword('');
  }

  function handleExportCSV() {
    if (students.length === 0) return;
    const headers = ['Name', 'Email', 'USN/Roll', 'Department/Section', 'Semester', 'Attendance Target', 'Registered At'];
    const rows = students.map((s) => [
      `"${s.name}"`,
      `"${s.email ?? ''}"`,
      `"${s.studentId ?? ''}"`,
      `"${s.departmentLabel ?? ''}"`,
      `"${s.semesterLabel ?? ''}"`,
      `"${s.attendanceTarget}%"`,
      `"${s.createdAt}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `campusone_students_roster_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /* Filtered students */
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        student.name.toLowerCase().includes(q) ||
        (student.email && student.email.toLowerCase().includes(q)) ||
        (student.studentId && student.studentId.toLowerCase().includes(q)) ||
        (student.departmentLabel && student.departmentLabel.toLowerCase().includes(q));

      const matchesSection =
        selectedSection === 'all' ||
        (student.departmentLabel && student.departmentLabel.toLowerCase().includes(selectedSection.toLowerCase()));

      return matchesQuery && matchesSection;
    });
  }, [students, searchQuery, selectedSection]);

  /* Distinct sections for filter */
  const sections = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.departmentLabel) set.add(s.departmentLabel);
    });
    return Array.from(set);
  }, [students]);

  /* ------------------------------------------------------------------ */
  /* ADMIN LOGIN SCREEN                                                 */
  /* ------------------------------------------------------------------ */
  if (!isAuthenticated) {
    return (
      <div className="min-h-dvh bg-canvas px-4 py-12 flex flex-col justify-center items-center">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <BrandLogo variant="horizontal" size="lg" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold">
              <Icon name="shield" size={14} />
              <span>Admin Security Portal</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 pt-2">Admin Control Dashboard</h1>
            <p className="text-sm text-slate-500">Sign in to monitor student registrations & attendance data</p>
          </div>

          <Card className="p-6 shadow-xl border border-slate-200/80 bg-white/90 backdrop-blur">
            <form onSubmit={handleAdminLogin} className="space-y-4">
              {authError ? (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
                  <Icon name="error" size={16} className="shrink-0 text-red-500" />
                  <span>{authError}</span>
                </div>
              ) : null}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Admin Login ID
                </label>
                <TextInput
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="Enter Admin ID (e.g. Dev123)"
                  autoComplete="username"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <TextInput
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter Admin Password"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={18} />
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full justify-center py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold shadow-md shadow-indigo-500/20"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Verifying Credentials...' : 'Sign In to Dashboard'}
              </Button>
            </form>
          </Card>

          <div className="text-center">
            <Link to="/" className="text-xs font-medium text-slate-500 hover:text-indigo-600 transition inline-flex items-center gap-1">
              <Icon name="arrow_back" size={14} />
              <span>Return to Student App</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /* ADMIN DASHBOARD VIEW                                               */
  /* ------------------------------------------------------------------ */
  return (
    <div className="min-h-dvh bg-slate-50/50 pb-16">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrandLogo variant="horizontal" size="md" />
          <span className="hidden sm:inline-block h-4 w-[1px] bg-slate-300" />
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
            <Icon name="verified_user" size={14} className="text-indigo-600" />
            Admin Intelligence
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            onClick={fetchStudentsData}
            disabled={isLoading}
            className="text-xs font-semibold text-slate-700 hover:bg-slate-100 px-3 py-1.5 rounded-lg"
          >
            <Icon name="refresh" size={16} className={isLoading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <Button
            variant="ghost"
            onClick={handleAdminLogout}
            className="text-xs font-semibold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg"
          >
            <Icon name="logout" size={16} />
            <span>Sign Out</span>
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        {/* Status banner */}
        {fetchError ? (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon name="warning" size={18} className="text-amber-600 shrink-0" />
              <span>{fetchError}</span>
            </div>
            <button onClick={fetchStudentsData} className="underline font-semibold hover:text-amber-900">Retry</button>
          </div>
        ) : null}

        {/* Metrics Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="p-3.5 sm:p-5 glass-card border border-white/80">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Students</span>
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-indigo-50 grid place-items-center text-indigo-600">
                <Icon name="group" size={18} />
              </div>
            </div>
            <div className="mt-2 sm:mt-3 flex items-baseline gap-1.5 sm:gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-slate-900">{students.length}</span>
              <span className="text-[10px] sm:text-xs font-semibold text-emerald-600">Registered</span>
            </div>
          </Card>

          <Card className="p-3.5 sm:p-5 glass-card border border-white/80">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Sections</span>
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-violet-50 grid place-items-center text-violet-600">
                <Icon name="domain" size={18} />
              </div>
            </div>
            <div className="mt-2 sm:mt-3 flex items-baseline gap-1.5 sm:gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-slate-900">{sections.length || 1}</span>
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500">Batches</span>
            </div>
          </Card>

          <Card className="p-3.5 sm:p-5 glass-card border border-white/80">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Target</span>
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-blue-50 grid place-items-center text-blue-600">
                <Icon name="track_changes" size={18} />
              </div>
            </div>
            <div className="mt-2 sm:mt-3 flex items-baseline gap-1.5 sm:gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-slate-900">
                {students.length > 0
                  ? Math.round(students.reduce((acc, s) => acc + s.attendanceTarget, 0) / students.length)
                  : 75}%
              </span>
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500">Target</span>
            </div>
          </Card>

          <Card className="p-3.5 sm:p-5 glass-card border border-white/80">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">DB Status</span>
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-emerald-50 grid place-items-center text-emerald-600">
                <Icon name="cloud_done" size={18} />
              </div>
            </div>
            <div className="mt-2 sm:mt-3 flex items-baseline gap-1.5 sm:gap-2">
              <span className="text-xs sm:text-base font-bold text-slate-900 truncate">
                {isCloudModeEnabled() ? 'Supabase' : 'Local DB'}
              </span>
              <span className="text-[10px] sm:text-xs font-semibold text-emerald-600">Online</span>
            </div>
          </Card>
        </div>

        {/* Student Roster Section */}
        <Card className="p-6 border border-slate-200 bg-white">
          <SectionHeader
            title="Student Roster"
            subtitle="Manage and inspect student profiles, USNs, and attendance targets"
            action={
              <Button
                variant="ghost"
                onClick={handleExportCSV}
                disabled={students.length === 0}
                className="text-xs font-semibold text-indigo-600 hover:bg-indigo-50 border border-indigo-200 px-3.5 py-1.5 rounded-lg flex items-center gap-1.5"
              >
                <Icon name="download" size={16} />
                <span>Export CSV</span>
              </Button>
            }
          />

          {/* Search & Filter Bar */}
          <div className="mt-4 mb-6 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <TextInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by student name, USN (e.g. 4PM25CS...), email..."
                className="pl-9"
              />
              <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            {sections.length > 0 ? (
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="all">All Sections ({students.length})</option>
                {sections.map((sec) => (
                  <option key={sec} value={sec}>
                    {sec}
                  </option>
                ))}
              </select>
            ) : null}
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Student Name</th>
                  <th className="px-4 py-3">USN / Roll No</th>
                  <th className="px-4 py-3">Email Address</th>
                  <th className="px-4 py-3">Department & Section</th>
                  <th className="px-4 py-3">Target %</th>
                  <th className="px-4 py-3 text-right">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      <div className="flex justify-center items-center gap-2">
                        <Icon name="refresh" size={18} className="animate-spin text-indigo-600" />
                        <span>Loading student roster from database...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No student profiles found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3.5 font-semibold text-slate-900 flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white grid place-items-center font-bold text-xs uppercase">
                          {student.name.charAt(0)}
                        </div>
                        <span>{student.name}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono font-bold text-xs border border-indigo-200">
                          {student.studentId || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">{student.email || '—'}</td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                          {student.departmentLabel || 'CSE • Section A'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-emerald-600">
                        {student.attendanceTarget}%
                      </td>
                      <td className="px-4 py-3.5 text-right text-slate-400 text-[11px]">
                        {new Date(student.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  );
}
