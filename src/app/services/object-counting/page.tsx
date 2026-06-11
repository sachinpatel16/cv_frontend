'use client';

import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Play, Loader2, RotateCcw } from 'lucide-react';
import { UploadZone } from '@/components/ui/UploadZone';
import { COCO_CLASSES } from '@/lib/services';
import {
  mockObjectCountData,
  mockObjectCountingResults,
} from '@/lib/mock/stats';

const VIDEO_ACCEPT = { 'video/*': ['.mp4', '.mov', '.avi'] };

export default function ObjectCountingPage() {
  const [file, setFile] = useState<File | null>(null);
  const [targetClass, setTargetClass] = useState('person');
  const [confidence, setConfidence] = useState(50);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<
    typeof mockObjectCountingResults | null
  >(null);

  async function handleRun() {
    if (!file) return;
    setRunning(true);
    await new Promise((r) => setTimeout(r, 2000));
    setResults(mockObjectCountingResults);
    setRunning(false);
  }

  function handleReset() {
    setFile(null);
    setResults(null);
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#E8EDF5]">Object Counting</h1>
        <p className="mt-1 text-sm text-[#5A7A9A]">
          Count any of 80 COCO classes per frame. Track entries and exits.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Config panel */}
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

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#5A7A9A]">
              Detection class
            </label>
            <select
              value={targetClass}
              onChange={(e) => setTargetClass(e.target.value)}
              className="h-9 w-full rounded-md border border-[#1E3048] bg-[#0A0F1E] px-3 text-sm text-[#E8EDF5] focus:border-[#1565C0] focus:ring-2 focus:ring-[#1565C0]/30 focus:outline-none"
            >
              {COCO_CLASSES.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[#5A7A9A]">
                Confidence threshold
              </label>
              <span className="text-xs font-semibold text-[#E8EDF5]">
                {confidence}%
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={95}
              step={5}
              value={confidence}
              onChange={(e) => setConfidence(Number(e.target.value))}
              className="w-full accent-[#1565C0]"
            />
            <div className="flex justify-between text-[10px] text-[#5A7A9A]">
              <span>10% — more detections</span>
              <span>95% — precise only</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleRun}
              disabled={!file || running}
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

        {/* Results panel */}
        <div className="space-y-4 lg:col-span-3">
          {!results ? (
            <div className="flex h-64 items-center justify-center rounded-xl border border-[#1E3048] bg-[#0D1628]">
              <p className="text-sm text-[#5A7A9A]">
                {running
                  ? 'Analysing footage…'
                  : 'Upload a file and run to see results'}
              </p>
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Total counted', value: results.totalCounted },
                  { label: 'Peak frame', value: results.peakFrame },
                  { label: 'Entries', value: results.entries },
                  { label: 'Exits', value: results.exits },
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

              {/* Bar chart */}
              <div className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-5">
                <p className="mb-4 text-xs font-semibold text-[#5A7A9A]">
                  Object count over time
                </p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart
                    data={mockObjectCountData}
                    margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E3048" />
                    <XAxis
                      dataKey="hour"
                      tick={{ fill: '#5A7A9A', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#5A7A9A', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#0D1628',
                        border: '1px solid #1E3048',
                        borderRadius: 8,
                        color: '#E8EDF5',
                        fontSize: 12,
                      }}
                      cursor={{ fill: '#1E3048' }}
                    />
                    <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                      {mockObjectCountData.map((d, i) => (
                        <Cell
                          key={i}
                          fill={d.isAlert ? '#F59E0B' : '#1565C0'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="mt-2 text-[10px] text-[#5A7A9A]">
                  <span className="text-[#F59E0B]">■</span> Alert threshold
                  exceeded
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
