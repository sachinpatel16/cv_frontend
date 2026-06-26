'use client';

import { useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import {
  Upload,
  Users,
  Video,
  Loader2,
  RotateCcw,
  X,
  UserPlus,
  CalendarDays,
  Pencil,
  Trash2,
  Camera,
  UserCircle2,
  LogIn,
  LogOut,
  Eye,
  History,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { useAttendanceStore } from '@/stores/attendanceStore';
import { StatusBadge } from '@/components/services/shared/StatusBadge';
import { StatCard } from '@/components/services/shared/StatCard';
import {
  getAnnotatedGroupPhotoUrl,
  getAttendanceVideoUrl,
  getEmployeePhotoUrl,
} from '@/lib/api/employees';
import type {
  Employee,
  AttendanceLog,
  AttendanceVideoSession,
  AttendanceUploadedVideo,
} from '@/types/employees';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
function formatDateOnly(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
}
function formatDwell(seconds: number) {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  return h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
}

// ── History Drawer ──
function HistoryDrawer() {
  const {
    historyOpen,
    attSessions,
    fetchAttSessions,
    setSelectedAttSession,
    setHistoryOpen,
  } = useAttendanceStore();
  const loading = false;
  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
          historyOpen
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0',
        )}
        onClick={() => setHistoryOpen(false)}
      />
      <div
        className={cn(
          'fixed top-0 right-0 z-50 flex h-full w-full max-w-sm flex-col border-l border-[#1E3048] bg-[#0A0F1E] shadow-2xl transition-transform duration-300 ease-in-out',
          historyOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex items-center justify-between border-b border-[#1E3048] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#1565C0]/20 bg-[#1565C0]/10">
              <History className="h-4 w-4 text-[#60A5FA]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#E8EDF5]">
                Attendance Sessions
              </p>
              <p className="text-[10px] text-[#5A7A9A]">
                {attSessions.length} session
                {attSessions.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={fetchAttSessions}
              className="rounded-lg p-2 text-[#5A7A9A] hover:bg-[#1E3048] hover:text-[#E8EDF5]"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              onClick={() => setHistoryOpen(false)}
              className="rounded-lg p-2 text-[#5A7A9A] hover:bg-[#1E3048] hover:text-[#E8EDF5]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {attSessions.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-3">
              <History className="h-8 w-8 text-[#5A7A9A]/30" />
              <p className="text-sm text-[#5A7A9A]">No sessions yet</p>
            </div>
          ) : (
            <div className="divide-y divide-[#1E3048]">
              {attSessions.map((s: AttendanceVideoSession) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setHistoryOpen(false);
                    setSelectedAttSession(s);
                  }}
                  className="group flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-[#1E3048]/50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#1E3048] bg-[#0D1628] group-hover:border-[#1565C0]/50">
                    <Video className="h-5 w-5 text-[#5A7A9A]" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-xs font-semibold text-[#E8EDF5]">
                        {s.video_name}
                      </p>
                      <StatusBadge status={s.status} />
                    </div>
                    <p className="text-[10px] text-[#5A7A9A]">
                      {formatDate(s.created_at)}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#5A7A9A]/40 group-hover:text-[#60A5FA]" />
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

// ── Employees Tab ──
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
    photoFile,
    photoPreview,
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
    deleteEmployee: deleteEmp,
  } = useAttendanceStore();

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const { getRootProps: getPhotoRootProps, getInputProps: getPhotoInputProps } =
    useDropzone({
      accept: { 'image/*': [] },
      maxFiles: 1,
      onDrop: ([file]) => {
        if (!file) return;
        setPhotoFile(file, URL.createObjectURL(file));
      },
    });

  const filtered = employees.filter((e: Employee) =>
    `${e.first_name} ${e.last_name} ${e.employee_code}`
      .toLowerCase()
      .includes(employeeSearch.toLowerCase()),
  );

  return (
    <div className="space-y-5">
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
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((emp: Employee) => (
            <div
              key={emp.id}
              className="group relative overflow-hidden rounded-xl border border-[#1E3048] bg-[#0D1628] p-4 transition-colors hover:border-[#1565C0]/40"
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-[#1E3048]">
                  {emp.photo_path ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getEmployeePhotoUrl(emp.photo_path)}
                      alt={`${emp.first_name} ${emp.last_name}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-[#1E3048]">
                      <UserCircle2 className="h-7 w-7 text-[#5A7A9A]" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#E8EDF5]">
                    {emp.first_name} {emp.last_name}
                  </p>
                  <p className="text-xs text-[#5A7A9A]">{emp.employee_code}</p>
                  <p className="text-[10px] text-[#5A7A9A]/60">
                    {formatDateOnly(emp.created_at)}
                  </p>
                </div>
              </div>
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() => openEdit(emp)}
                  className="rounded-md border border-[#1E3048] bg-[#0A0F1E] p-1.5 text-[#5A7A9A] hover:text-[#60A5FA]"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setDeleteConfirm(emp)}
                  className="rounded-md border border-[#1E3048] bg-[#0A0F1E] p-1.5 text-[#5A7A9A] hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Register / Edit Drawer */}
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
          {[
            ['First Name', firstName, setFirstName],
            ['Last Name', lastName, setLastName],
            ['Employee Code', empCode, setEmpCode, 'e.g. EMP101'],
          ].map(([label, value, setter, placeholder]) => (
            <div key={label as string}>
              <label className="mb-1.5 block text-xs font-medium text-[#5A7A9A]">
                {label as string}
              </label>
              <input
                value={value as string}
                onChange={(e) =>
                  (setter as (v: string) => void)(e.target.value)
                }
                placeholder={placeholder as string | undefined}
                className="w-full rounded-lg border border-[#1E3048] bg-[#0D1628] px-3 py-2 text-sm text-[#E8EDF5] outline-none focus:border-[#1565C0]"
              />
            </div>
          ))}
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

      {/* Delete Confirmation */}
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
                  onClick={() => deleteEmp(deleteConfirm)}
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

// ── Attendance Uploads Tab ──
function AttendanceUploadsTab() {
  const {
    uploadSubTab,
    setUploadSubTab,
    attSessions,
    fetchAttSessions,
    groupPhoto,
    groupPhotoPreview,
    groupPhotoResult,
    markingAttendance,
    simThreshold,
    confThreshold,
    setGroupPhoto,
    setSimThreshold,
    setConfThreshold,
    markGroupPhoto,
    attUploads,
    attUploading,
    selectedAttSession,
    historyOpen,
    addAttUploads,
    removeAttUpload,
    processAttVideos,
    setSelectedAttSession,
    setHistoryOpen,
  } = useAttendanceStore();

  const {
    getRootProps: getGroupPhotoRootProps,
    getInputProps: getGroupPhotoInputProps,
  } = useDropzone({
    accept: { 'image/*': [] },
    maxFiles: 1,
    onDrop: ([file]) => {
      if (!file) return;
      setGroupPhoto(file, URL.createObjectURL(file));
    },
  });

  const {
    getRootProps: getAttVideoRootProps,
    getInputProps: getAttVideoInputProps,
  } = useDropzone({
    accept: { 'video/*': [] },
    maxFiles: 10,
    onDrop: addAttUploads,
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          {(
            [
              { id: 'groupphoto', label: 'Group Photo' },
              { id: 'video', label: 'Attendance Video' },
            ] as const
          ).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setUploadSubTab(id)}
              className={cn(
                'rounded-full border px-4 py-1.5 text-xs font-medium transition-colors',
                uploadSubTab === id
                  ? 'border-[#1565C0] bg-[#1565C0]/20 text-[#60A5FA]'
                  : 'border-[#1E3048] text-[#5A7A9A] hover:bg-[#1E3048] hover:text-[#E8EDF5]',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {uploadSubTab === 'video' && (
          <button
            onClick={async () => {
              await fetchAttSessions();
              setHistoryOpen(true);
            }}
            className="relative flex items-center gap-2 rounded-lg border border-[#1E3048] bg-[#0A0F1E] px-3 py-1.5 text-xs font-medium text-[#5A7A9A] hover:bg-[#1E3048] hover:text-[#E8EDF5]"
          >
            <History className="h-3.5 w-3.5" />
            History
            {attSessions.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#1565C0] text-[9px] font-bold text-white">
                {attSessions.length > 99 ? '99+' : attSessions.length}
              </span>
            )}
          </button>
        )}
      </div>

      {uploadSubTab === 'groupphoto' && (
        <div className="space-y-5">
          <div className="space-y-4 rounded-xl border border-[#1E3048] bg-[#0D1628] p-5">
            <div
              {...getGroupPhotoRootProps()}
              className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-[#1E3048] p-6 hover:border-[#1565C0]/50 hover:bg-[#1E3048]/20"
            >
              <input {...getGroupPhotoInputProps()} />
              {groupPhotoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={groupPhotoPreview}
                  alt="Group photo"
                  className="max-h-48 rounded-lg object-contain"
                />
              ) : (
                <>
                  <Camera className="h-8 w-8 text-[#5A7A9A]" />
                  <p className="text-sm text-[#5A7A9A]">
                    Upload a group photo to mark attendance
                  </p>
                </>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                ['Similarity', simThreshold, setSimThreshold, 0.5, 1, 0.01],
                ['Confidence', confThreshold, setConfThreshold, 0.1, 1, 0.05],
              ].map(([label, val, setter, min, max, step]) => (
                <div key={label as string}>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-xs font-medium text-[#5A7A9A]">
                      {label as string}
                    </label>
                    <span className="text-xs font-bold text-[#60A5FA]">
                      {(val as number).toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={min as number}
                    max={max as number}
                    step={step as number}
                    value={val as number}
                    onChange={(e) =>
                      (setter as (v: number) => void)(
                        parseFloat(e.target.value),
                      )
                    }
                    className="w-full accent-[#1565C0]"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={markGroupPhoto}
              disabled={!groupPhoto || markingAttendance}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1565C0] py-2.5 text-sm font-semibold text-white hover:bg-[#1976D2] disabled:opacity-60"
            >
              {markingAttendance && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Mark Attendance
            </button>
          </div>
          {groupPhotoResult && (
            <div className="space-y-4">
              <div className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-4">
                <p className="mb-3 text-xs font-semibold text-[#5A7A9A]">
                  Annotated Photo
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getAnnotatedGroupPhotoUrl(
                    groupPhotoResult.annotated_image_path,
                  )}
                  alt="Annotated"
                  className="w-full rounded-lg object-contain"
                />
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
                      No employees recognized. Adjust thresholds and try again.
                    </div>
                  ) : (
                    groupPhotoResult.attendance_logs.map(
                      (log: AttendanceLog) => (
                        <div
                          key={log.id}
                          className="flex items-center gap-3 px-5 py-3"
                        >
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
                      ),
                    )
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {uploadSubTab === 'video' && (
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
                className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-[#1E3048] p-8 text-center hover:border-[#1565C0]/50 hover:bg-[#1E3048]/30"
              >
                <input {...getAttVideoInputProps()} />
                {attUploading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-[#5A7A9A]" />
                ) : (
                  <Upload className="h-8 w-8 text-[#5A7A9A]" />
                )}
                <p className="text-sm text-[#5A7A9A]">
                  Drag & drop footage or click to browse
                </p>
              </div>
              {attUploads.length > 0 && (
                <div className="space-y-2">
                  {attUploads.map((u: AttendanceUploadedVideo) => (
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
          {selectedAttSession && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#E8EDF5]">
                    {selectedAttSession.video_name}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <StatusBadge status={selectedAttSession.status} />
                    <span className="text-[10px] text-[#5A7A9A]">
                      {formatDate(selectedAttSession.created_at)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAttSession(null)}
                  className="ml-auto rounded-lg p-1.5 text-[#5A7A9A] hover:bg-[#1E3048] hover:text-[#E8EDF5]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {selectedAttSession.status === 'completed' && (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <StatCard
                      label="Unique Registered"
                      value={selectedAttSession.unique_person_count}
                      icon={Users}
                      color="blue"
                    />
                    <StatCard
                      label="Total Detections"
                      value={selectedAttSession.total_person_count}
                      icon={Eye}
                      color="purple"
                    />
                    <StatCard
                      label="Entries logged"
                      value={selectedAttSession.entry_count}
                      icon={LogIn}
                      color="green"
                    />
                    <StatCard
                      label="Exits logged"
                      value={selectedAttSession.exit_count}
                      icon={LogOut}
                      color="amber"
                    />
                  </div>
                  {selectedAttSession.output_video_path && (
                    <div className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-5">
                      <p className="mb-3 text-xs font-semibold text-[#5A7A9A]">
                        Annotated Attendance Video
                      </p>
                      <video
                        controls
                        className="w-full rounded-lg"
                        src={getAttendanceVideoUrl(selectedAttSession.id)}
                      />
                    </div>
                  )}
                </>
              )}
              {(selectedAttSession.status === 'pending' ||
                selectedAttSession.status === 'processing') && (
                <div className="flex h-32 flex-col items-center justify-center gap-3 rounded-xl border border-[#1E3048] bg-[#0D1628]">
                  <Loader2 className="h-6 w-6 animate-spin text-[#5A7A9A]" />
                  <p className="text-sm text-[#5A7A9A]">
                    Processing in background…
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <HistoryDrawer />
    </div>
  );
}

// ── Attendance Logs Tab ──
function AttendanceLogsTab() {
  const {
    startDate,
    endDate,
    logs,
    logsLoading,
    setStartDate,
    setEndDate,
    fetchLogs,
  } = useAttendanceStore();
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        {[
          ['Start Date', startDate, setStartDate],
          ['End Date', endDate, setEndDate],
        ].map(([label, value, setter]) => (
          <div key={label as string}>
            <label className="mb-1 block text-xs text-[#5A7A9A]">
              {label as string}
            </label>
            <input
              type="date"
              max={today}
              value={value as string}
              onChange={(e) => (setter as (v: string) => void)(e.target.value)}
              className="rounded-lg border border-[#1E3048] bg-[#0A0F1E] px-3 py-2 text-sm text-[#E8EDF5] outline-none focus:border-[#1565C0]"
            />
          </div>
        ))}
        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 rounded-lg bg-[#1565C0] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1976D2]"
        >
          {logsLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CalendarDays className="h-4 w-4" />
          )}
          Fetch Logs
        </button>
      </div>
      <div className="rounded-xl border border-[#1E3048] bg-[#0D1628]">
        <div className="border-b border-[#1E3048] px-5 py-3">
          <p className="text-xs font-semibold text-[#5A7A9A]">
            Attendance Logs ({logs.length})
          </p>
        </div>
        {logsLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-[#5A7A9A]" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex h-32 items-center justify-center">
            <p className="text-sm text-[#5A7A9A]">
              No attendance records in this range.
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
                {logs.map((log: AttendanceLog) => (
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

// ── Main Page ──
const TABS = [
  { id: 'employees' as const, label: 'Employees', icon: Users },
  { id: 'uploads' as const, label: 'Attendance Uploads', icon: Upload },
  { id: 'logs' as const, label: 'Attendance Logs', icon: CalendarDays },
];

export default function AttendancePage() {
  const { activeTab, setActiveTab, attSessions, fetchAttSessions } =
    useAttendanceStore();

  useEffect(() => {
    fetchAttSessions();
  }, [fetchAttSessions]);

  useEffect(() => {
    const hasPending = attSessions.some(
      (s: AttendanceVideoSession) =>
        s.status === 'pending' || s.status === 'processing',
    );
    if (!hasPending) return;
    const timer = setInterval(() => fetchAttSessions(), 5000);
    return () => clearInterval(timer);
  }, [attSessions, fetchAttSessions]);

  return (
    <div className="max-w-6xl space-y-6">
      <p className="text-sm text-[#5A7A9A]">
        Manage the employee directory, upload check-in assets, and review
        attendance logs.
      </p>
      <div className="flex gap-1 rounded-lg border border-[#1E3048] bg-[#0A0F1E] p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
              activeTab === id
                ? 'bg-[#1565C0] text-white'
                : 'text-[#5A7A9A] hover:bg-[#1E3048] hover:text-[#E8EDF5]',
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
      {activeTab === 'employees' && <EmployeesTab />}
      {activeTab === 'uploads' && <AttendanceUploadsTab />}
      {activeTab === 'logs' && <AttendanceLogsTab />}
    </div>
  );
}
