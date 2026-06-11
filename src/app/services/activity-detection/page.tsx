'use client';

import { useState } from 'react';
import { Play, Loader2, RotateCcw } from 'lucide-react';
import { UploadZone } from '@/components/ui/UploadZone';
import { mockActivityResults } from '@/lib/mock/stats';
import { mockEvents } from '@/lib/mock/events';

const VIDEO_ACCEPT = { 'video/*': ['.mp4', '.mov', '.avi'] };

const TRIGGERS = [
  { id: 'loitering', label: 'Loitering' },
  { id: 'perimeter', label: 'Perimeter breach' },
  { id: 'crowd', label: 'Crowd formation' },
  { id: 'abandoned', label: 'Abandoned object' },
  { id: 'altercation', label: 'Physical altercation' },
];

const SEVERITY_CLS: Record<string, string> = {
  Breach: 'text-red-400 bg-red-400/10',
  Suspicious: 'text-[#F59E0B] bg-[#F59E0B]/10',
  Flagged: 'text-[#5A7A9A] bg-[#5A7A9A]/10',
};

export default function ActivityDetectionPage() {
  const [file, setFile] = useState<File | null>(null);
  const [triggers, setTriggers] = useState<string[]>([
    'loitering',
    'perimeter',
    'crowd',
  ]);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<typeof mockActivityResults | null>(
    null,
  );

  function toggleTrigger(id: string) {
    setTriggers((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  }

  async function handleRun() {
    if (!file) return;
    setRunning(true);
    await new Promise((r) => setTimeout(r, 2000));
    setResults(mockActivityResults);
    setRunning(false);
  }

  function handleReset() {
    setFile(null);
    setResults(null);
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#E8EDF5]">Activity Detection</h1>
        <p className="mt-1 text-sm text-[#5A7A9A]">
          Flag suspicious events with timestamped screenshots and video clips.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Config */}
        <div className="space-y-5 rounded-xl border border-[#1E3048] bg-[#0D1628] p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-[#E8EDF5]">
            Configuration
          </h2>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#5A7A9A]">
              Video file
            </label>
            <UploadZone
              label="Drop MP4, MOV or AVI · up to 4 GB"
              accept={VIDEO_ACCEPT}
              file={file}
              onChange={setFile}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-[#5A7A9A]">
              Event triggers
            </label>
            {TRIGGERS.map(({ id, label }) => (
              <label
                key={id}
                className="group flex cursor-pointer items-center gap-2.5"
              >
                <input
                  type="checkbox"
                  checked={triggers.includes(id)}
                  onChange={() => toggleTrigger(id)}
                  className="h-4 w-4 rounded border-[#1E3048] accent-[#1565C0]"
                />
                <span className="text-sm text-[#5A7A9A] transition-colors group-hover:text-[#E8EDF5]">
                  {label}
                </span>
              </label>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleRun}
              disabled={!file || running || triggers.length === 0}
              className="flex h-9 flex-1 items-center justify-center gap-2 rounded-md bg-[#1565C0] text-sm font-medium text-white transition-colors hover:bg-[#1565C0]/90 disabled:opacity-40"
            >
              {running ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Play className="h-4 w-4" /> Run
                </>
              )}
            </button>
            {results && (
              <button
                onClick={handleReset}
                className="flex h-9 w-9 items-center justify-center rounded-md border border-[#1E3048] text-[#5A7A9A] transition-colors hover:bg-[#1E3048] hover:text-[#E8EDF5]"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4 lg:col-span-3">
          {!results ? (
            <div className="flex h-64 items-center justify-center rounded-xl border border-[#1E3048] bg-[#0D1628]">
              <p className="text-sm text-[#5A7A9A]">
                {running
                  ? 'Detecting events…'
                  : 'Upload a file and run to see events'}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Total events', value: results.totalEvents },
                  { label: 'Breaches', value: results.breaches },
                  { label: 'Suspicious', value: results.suspicious },
                  { label: 'Flagged', value: results.flagged },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-4"
                  >
                    <p className="mb-1 text-xs text-[#5A7A9A]">{label}</p>
                    <p className="text-2xl font-bold text-[#E8EDF5]">{value}</p>
                  </div>
                ))}
              </div>

              <div className="overflow-hidden rounded-xl border border-[#1E3048] bg-[#0D1628]">
                <div className="border-b border-[#1E3048] px-5 py-3">
                  <p className="text-xs font-semibold text-[#5A7A9A]">
                    Detected events
                  </p>
                </div>
                <div className="divide-y divide-[#1E3048]">
                  {mockEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="flex items-start gap-3 px-5 py-3"
                    >
                      <span
                        className={`mt-0.5 inline-flex shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${SEVERITY_CLS[evt.severity]}`}
                      >
                        {evt.severity}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm text-[#E8EDF5]">
                          {evt.description}
                        </p>
                        <p className="mt-0.5 text-xs text-[#5A7A9A]">
                          {evt.frameTime}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
