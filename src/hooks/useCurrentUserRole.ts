import { useEffect, useState } from 'react';
import { readStoredSession, type UserRole } from '@/features/auth/LoginScreen';

export interface UserRoleState {
  role: UserRole;
  isStudent: boolean;
  isFaculty: boolean;
  isHOD: boolean;
  isPrincipal: boolean;
  canMarkAttendance: boolean;
  userLabel: string;
}

export function useCurrentUserRole(): UserRoleState {
  const [role, setRole] = useState<UserRole>(() => readStoredSession()?.role ?? 'student');

  useEffect(() => {
    const handleSync = () => {
      const session = readStoredSession();
      setRole(session?.role ?? 'student');
    };

    window.addEventListener('classora:auth-change', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('classora:auth-change', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const isStudent = role === 'student';
  const isFaculty = role === 'faculty';
  const isHOD = role === 'hod';
  const isPrincipal = role === 'principal';
  const canMarkAttendance = isFaculty || isHOD || isPrincipal;

  const userLabel = isFaculty
    ? 'Faculty'
    : isHOD
    ? 'HOD'
    : isPrincipal
    ? 'Principal'
    : 'Student';

  return {
    role,
    isStudent,
    isFaculty,
    isHOD,
    isPrincipal,
    canMarkAttendance,
    userLabel,
  };
}
