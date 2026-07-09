'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CalendarDays,
  Loader2,
  Search,
  UserCircle2,
  Clock,
  LogIn,
  LogOut,
  Eye,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  getVisitorAttendance,
  registerVisitor,
} from '@/lib/api/peopleanalytics';
import type { VisitorAttendanceResponse } from '@/types/peopleanalytics';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

// Format Helpers
function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDwell(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) {
    return `${h}h ${m}m ${s}s`;
  }
  return `${m}m ${s}s`;
}

function toDateInputValue(date: Date): string {
  return date.toISOString().split('T')[0];
}

export default function VisitorAttendancePage() {
  const router = useRouter();

  // Date range state (default: last 7 days)
  const defaultStart = new Date();
  defaultStart.setDate(defaultStart.getDate() - 7);

  const [startDate, setStartDate] = useState(toDateInputValue(defaultStart));
  const [endDate, setEndDate] = useState(toDateInputValue(new Date()));
  const [searchQuery, setSearchQuery] = useState('');

  const [logs, setLogs] = useState<VisitorAttendanceResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewLog, setPreviewLog] =
    useState<VisitorAttendanceResponse | null>(null);

  // Registration States
  const [registeringLog, setRegisteringLog] =
    useState<VisitorAttendanceResponse | null>(null);
  const [regType, setRegType] = useState<'visitor' | 'employee'>('visitor');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registeringLog) return;
    if (!firstName.trim() || !lastName.trim()) {
      setRegError('First name and last name are required.');
      return;
    }
    if (regType === 'employee' && !employeeCode.trim()) {
      setRegError('Employee ID/Code is required.');
      return;
    }

    setRegLoading(true);
    setRegError(null);
    setRegSuccess(null);

    try {
      const payload = {
        identity_id: registeringLog.identity_id,
        registration_type: regType,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        employee_code: regType === 'employee' ? employeeCode.trim() : undefined,
      };

      const res = await registerVisitor(payload);
      if (res && res.status === 200) {
        setRegSuccess(res.message || 'Registration completed successfully!');
        setTimeout(() => {
          setRegisteringLog(null);
          setFirstName('');
          setLastName('');
          setEmployeeCode('');
          setRegSuccess(null);
          fetchVisitorLogs();
        }, 1500);
      } else {
        setRegError(res?.message || 'Failed to complete registration.');
      }
    } catch (err: any) {
      setRegError(err?.message || 'An error occurred during registration.');
    } finally {
      setRegLoading(false);
    }
  };

  const today = toDateInputValue(new Date());
  const isDateInvalid = startDate && endDate && startDate > endDate;

  const fetchVisitorLogs = async () => {
    if (isDateInvalid) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getVisitorAttendance(startDate, endDate);
      console.log('LOGS DATA RECEIVED:', res.data);
      if (res && res.data) {
        setLogs(res.data);
      } else {
        setLogs([]);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to retrieve visitor attendance logs.');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchVisitorLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter logs by search query (matching identity_id suffix/prefix)
  const filteredLogs = logs.filter((log) => {
    const query = searchQuery.toLowerCase();
    if (!query) return true;
    return log.identity_id.toLowerCase().includes(query);
  });

  // Group filtered logs by entry date (YYYY-MM-DD)
  const groupedLogs: Record<string, VisitorAttendanceResponse[]> = {};
  filteredLogs.forEach((log) => {
    // Get YYYY-MM-DD portion of entry timestamp
    const dateKey = log.visitor_entry_timestamp.split('T')[0];
    if (!groupedLogs[dateKey]) {
      groupedLogs[dateKey] = [];
    }
    groupedLogs[dateKey].push(log);
  });

  // Sort dates descending (latest day first)
  const sortedDates = Object.keys(groupedLogs).sort((a, b) =>
    b.localeCompare(a),
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-0">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-[#1E3048] bg-[#0A0F1E] text-[#5A7A9A] transition-colors hover:border-[#1565C0]/50 hover:bg-[#1E3048] hover:text-[#E8EDF5]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-[#E8EDF5]">
              <CalendarDays className="h-6 w-6 text-[#60A5FA]" />
              Visitor Attendance Register
            </h1>
            <p className="mt-1 text-xs text-[#5A7A9A]">
              Review timeline check-ins, dwell duration, and profile crops of
              anonymous visitors captured across cameras.
            </p>
          </div>
        </div>
      </div>

      {/* Date Pickers & Filters Panel */}
      <div className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="grid grid-cols-2 gap-3 sm:flex sm:items-end">
            <div>
              <label className="mb-1.5 block text-[10px] font-bold tracking-wider text-[#5A7A9A] uppercase">
                Start Date
              </label>
              <input
                type="date"
                max={today}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={cn(
                  'w-full rounded-lg border bg-[#0A0F1E] px-3.5 py-2 text-sm text-[#E8EDF5] transition-colors outline-none sm:w-44',
                  isDateInvalid
                    ? 'border-red-500/70 focus:border-red-500'
                    : 'border-[#1E3048] focus:border-[#1565C0]',
                )}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold tracking-wider text-[#5A7A9A] uppercase">
                End Date
              </label>
              <input
                type="date"
                max={today}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={cn(
                  'w-full rounded-lg border bg-[#0A0F1E] px-3.5 py-2 text-sm text-[#E8EDF5] transition-colors outline-none sm:w-44',
                  isDateInvalid
                    ? 'border-red-500/70 focus:border-red-500'
                    : 'border-[#1E3048] focus:border-[#1565C0]',
                )}
              />
            </div>
          </div>

          <div className="flex-1">
            <label className="mb-1.5 block text-[10px] font-bold tracking-wider text-[#5A7A9A] uppercase">
              Search Visitor ID
            </label>
            <div className="relative">
              <Search className="absolute top-2.5 left-3 h-4 w-4 text-[#5A7A9A]" />
              <input
                type="text"
                placeholder="Search by visitor ID UUID string..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-[#1E3048] bg-[#0A0F1E] py-2 pr-4 pl-9 text-sm text-[#E8EDF5] placeholder-[#5A7A9A] outline-none focus:border-[#1565C0]"
              />
            </div>
          </div>

          <button
            onClick={fetchVisitorLogs}
            disabled={isDateInvalid || loading}
            className={cn(
              'flex cursor-pointer items-center justify-center gap-2 rounded-lg px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all',
              isDateInvalid || loading
                ? 'cursor-not-allowed bg-slate-800 text-[#5A7A9A] shadow-none'
                : 'bg-[#1565C0] shadow-[#1565C0]/15 hover:bg-[#1976D2] hover:shadow-[#1565C0]/25',
            )}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CalendarDays className="h-4 w-4" />
            )}
            Search logs
          </button>
        </div>

        {isDateInvalid && (
          <p className="mt-3 text-xs font-semibold text-red-400">
            ⚠️ Start date cannot be after end date.
          </p>
        )}
      </div>

      {/* Main logs display */}
      {loading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-[#1E3048] bg-[#0D1628]">
          <Loader2 className="h-8 w-8 animate-spin text-[#60A5FA]" />
          <p className="text-sm text-[#5A7A9A]">Loading visitor logs...</p>
        </div>
      ) : error ? (
        <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center">
          <p className="text-sm font-semibold text-red-400">
            Error retrieving data
          </p>
          <p className="text-xs text-[#5A7A9A]">{error}</p>
        </div>
      ) : sortedDates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#1E3048] bg-[#0D1628]/40 py-20 text-center text-[#5A7A9A]">
          <CalendarDays className="mb-3 h-10 w-10 opacity-30" />
          <p className="text-sm font-bold text-[#E8EDF5]">
            No visitor attendance logs found
          </p>
          <p className="mt-1 max-w-sm text-xs">
            Adjust your date range or search query, or run people analytics on
            your CCTV videos to log visitor attendance.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedDates.map((dateStr) => {
            const dayLogs = groupedLogs[dateStr];
            return (
              <div key={dateStr} className="space-y-3">
                {/* Day Header Banner */}
                <div className="flex items-center gap-3 border-b border-[#1E3048]/80 pb-2">
                  <h2 className="text-sm font-bold text-[#E8EDF5]">
                    {formatDateLabel(dateStr)}
                  </h2>
                  <span className="rounded-full bg-[#1565C0]/15 px-2 py-0.5 text-[10px] font-bold text-[#60A5FA]">
                    {dayLogs.length} {dayLogs.length === 1 ? 'visit' : 'visits'}
                  </span>
                </div>

                {/* Day Table Card */}
                <div className="overflow-hidden rounded-xl border border-[#1E3048] bg-[#0D1628]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-[#1E3048] bg-[#0A0F1E]/50">
                          {[
                            'Profile Crop',
                            'Name',
                            'Visitor ID',
                            'Check-In Time',
                            'Check-Out Time',
                            'Dwell Duration',
                            'Occurrences',
                            'Actions',
                          ].map((head) => (
                            <th
                              key={head}
                              className="px-5 py-3 text-left font-bold tracking-wider text-[#5A7A9A] uppercase"
                            >
                              {head}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1E3048]/50">
                        {dayLogs.map((log) => (
                          <tr
                            key={log.id}
                            className="transition-all hover:bg-[#1E3048]/20"
                          >
                            {/* Profile Crop */}
                            <td className="px-5 py-3">
                              <button
                                onClick={() =>
                                  log.photo_path && setPreviewLog(log)
                                }
                                disabled={!log.photo_path}
                                className={cn(
                                  'group relative block h-10 w-10 overflow-hidden rounded-lg border border-[#1E3048] bg-[#0A0F1E] text-left shadow-sm transition-all outline-none',
                                  log.photo_path
                                    ? 'cursor-pointer hover:border-[#1565C0]/60 hover:shadow-md'
                                    : 'cursor-default',
                                )}
                              >
                                {log.photo_path ? (
                                  <>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={`${BACKEND_URL}/${log.photo_path}`}
                                      alt="Visitor Crop"
                                      className="h-full w-full object-cover"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                                      <Eye className="h-4 w-4 text-white" />
                                    </div>
                                  </>
                                ) : (
                                  <div className="flex h-full items-center justify-center bg-[#1E3048]/50">
                                    <UserCircle2 className="h-5 w-5 text-[#5A7A9A]" />
                                  </div>
                                )}
                              </button>
                            </td>

                            {/* Name */}
                            <td className="px-5 py-3 text-[#E8EDF5]">
                              {log.first_name || log.last_name ? (
                                <span className="font-semibold text-slate-200">
                                  {`${log.first_name || ''} ${log.last_name || ''}`.trim()}
                                </span>
                              ) : (
                                <span className="font-mono text-[#5A7A9A]">
                                  -
                                </span>
                              )}
                            </td>

                            {/* Visitor ID */}
                            <td className="px-5 py-3 font-mono text-[#E8EDF5]">
                              <span
                                className="hidden sm:inline"
                                title={log.identity_id}
                              >
                                {log.identity_id}
                              </span>
                              <span className="sm:hidden">
                                {log.identity_id.slice(0, 8)}…
                              </span>
                            </td>

                            {/* Entry Time */}
                            <td className="px-5 py-3 text-[#E8EDF5]">
                              <div className="flex items-center gap-1.5">
                                <LogIn className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                                <span>
                                  {formatTime(log.visitor_entry_timestamp)}
                                </span>
                              </div>
                            </td>

                            {/* Exit Time */}
                            <td className="px-5 py-3 text-[#E8EDF5]">
                              <div className="flex items-center gap-1.5">
                                <LogOut className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                                <span>
                                  {formatTime(log.visitor_exit_timestamp)}
                                </span>
                              </div>
                            </td>

                            {/* Dwell Time */}
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-1.5 font-semibold text-[#60A5FA]">
                                <Clock className="h-3.5 w-3.5 text-[#60A5FA]" />
                                <span>{formatDwell(log.dwell_time)}</span>
                              </div>
                            </td>

                            {/* Occurrences Count */}
                            <td className="px-5 py-3">
                              <span className="text-[#E8EDF5]">
                                {log.occurrence_count}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="px-5 py-3">
                              <button
                                onClick={() => {
                                  setRegisteringLog(log);
                                  setFirstName(log.first_name || '');
                                  setLastName(log.last_name || '');
                                  setRegType('visitor');
                                  setRegError(null);
                                  setRegSuccess(null);
                                }}
                                className="flex cursor-pointer items-center gap-1 rounded bg-[#1565C0] px-3 py-1.5 text-[10px] font-bold text-white shadow-md transition-all outline-none hover:bg-[#1976D2]"
                              >
                                Register
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Photo Preview Modal */}
      {previewLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setPreviewLog(null)}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-2xl border border-[#1E3048] bg-[#0D1628] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-1 bg-gradient-to-r from-[#1565C0] to-[#60A5FA]" />
            <div className="relative flex flex-col items-center gap-4 bg-gradient-to-b from-[#0A0F1E] to-[#0D1628] p-6">
              <button
                onClick={() => setPreviewLog(null)}
                className="absolute top-3 right-3 cursor-pointer rounded-lg p-1.5 text-[#5A7A9A] hover:bg-[#1E3048] hover:text-[#E8EDF5]"
              >
                <X className="h-4 w-4" />
              </button>

              <h3 className="flex w-full items-center gap-2 self-start border-b border-[#1E3048] pb-2 text-sm font-bold text-[#E8EDF5]">
                <Eye className="h-4 w-4 text-[#60A5FA]" />
                Visitor Crop Preview
              </h3>

              <div className="relative h-48 w-48 overflow-hidden rounded-2xl border-4 border-[#1E3048] bg-[#070B14] shadow-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${BACKEND_URL}/${previewLog.photo_path}`}
                  alt="Visitor Crop"
                  className="h-full w-full object-contain"
                />
              </div>

              <div className="w-full space-y-2 rounded-xl border border-[#1E3048]/50 bg-[#0A0F1E]/50 p-4 text-xs">
                <div className="flex items-center justify-between gap-4">
                  <span className="shrink-0 text-[#5A7A9A]">Visitor ID:</span>
                  <span
                    className="w-full truncate text-right font-mono text-[#E8EDF5] select-all"
                    title={previewLog.identity_id}
                  >
                    {previewLog.identity_id}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5A7A9A]">First Seen:</span>
                  <span className="text-[#E8EDF5]">
                    {formatTime(previewLog.visitor_entry_timestamp)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5A7A9A]">Last Seen:</span>
                  <span className="text-[#E8EDF5]">
                    {formatTime(previewLog.visitor_exit_timestamp)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5A7A9A]">Dwell Duration:</span>
                  <span className="font-semibold text-[#60A5FA]">
                    {formatDwell(previewLog.dwell_time)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5A7A9A]">Occurrences:</span>
                  <span className="font-semibold text-[#E8EDF5]">
                    {previewLog.occurrence_count}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Registration Dialog Modal */}
      {registeringLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setRegisteringLog(null)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl border border-[#1E3048] bg-[#0D1628] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-1 bg-gradient-to-r from-[#1565C0] to-[#60A5FA]" />
            <div className="relative flex flex-col gap-4 bg-gradient-to-b from-[#0A0F1E] to-[#0D1628] p-6">
              <button
                onClick={() => setRegisteringLog(null)}
                className="absolute top-3 right-3 cursor-pointer rounded-lg p-1.5 text-[#5A7A9A] outline-none hover:bg-[#1E3048] hover:text-[#E8EDF5]"
              >
                <X className="h-4 w-4" />
              </button>

              <div>
                <h3 className="text-base font-bold text-[#E8EDF5]">
                  Register Profile
                </h3>
                <p className="mt-1 text-xs text-[#5A7A9A]">
                  Register this anonymous visitor ID as a recognized visitor or
                  a formal employee.
                </p>
              </div>

              {/* Crop Image Thumbnail */}
              {registeringLog.photo_path && (
                <div className="flex items-center gap-3 rounded-lg border border-[#1E3048] bg-[#0A0F1E]/50 p-2.5">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-[#1E3048] bg-[#070B14]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`${BACKEND_URL}/${registeringLog.photo_path}`}
                      alt="Visitor Crop Preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1 text-xs">
                    <p className="font-semibold text-[#5A7A9A]">Visitor ID</p>
                    <p
                      className="truncate font-mono text-[#E8EDF5]"
                      title={registeringLog.identity_id}
                    >
                      {registeringLog.identity_id}
                    </p>
                  </div>
                </div>
              )}

              <form
                onSubmit={handleRegisterSubmit}
                className="space-y-4 text-xs"
              >
                {/* Segment Switcher */}
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold tracking-wider text-[#5A7A9A] uppercase">
                    Registration Type
                  </label>
                  <div className="grid grid-cols-2 rounded-lg border border-[#1E3048] bg-[#0A0F1E] p-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setRegType('visitor');
                        setRegError(null);
                      }}
                      className={cn(
                        'cursor-pointer rounded-md py-1.5 text-center font-semibold transition-all outline-none',
                        regType === 'visitor'
                          ? 'bg-[#1565C0] text-white shadow'
                          : 'text-[#5A7A9A] hover:text-[#E8EDF5]',
                      )}
                    >
                      Visitor
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRegType('employee');
                        setRegError(null);
                      }}
                      className={cn(
                        'cursor-pointer rounded-md py-1.5 text-center font-semibold transition-all outline-none',
                        regType === 'employee'
                          ? 'bg-[#1565C0] text-white shadow'
                          : 'text-[#5A7A9A] hover:text-[#E8EDF5]',
                      )}
                    >
                      Employee
                    </button>
                  </div>
                </div>

                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold tracking-wider text-[#5A7A9A] uppercase">
                      First Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full rounded-lg border border-[#1E3048] bg-[#0A0F1E] px-3 py-2 text-sm text-[#E8EDF5] placeholder-[#5A7A9A] transition-colors outline-none focus:border-[#1565C0]"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold tracking-wider text-[#5A7A9A] uppercase">
                      Last Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full rounded-lg border border-[#1E3048] bg-[#0A0F1E] px-3 py-2 text-sm text-[#E8EDF5] placeholder-[#5A7A9A] transition-colors outline-none focus:border-[#1565C0]"
                    />
                  </div>
                </div>

                {/* Employee ID Field */}
                {regType === 'employee' && (
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold tracking-wider text-[#5A7A9A] uppercase">
                      Employee ID / Code
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. EMP001"
                      value={employeeCode}
                      onChange={(e) => setEmployeeCode(e.target.value)}
                      className="w-full rounded-lg border border-[#1E3048] bg-[#0A0F1E] px-3 py-2 text-sm text-[#E8EDF5] placeholder-[#5A7A9A] transition-colors outline-none focus:border-[#1565C0]"
                    />
                  </div>
                )}

                {/* Error/Success Feedbacks */}
                {regError && (
                  <p className="rounded-lg border border-red-500/20 bg-red-500/10 p-2.5 text-xs font-semibold text-red-400">
                    ⚠️ {regError}
                  </p>
                )}
                {regSuccess && (
                  <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-xs font-semibold text-emerald-400">
                    ✓ {regSuccess}
                  </p>
                )}

                {/* Footer Buttons */}
                <div className="flex justify-end gap-2.5 border-t border-[#1E3048] pt-4">
                  <button
                    type="button"
                    onClick={() => setRegisteringLog(null)}
                    disabled={regLoading}
                    className="cursor-pointer rounded-lg border border-[#1E3048] bg-transparent px-4 py-2 font-bold text-[#5A7A9A] transition-colors outline-none hover:bg-[#1E3048] hover:text-[#E8EDF5]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={regLoading}
                    className={cn(
                      'flex cursor-pointer items-center justify-center gap-2 rounded-lg px-6 py-2 font-bold text-white shadow-md transition-all outline-none',
                      regLoading
                        ? 'cursor-not-allowed bg-slate-800 text-[#5A7A9A] shadow-none'
                        : 'bg-[#1565C0] shadow-[#1565C0]/15 hover:bg-[#1976D2] hover:shadow-[#1565C0]/25',
                    )}
                  >
                    {regLoading && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    )}
                    Confirm
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
