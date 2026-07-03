'use client';

import { useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import {
  Upload,
  Users,
  Video,
  Loader2,
  RotateCcw,
  X,
  CheckCircle2,
  History,
  ChevronRight,
  UserPlus,
  CalendarDays,
  Pencil,
  Trash2,
  Camera,
  UserCircle2,
  LogIn,
  LogOut,
  Eye,
  FileImage,
} from 'lucide-react';
import {
  getEmployeePhotoUrl,
  getAnnotatedGroupPhotoUrl,
  getAttendanceVideoUrl,
  getSessionAttendance,
} from '@/lib/api/employees';
import type { AttendanceVideoSession, AttendanceLog } from '@/types/employees';
import { useAttendanceStore } from '@/stores/attendanceStore';
import { convertHeicToJpeg, isHeicFile } from '@/lib/heicConverter';

import { StatusBadge } from '@/components/services/shared/StatusBadge';

// ─────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatDateOnly(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
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

function formatHours(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0 && m === 0) {
    return '< 1m';
  }
  if (h > 0) {
    return `${h}h ${m}m`;
  }
  return `${m}m`;
}

function toDateInputValue(date: Date): string {
  return date.toISOString().split('T')[0];
}

// ─────────────────────────────────────────────
// Page tabs
// ─────────────────────────────────────────────

type Tab = 'employees' | 'uploads' | 'results' | 'logs';
type UploadSubTab = 'groupphoto' | 'video';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'employees', label: 'Employees', icon: Users },
  { id: 'uploads', label: 'Attendance Uploads', icon: Upload },
  { id: 'results', label: 'Results', icon: CheckCircle2 },
  { id: 'logs', label: 'Attendance Logs', icon: CalendarDays },
];

// ─────────────────────────────────────────────
// HistoryDrawer
// ─────────────────────────────────────────────

function HistoryDrawer({
  open,
  sessions,
  loading,
  onClose,
  onRefresh,
  onSelectSession,
  title,
}: {
  open: boolean;
  sessions: AttendanceVideoSession[];
  loading: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onSelectSession: (s: AttendanceVideoSession) => void;
  title: string;
}) {
  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
          open
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
      />
      <div
        className={cn(
          'fixed top-0 right-0 z-50 flex h-full w-full max-w-sm flex-col border-l border-[#1E3048] bg-[#0A0F1E] shadow-2xl transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex items-center justify-between border-b border-[#1E3048] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#1565C0]/20 bg-[#1565C0]/10">
              <History className="h-4 w-4 text-[#60A5FA]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#E8EDF5]">{title}</p>
              <p className="text-[10px] text-[#5A7A9A]">
                {sessions.length} session{sessions.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onRefresh}
              disabled={loading}
              className="rounded-lg p-2 text-[#5A7A9A] transition-colors hover:bg-[#1E3048] hover:text-[#E8EDF5] disabled:opacity-40"
              title="Refresh"
            >
              <RotateCcw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-[#5A7A9A] transition-colors hover:bg-[#1E3048] hover:text-[#E8EDF5]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#5A7A9A]" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-3 px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#1E3048] bg-[#0D1628]">
                <History className="h-6 w-6 text-[#5A7A9A]/40" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#E8EDF5]">
                  No sessions yet
                </p>
                <p className="mt-0.5 text-xs text-[#5A7A9A]">
                  Process a video to create your first session.
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-[#1E3048]">
              {sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onSelectSession(s)}
                  className="group flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-[#1E3048]/50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#1E3048] bg-[#0D1628] transition-colors group-hover:border-[#1565C0]/50">
                    <Video className="h-5 w-5 text-[#5A7A9A]" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-xs font-semibold text-[#E8EDF5]">
                        {s.video_name}
                      </p>
                      <StatusBadge status={s.status} />
                    </div>
                    <p className="text-[10px] text-[#5A7A9A]">
                      {formatDate(s.created_at)}
                    </p>
                    {s.status === 'completed' &&
                      s.unique_person_count !== null && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#1565C0]/10 px-2 py-0.5">
                          <Users className="h-3 w-3 text-[#60A5FA]" />
                          <span className="text-[10px] font-semibold text-[#60A5FA]">
                            {s.unique_person_count} unique
                          </span>
                        </span>
                      )}
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#5A7A9A]/40 transition-all group-hover:translate-x-0.5 group-hover:text-[#60A5FA]" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="border-t border-[#1E3048] px-5 py-3">
          <p className="text-center text-[10px] text-[#5A7A9A]">
            Click any session to load its results
          </p>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────
// Stat Card
// ─────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  color = 'blue',
}: {
  label: string;
  value: string | number | null;
  icon: React.ElementType;
  color?: 'blue' | 'green' | 'amber' | 'purple' | 'red';
}) {
  const palette = {
    blue: 'text-[#60A5FA] bg-[#1565C0]/10 border-[#1565C0]/20',
    green: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    amber: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    purple: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    red: 'text-red-400 bg-red-400/10 border-red-400/20',
  };
  return (
    <div className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-4">
      <div className="flex items-center gap-3">
        <div className={cn('rounded-lg border p-2', palette[color])}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[10px] text-[#5A7A9A]">{label}</p>
          <p className="text-lg font-bold text-[#E8EDF5]">{value ?? '—'}</p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// EMPLOYEES TAB
// ─────────────────────────────────────────────

function EmployeesTab() {
  const {
    employees,
    employeesLoading,
    employeeSearch,
    drawerOpen,
    editTarget,
    saving,
    deleteConfirm,
    firstName,
    lastName,
    empCode,
    photoPreview,
    photoFile,
    setEmployeeSearch,
    setDrawerOpen,
    setDeleteConfirm,
    setFirstName,
    setLastName,
    setEmpCode,
    setPhotoFile,
    fetchEmployees,
    openRegister,
    openEdit,
    saveEmployee,
    deleteEmployee,
    todayLogs,
  } = useAttendanceStore();

  const { getRootProps: getPhotoRootProps, getInputProps: getPhotoInputProps } =
    useDropzone({
      accept: {
        'image/jpeg': ['.jpg', '.jpeg'],
        'image/png': ['.png'],
        'image/webp': ['.webp'],
        'image/heic': ['.heic'],
        'image/heif': ['.heif'],
      },
      maxFiles: 1,
      onDrop: ([file]) => {
        if (!file) return;
        setPhotoFile(file, URL.createObjectURL(file));
      },
    });

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const filtered = employees.filter((e) =>
    `${e.first_name} ${e.last_name} ${e.employee_code}`
      .toLowerCase()
      .includes(employeeSearch.toLowerCase()),
  );

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <input
          value={employeeSearch}
          onChange={(e) => setEmployeeSearch(e.target.value)}
          placeholder="Search by name or code…"
          className="flex-1 rounded-lg border border-[#1E3048] bg-[#0A0F1E] px-3 py-2 text-sm text-[#E8EDF5] placeholder-[#5A7A9A] outline-none focus:border-[#1565C0]"
        />
        <button
          onClick={openRegister}
          className="flex items-center gap-2 rounded-lg bg-[#1565C0] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1976D2]"
        >
          <UserPlus className="h-4 w-4" />
          Register
        </button>
        <button
          onClick={fetchEmployees}
          className="rounded-lg border border-[#1E3048] p-2 text-[#5A7A9A] hover:bg-[#1E3048] hover:text-[#E8EDF5]"
          title="Refresh"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* Grid */}
      {employeesLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#5A7A9A]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center gap-3 rounded-xl border border-[#1E3048] bg-[#0D1628]">
          <Users className="h-10 w-10 text-[#5A7A9A]/30" />
          <p className="text-sm text-[#5A7A9A]">
            {employees.length === 0
              ? 'No employees registered yet.'
              : 'No results match your search.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#1E3048] bg-[#0D1628]">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[#1E3048] bg-[#0A0F1E]/50 text-xs font-semibold text-[#5A7A9A]">
                <th className="w-16 px-6 py-4">Photo</th>
                <th className="px-6 py-4">Full Name</th>
                <th className="px-6 py-4">Employee Code</th>
                <th className="px-6 py-4">Hours Today</th>
                <th className="px-6 py-4">Date Registered</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E3048] text-sm">
              {filtered.map((emp) => (
                <tr
                  key={emp.id}
                  className="group transition-colors hover:bg-[#1E3048]/20"
                >
                  <td className="px-6 py-3 whitespace-nowrap">
                    <div className="h-10 w-10 overflow-hidden rounded-full border border-[#1E3048] bg-[#0A0F1E]">
                      {emp.photo_path ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={getEmployeePhotoUrl(emp.photo_path)}
                          alt={`${emp.first_name} ${emp.last_name}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <UserCircle2 className="h-6 w-6 text-[#5A7A9A]" />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-semibold whitespace-nowrap text-[#E8EDF5]">
                    {emp.first_name} {emp.last_name}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs whitespace-nowrap text-[#60A5FA]">
                    {emp.employee_code}
                  </td>
                  <td className="px-6 py-4 text-xs whitespace-nowrap text-[#E8EDF5]">
                    {(() => {
                      const empLogs = todayLogs.filter(
                        (log) => log.employee.id === emp.id,
                      );
                      if (empLogs.length === 0)
                        return <span className="text-[#5A7A9A]">—</span>;
                      const totalSeconds = empLogs.reduce(
                        (sum, log) => sum + (log.dwell_time || 0),
                        0,
                      );
                      return (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-400">
                          {formatHours(totalSeconds)}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 text-xs whitespace-nowrap text-[#5A7A9A]">
                    {formatDateOnly(emp.created_at)}
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(emp)}
                        className="rounded-lg border border-[#1E3048] bg-[#0A0F1E] p-1.5 text-[#5A7A9A] transition-colors hover:border-[#1565C0]/50 hover:text-[#60A5FA]"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(emp)}
                        className="rounded-lg border border-[#1E3048] bg-[#0A0F1E] p-1.5 text-[#5A7A9A] transition-colors hover:border-red-500/50 hover:text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Register / Edit Drawer */}
      <>
        <div
          className={cn(
            'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
            drawerOpen
              ? 'pointer-events-auto opacity-100'
              : 'pointer-events-none opacity-0',
          )}
          onClick={() => setDrawerOpen(false)}
        />
        <div
          className={cn(
            'fixed top-0 right-0 z-50 flex h-full w-full max-w-sm flex-col border-l border-[#1E3048] bg-[#0A0F1E] shadow-2xl transition-transform duration-300 ease-in-out',
            drawerOpen ? 'translate-x-0' : 'translate-x-full',
          )}
        >
          <div className="flex items-center justify-between border-b border-[#1E3048] px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#1565C0]/20 bg-[#1565C0]/10">
                <UserPlus className="h-4 w-4 text-[#60A5FA]" />
              </div>
              <p className="text-sm font-semibold text-[#E8EDF5]">
                {editTarget ? 'Edit Employee' : 'Register Employee'}
              </p>
            </div>
            <button
              onClick={() => setDrawerOpen(false)}
              className="rounded-lg p-2 text-[#5A7A9A] hover:bg-[#1E3048] hover:text-[#E8EDF5]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {/* Photo upload */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#5A7A9A]">
                Face Photo
              </label>
              <div
                {...getPhotoRootProps()}
                className="relative flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-[#1E3048] p-4 transition-colors hover:border-[#1565C0]/50 hover:bg-[#1E3048]/20"
              >
                <input {...getPhotoInputProps()} />
                {photoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="h-24 w-24 rounded-full border-2 border-[#1565C0]/40 object-cover"
                  />
                ) : (
                  <>
                    <Camera className="h-8 w-8 text-[#5A7A9A]" />
                    <p className="text-xs text-[#5A7A9A]">
                      Click or drag a clear portrait photo
                    </p>
                  </>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#5A7A9A]">
                First Name
              </label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-lg border border-[#1E3048] bg-[#0D1628] px-3 py-2 text-sm text-[#E8EDF5] outline-none focus:border-[#1565C0]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#5A7A9A]">
                Last Name
              </label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-lg border border-[#1E3048] bg-[#0D1628] px-3 py-2 text-sm text-[#E8EDF5] outline-none focus:border-[#1565C0]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#5A7A9A]">
                Employee Code
              </label>
              <input
                value={empCode}
                onChange={(e) => setEmpCode(e.target.value)}
                className="w-full rounded-lg border border-[#1E3048] bg-[#0D1628] px-3 py-2 text-sm text-[#E8EDF5] outline-none focus:border-[#1565C0]"
                placeholder="e.g. EMP101"
              />
            </div>
          </div>

          <div className="border-t border-[#1E3048] p-5">
            <button
              onClick={saveEmployee}
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1565C0] py-2.5 text-sm font-semibold text-white hover:bg-[#1976D2] disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editTarget ? 'Save Changes' : 'Register Employee'}
            </button>
          </div>
        </div>
      </>

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-red-500/20 bg-[#0D1628] shadow-2xl">
            <div className="h-1 bg-gradient-to-r from-red-600 to-red-400" />
            <div className="space-y-4 p-6">
              <p className="font-semibold text-[#E8EDF5]">Delete Employee?</p>
              <p className="text-sm text-[#5A7A9A]">
                This will permanently remove{' '}
                <strong className="text-[#E8EDF5]">
                  {deleteConfirm.first_name} {deleteConfirm.last_name}
                </strong>{' '}
                and their face embeddings.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 rounded-xl border border-[#1E3048] py-2.5 text-sm font-medium text-[#5A7A9A] hover:bg-[#1E3048] hover:text-[#E8EDF5]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteEmployee(deleteConfirm)}
                  className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-500"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// ATTENDANCE UPLOADS TAB (Group Photo + Video)
// ─────────────────────────────────────────────

function AttendanceUploadsTab() {
  const {
    uploadSubTab: subTab,
    setUploadSubTab: setSubTab,
    attSessions,
    fetchAttSessions,
    groupPhotoPreview,
    groupPhoto,
    simThreshold,
    confThreshold,
    groupPhotoResult,
    markingAttendance,
    setGroupPhoto,
    setSimThreshold,
    setConfThreshold,
    markGroupPhoto,
    attUploads,
    attUploading,
    selectedAttSession,
    historyOpen: attHistoryOpen,
    addAttUploads,
    removeAttUpload,
    processAttVideos,
    setSelectedAttSession,
    setHistoryOpen: setAttHistoryOpen,
  } = useAttendanceStore();

  const {
    getRootProps: getGroupPhotoRootProps,
    getInputProps: getGroupPhotoInputProps,
  } = useDropzone({
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/heic': ['.heic'],
      'image/heif': ['.heif'],
    },
    maxFiles: 1,
    onDrop: async ([file]) => {
      if (!file) return;

      if (isHeicFile(file)) {
        // HEIC is not renderable in Chrome/Firefox — convert to JPEG for preview only.
        // The original file is still uploaded to the backend unchanged.
        const converted = await convertHeicToJpeg(file);
        const previewUrl = converted
          ? URL.createObjectURL(converted)
          : URL.createObjectURL(file); // fallback (Safari handles HEIC natively)
        setGroupPhoto(file, previewUrl);
      } else {
        setGroupPhoto(file, URL.createObjectURL(file));
      }
    },
  });

  const {
    getRootProps: getAttVideoRootProps,
    getInputProps: getAttVideoInputProps,
  } = useDropzone({
    accept: {
      'video/mp4': ['.mp4'],
      'video/quicktime': ['.mov'],
      'video/x-msvideo': ['.avi'],
      'video/x-matroska': ['.mkv'],
    },
    maxFiles: 10,
    onDrop: async (files) => {
      await addAttUploads(files);
    },
  });

  return (
    <div className="space-y-5">
      {/* Sub-tab pills */}
      <div className="flex gap-2">
        {(
          [
            { id: 'groupphoto', label: 'Group Photo', icon: Camera },
            { id: 'video', label: 'Attendance Video', icon: Video },
          ] as { id: UploadSubTab; label: string; icon: React.ElementType }[]
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSubTab(id)}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-medium transition-colors',
              subTab === id
                ? 'border-[#1565C0] bg-[#1565C0]/20 text-[#60A5FA]'
                : 'border-[#1E3048] text-[#5A7A9A] hover:bg-[#1E3048] hover:text-[#E8EDF5]',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Group Photo Upload ── */}
      {subTab === 'groupphoto' && (
        <div className="space-y-5">
          <div className="space-y-4 rounded-xl border border-[#1E3048] bg-[#0D1628] p-5">
            <div
              {...getGroupPhotoRootProps()}
              className={cn(
                'flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-[#1E3048] transition-colors hover:border-[#1565C0]/50 hover:bg-[#1E3048]/20',
                groupPhotoPreview ? 'p-3' : 'p-6',
              )}
            >
              <input {...getGroupPhotoInputProps()} />
              {groupPhotoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={groupPhotoPreview}
                  alt="Group photo preview"
                  className="max-h-[420px] w-full rounded-lg object-contain"
                  style={{ maxHeight: '420px' }}
                />
              ) : (
                <>
                  <Camera className="h-8 w-8 text-[#5A7A9A]" />
                  <p className="text-sm text-[#5A7A9A]">
                    Upload a group photo to mark attendance
                  </p>
                  <p className="text-xs text-[#5A7A9A]/60">
                    Click or drag an image file (JPG, PNG, HEIC)
                  </p>
                </>
              )}
            </div>

            {/* Threshold Sliders */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs font-medium text-[#5A7A9A]">
                    Similarity
                  </label>
                  <span className="text-xs font-bold text-[#60A5FA]">
                    {simThreshold.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={1}
                  step={0.01}
                  value={simThreshold}
                  onChange={(e) => setSimThreshold(parseFloat(e.target.value))}
                  className="w-full accent-[#1565C0]"
                />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs font-medium text-[#5A7A9A]">
                    Confidence
                  </label>
                  <span className="text-xs font-bold text-[#60A5FA]">
                    {confThreshold.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={confThreshold}
                  onChange={(e) => setConfThreshold(parseFloat(e.target.value))}
                  className="w-full accent-[#1565C0]"
                />
              </div>
            </div>

            <button
              onClick={markGroupPhoto}
              disabled={!groupPhotoPreview || markingAttendance}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1565C0] py-2.5 text-sm font-semibold text-white hover:bg-[#1976D2] disabled:opacity-60"
            >
              {markingAttendance && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Mark Attendance
            </button>
          </div>
        </div>
      )}

      {/* ── Attendance Video Upload ── */}
      {subTab === 'video' && (
        <div className="space-y-5">
          <div className="rounded-xl border border-[#1E3048] bg-[#0D1628]">
            <div className="border-b border-[#1E3048] px-5 py-3">
              <p className="text-xs font-semibold text-[#5A7A9A]">
                Upload Check-In / Check-Out footage
              </p>
            </div>

            <div className="space-y-4 p-5">
              <div
                {...getAttVideoRootProps()}
                className={cn(
                  'flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors',
                  'border-[#1E3048] hover:border-[#1565C0]/50 hover:bg-[#1E3048]/30',
                )}
              >
                <input {...getAttVideoInputProps()} />
                {attUploading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-[#5A7A9A]" />
                ) : (
                  <Upload className="h-8 w-8 text-[#5A7A9A]" />
                )}
                <p className="text-sm text-[#5A7A9A]">
                  Drag &amp; drop footage or click to browse
                </p>
                <p className="text-xs text-[#5A7A9A]/60">
                  MP4, AVI, MOV — background facial analysis
                </p>
              </div>

              {attUploads.length > 0 && (
                <div className="space-y-2">
                  {attUploads.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center gap-3 rounded-lg border border-[#1E3048] bg-[#0A0F1E] px-4 py-2.5"
                    >
                      <Video className="h-4 w-4 shrink-0 text-[#60A5FA]" />
                      <span className="min-w-0 flex-1 truncate text-xs text-[#E8EDF5]">
                        {u.original_name}
                      </span>
                      <button
                        onClick={() => removeAttUpload(u.id)}
                        className="text-[#5A7A9A] hover:text-red-400"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={processAttVideos}
                    className="mt-2 w-full rounded-xl bg-[#1565C0] py-2.5 text-sm font-semibold text-white hover:bg-[#1976D2]"
                  >
                    Process Videos →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// MEDIA MODAL
// ─────────────────────────────────────────────

interface MediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  type: 'image' | 'video';
  src: string;
}

function MediaModal({ isOpen, onClose, title, type, src }: MediaModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Modal Content */}
      <div className="relative z-10 flex w-full max-w-4xl flex-col rounded-xl border border-[#1E3048] bg-[#0D1628] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1E3048] px-5 py-4">
          <p className="text-sm font-semibold text-[#E8EDF5]">{title}</p>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#5A7A9A] hover:bg-[#1E3048] hover:text-[#E8EDF5]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {/* Body */}
        <div className="flex items-center justify-center p-6">
          {type === 'image' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={title}
              className="max-h-[70vh] w-full rounded-lg object-contain"
            />
          ) : (
            <video
              controls
              autoPlay
              className="max-h-[70vh] w-full rounded-lg"
              src={src}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// RESULTS TAB
// ─────────────────────────────────────────────

function ResultsTab() {
  const {
    groupPhotoResult,
    selectedAttSession,
    setSelectedAttSession,
    attSessions,
  } = useAttendanceStore();

  const latestSession = selectedAttSession
    ? attSessions.find((s) => s.id === selectedAttSession.id) ||
      selectedAttSession
    : null;

  // null = loading, [] = loaded-but-empty, populated array = loaded
  const [sessionLogs, setSessionLogs] = useState<AttendanceLog[] | null>(null);
  const logsLoading = sessionLogs === null;
  const [mediaModalOpen, setMediaModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (latestSession && latestSession.status === 'completed') {
        setSessionLogs(null); // enter loading state
        try {
          const res = await getSessionAttendance(latestSession.id);
          if (!cancelled) setSessionLogs(res?.data || []);
        } catch {
          if (!cancelled) setSessionLogs([]);
        }
      } else {
        if (!cancelled) setSessionLogs([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [latestSession]);

  const modalTitle = latestSession
    ? latestSession.video_name
    : 'Annotated Group Photo';
  const modalType = latestSession ? 'video' : 'image';
  const modalSrc = latestSession
    ? latestSession.output_video_path
      ? getAttendanceVideoUrl(latestSession.output_video_path)
      : ''
    : groupPhotoResult
      ? getAnnotatedGroupPhotoUrl(groupPhotoResult.annotated_image_path)
      : '';

  if (groupPhotoResult) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b border-[#1E3048] pb-3">
          <div>
            <h3 className="text-sm font-semibold text-[#E8EDF5]">
              Group Photo Analysis Results
            </h3>
            <p className="mt-0.5 text-xs text-[#5A7A9A]">
              Marked present from the group photo
            </p>
          </div>
          <button
            onClick={() => setMediaModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-[#1E3048] bg-[#0A0F1E] px-4 py-2 text-xs font-semibold text-[#E8EDF5] hover:bg-[#1E3048]"
          >
            <Eye className="h-4 w-4" /> View Annotated Photo
          </button>
        </div>

        <div className="rounded-xl border border-[#1E3048] bg-[#0D1628]">
          <div className="border-b border-[#1E3048] px-5 py-3">
            <p className="text-xs font-semibold text-[#5A7A9A]">
              Marked Present ({groupPhotoResult.attendance_logs.length})
            </p>
          </div>
          <div className="divide-y divide-[#1E3048]">
            {groupPhotoResult.attendance_logs.length === 0 ? (
              <div className="p-5 text-center text-xs text-[#5A7A9A]">
                No employees recognized. Try adjusting similarity/confidence
                settings and upload again.
              </div>
            ) : (
              groupPhotoResult.attendance_logs.map((log: AttendanceLog) => (
                <div key={log.id} className="flex items-center gap-3 px-5 py-3">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  <div>
                    <p className="text-sm font-semibold text-[#E8EDF5]">
                      {log.employee.first_name} {log.employee.last_name}
                    </p>
                    <p className="text-[10px] text-[#5A7A9A]">
                      {log.employee.employee_code}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <MediaModal
          isOpen={mediaModalOpen}
          onClose={() => setMediaModalOpen(false)}
          title={modalTitle}
          type={modalType}
          src={modalSrc}
        />
      </div>
    );
  }

  if (latestSession) {
    const isFailed = latestSession.status === 'failed';
    const isCompleted = latestSession.status === 'completed';

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b border-[#1E3048] pb-3">
          <div>
            <h3 className="text-sm font-semibold text-[#E8EDF5]">
              {latestSession.video_name}
            </h3>
            <div className="mt-1 flex items-center gap-2">
              <StatusBadge status={latestSession.status} />
              <span className="text-[10px] text-[#5A7A9A]">
                {formatDate(latestSession.created_at)}
              </span>
            </div>
          </div>
          {isCompleted && latestSession.output_video_path && (
            <button
              onClick={() => setMediaModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-[#1E3048] bg-[#0A0F1E] px-4 py-2 text-xs font-semibold text-[#E8EDF5] hover:bg-[#1E3048]"
            >
              <Eye className="h-4 w-4" /> Watch Annotated Video
            </button>
          )}
        </div>

        {isCompleted ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard
                label="Unique Registered"
                value={latestSession.unique_person_count}
                icon={Users}
                color="blue"
              />
              <StatCard
                label="Total Detections"
                value={latestSession.total_person_count}
                icon={Eye}
                color="purple"
              />
              <StatCard
                label="Entries logged"
                value={latestSession.entry_count}
                icon={LogIn}
                color="green"
              />
              <StatCard
                label="Exits logged"
                value={latestSession.exit_count}
                icon={LogOut}
                color="amber"
              />
            </div>

            <div className="rounded-xl border border-[#1E3048] bg-[#0D1628]">
              <div className="border-b border-[#1E3048] px-5 py-3">
                <p className="text-xs font-semibold text-[#5A7A9A]">
                  Session Attendance Logs ({sessionLogs?.length ?? 0})
                </p>
              </div>
              {logsLoading ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-[#5A7A9A]" />
                </div>
              ) : sessionLogs.length === 0 ? (
                <div className="p-5 text-center text-xs text-[#5A7A9A]">
                  No employees detected in this session.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs text-[#E8EDF5]">
                    <thead>
                      <tr className="border-b border-[#1E3048] bg-[#0A0F1E]/50 font-semibold text-[#5A7A9A]">
                        <th className="px-5 py-3">Photo</th>
                        <th className="px-5 py-3">Full Name</th>
                        <th className="px-5 py-3">Code</th>
                        <th className="px-5 py-3">First Seen</th>
                        <th className="px-5 py-3">Last Seen</th>
                        <th className="px-5 py-3">Dwell Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1E3048]">
                      {sessionLogs.map((log) => (
                        <tr
                          key={log.id}
                          className="transition-colors hover:bg-[#1E3048]/20"
                        >
                          <td className="px-5 py-2">
                            <div className="h-8 w-8 overflow-hidden rounded-full border border-[#1E3048] bg-[#0A0F1E]">
                              {log.employee.photo_path ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={getEmployeePhotoUrl(
                                    log.employee.photo_path,
                                  )}
                                  alt="Employee"
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center">
                                  <UserCircle2 className="h-5 w-5 text-[#5A7A9A]" />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3 font-semibold">
                            {log.employee.first_name} {log.employee.last_name}
                          </td>
                          <td className="px-5 py-3 font-mono text-[#60A5FA]">
                            {log.employee.employee_code}
                          </td>
                          <td className="px-5 py-3">
                            {formatDate(log.employee_entry_timestamp)}
                          </td>
                          <td className="px-5 py-3">
                            {formatDate(log.employee_exit_timestamp)}
                          </td>
                          <td className="px-5 py-3 text-[#60A5FA]">
                            {formatDwell(log.dwell_time)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : isFailed ? (
          <div className="flex h-52 flex-col items-center justify-center gap-3 rounded-xl border border-[#1E3048] bg-[#0D1628] p-6 text-center">
            <X className="h-12 w-12 text-red-500/50" />
            <h4 className="text-sm font-semibold text-[#E8EDF5]">
              Analysis Session Failed
            </h4>
            <p className="max-w-sm text-xs text-[#5A7A9A]">
              An error occurred during video analysis. Please check that the
              footage is formatted correctly and upload again.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-[#1E3048] bg-[#0D1628] p-8 text-center">
            {/* Radar Animation */}
            <div className="relative mb-6 flex h-16 w-16 items-center justify-center">
              <div className="absolute inset-0 animate-ping rounded-full bg-blue-500/20" />
              <div className="absolute inset-2 animate-spin rounded-full border-2 border-transparent border-t-blue-500" />
              <Users className="h-6 w-6 text-blue-400" />
            </div>

            <h4 className="text-sm font-semibold text-[#E8EDF5]">
              Analyzing Attendance Footage
            </h4>
            <p className="mt-1.5 max-w-sm text-xs text-[#5A7A9A]">
              Our computer vision pipeline is currently scanning video frames,
              matching employee face templates, and recording crossing events.
            </p>

            {/* Pipeline progress steps timeline */}
            <div className="mt-8 w-full max-w-xs space-y-3.5 border-t border-[#1E3048]/50 pt-6 text-left">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span className="text-xs font-medium text-[#E8EDF5]">
                  Video uploaded &amp; queued
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#60A5FA]" />
                <span className="text-xs font-medium text-[#E8EDF5]">
                  Running facial recognition pipelines
                </span>
              </div>
              <div className="flex items-center gap-3 pl-7">
                <span className="text-[10px] text-[#5A7A9A]">
                  Tracking gate crossings &amp; timestamps
                </span>
              </div>
              <div className="flex items-center gap-3 pl-7">
                <span className="text-[10px] text-[#5A7A9A]">
                  Computing dwell time hours logged
                </span>
              </div>
            </div>
          </div>
        )}

        <MediaModal
          isOpen={mediaModalOpen}
          onClose={() => setMediaModalOpen(false)}
          title={modalTitle}
          type={modalType}
          src={modalSrc}
        />
      </div>
    );
  }

  return (
    <div className="flex h-60 flex-col items-center justify-center gap-3 rounded-xl border border-[#1E3048] bg-[#0D1628] p-6 text-center">
      <CheckCircle2 className="h-12 w-12 text-[#5A7A9A]/30" />
      <p className="text-sm font-semibold text-[#E8EDF5]">
        No Analysis Results Loaded
      </p>
      <p className="max-w-md text-xs text-[#5A7A9A]">
        Upload and process a Group Photo or Attendance Video in the **Attendance
        Uploads** tab, or load a session from the **History** to view detailed
        results.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────
// ATTENDANCE LOGS TAB
// ─────────────────────────────────────────────

function AttendanceLogsTab() {
  const {
    startDate,
    endDate,
    logs,
    logsLoading: loading,
    setStartDate,
    setEndDate,
    fetchLogs,
  } = useAttendanceStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [lastFetchedRange, setLastFetchedRange] = useState({
    start: startDate,
    end: endDate,
  });
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const today = toDateInputValue(new Date());

  useEffect(() => {
    const initFetch = async () => {
      await fetchLogs();
      setHasFetchedOnce(true);
      setLastFetchedRange({ start: startDate, end: endDate });
    };
    initFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchLogs]);

  const isDirty =
    startDate !== lastFetchedRange.start || endDate !== lastFetchedRange.end;
  const isDateInvalid = startDate && endDate && startDate > endDate;
  const isButtonEnabled = (!hasFetchedOnce || isDirty) && !isDateInvalid;

  const handleFetch = async () => {
    if (isDateInvalid) return;
    await fetchLogs();
    setHasFetchedOnce(true);
    setLastFetchedRange({ start: startDate, end: endDate });
  };

  const filteredLogs = logs.filter((log) => {
    const fullName =
      `${log.employee.first_name} ${log.employee.last_name}`.toLowerCase();
    const code = (log.employee.employee_code || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || code.includes(query);
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-[#5A7A9A]">
              Start Date
            </label>
            <input
              type="date"
              max={today}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={cn(
                'rounded-lg border bg-[#0A0F1E] px-3 py-2 text-sm text-[#E8EDF5] outline-none',
                isDateInvalid
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-[#1E3048] focus:border-[#1565C0]',
              )}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[#5A7A9A]">
              End Date
            </label>
            <input
              type="date"
              max={today}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={cn(
                'rounded-lg border bg-[#0A0F1E] px-3 py-2 text-sm text-[#E8EDF5] outline-none',
                isDateInvalid
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-[#1E3048] focus:border-[#1565C0]',
              )}
            />
          </div>
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-xs text-[#5A7A9A]">
              Search Employee
            </label>
            <input
              type="text"
              placeholder="Search by name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-[#1E3048] bg-[#0A0F1E] px-3 py-2 text-sm text-[#E8EDF5] placeholder-[#5A7A9A] outline-none focus:border-[#1565C0]"
            />
          </div>
          <button
            onClick={handleFetch}
            disabled={!isButtonEnabled || loading}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors',
              isButtonEnabled
                ? 'bg-[#1565C0] hover:bg-[#1976D2]'
                : 'cursor-not-allowed bg-slate-800 text-[#5A7A9A]',
            )}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CalendarDays className="h-4 w-4" />
            )}
            Fetch Logs
          </button>
        </div>

        {/* Validation & Sync Messages */}
        {(isDateInvalid || (isDirty && !isDateInvalid)) && (
          <div className="text-xs">
            {isDateInvalid && (
              <span className="font-medium text-red-400">
                ⚠️ Start date cannot be after end date.
              </span>
            )}
            {isDirty && !isDateInvalid && (
              <span className="animate-pulse font-medium text-amber-400">
                ⚠️ Date range modified. Click &quot;Fetch Logs&quot; to update
                results.
              </span>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[#1E3048] bg-[#0D1628]">
        <div className="border-b border-[#1E3048] px-5 py-3">
          <p className="text-xs font-semibold text-[#5A7A9A]">
            Attendance Logs ({filteredLogs.length})
          </p>
        </div>
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-[#5A7A9A]" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex h-32 items-center justify-center">
            <p className="text-sm text-[#5A7A9A]">
              No attendance records match your search criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1E3048]">
                  {[
                    'Employee',
                    'Code',
                    'Entry Timestamp',
                    'Exit Timestamp',
                    'Dwell Time',
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-left font-semibold text-[#5A7A9A]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E3048]">
                {filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="transition-colors hover:bg-[#1E3048]/30"
                  >
                    <td className="px-4 py-3 font-semibold text-[#E8EDF5]">
                      {log.employee.first_name} {log.employee.last_name}
                    </td>
                    <td className="px-4 py-3 font-mono text-[#5A7A9A]">
                      {log.employee.employee_code}
                    </td>
                    <td className="px-4 py-3 text-[#E8EDF5]">
                      {formatDate(log.employee_entry_timestamp)}
                    </td>
                    <td className="px-4 py-3 text-[#E8EDF5]">
                      {log.employee_exit_timestamp
                        ? formatDate(log.employee_exit_timestamp)
                        : 'Present'}
                    </td>
                    <td className="px-4 py-3 text-[#60A5FA]">
                      {formatDwell(log.dwell_time)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN DASHBOARD PAGE
// ─────────────────────────────────────────────

export default function AttendancePage() {
  const {
    activeTab: tab,
    setActiveTab: setTab,
    attSessions,
    fetchAttSessions,
    historyOpen: attHistoryOpen,
    setHistoryOpen: setAttHistoryOpen,
    selectedAttSession,
    setSelectedAttSession,
  } = useAttendanceStore();

  // Poll active video sessions
  useEffect(() => {
    fetchAttSessions();
  }, [fetchAttSessions]);

  useEffect(() => {
    const hasPending = attSessions.some(
      (s) => s.status === 'pending' || s.status === 'processing',
    );
    if (!hasPending) return;
    const timer = setInterval(() => fetchAttSessions(), 5000);
    return () => clearInterval(timer);
  }, [attSessions, fetchAttSessions]);

  // Auto-select active processing session on mount
  useEffect(() => {
    if (!selectedAttSession && attSessions.length > 0) {
      const active = attSessions.find(
        (s) => s.status === 'pending' || s.status === 'processing',
      );
      if (active) {
        setSelectedAttSession(active);
        setTab('results');
      }
    }
  }, [attSessions, selectedAttSession, setSelectedAttSession, setTab]);

  const toggleHistory = () => {
    fetchAttSessions();
    setAttHistoryOpen(!attHistoryOpen);
  };

  const handleSelectAttSession = (session: AttendanceVideoSession) => {
    setAttHistoryOpen(false);
    setSelectedAttSession(session);
    setTab('results');
  };

  return (
    <div className="max-w-6xl space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#E8EDF5]">Attendance</h1>
          <p className="mt-1 text-sm text-[#5A7A9A]">
            Manage the employee directory database, upload single or team
            check-in assets, and review logs.
          </p>
        </div>
        <button
          onClick={toggleHistory}
          className="relative flex shrink-0 items-center gap-1.5 rounded-lg border border-[#1E3048] bg-[#0A0F1E] px-3 py-1.5 text-xs text-[#5A7A9A] hover:bg-[#1E3048] hover:text-[#E8EDF5]"
        >
          <History className="h-3.5 w-3.5" /> History
          {attSessions.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#1565C0] text-[9px] font-bold text-white">
              {attSessions.length > 99 ? '99+' : attSessions.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 rounded-lg border border-[#1E3048] bg-[#0A0F1E] p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id as Tab)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
              tab === id
                ? 'bg-[#1565C0] text-white'
                : 'text-[#5A7A9A] hover:bg-[#1E3048] hover:text-[#E8EDF5]',
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {tab === 'employees' && <EmployeesTab />}
      {tab === 'uploads' && <AttendanceUploadsTab />}
      {tab === 'results' && <ResultsTab />}
      {tab === 'logs' && <AttendanceLogsTab />}

      {/* Video History Drawer */}
      <HistoryDrawer
        open={attHistoryOpen}
        sessions={attSessions}
        loading={false}
        onClose={() => setAttHistoryOpen(false)}
        onRefresh={fetchAttSessions}
        onSelectSession={handleSelectAttSession}
        title="Attendance Sessions"
      />
    </div>
  );
}
