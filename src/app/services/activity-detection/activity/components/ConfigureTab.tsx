'use client';

import { Loader2, Play, ToggleLeft, ToggleRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useActivityDetectionStore } from '@/stores/activityDetectionStore';
import { PolygonCanvas } from './PolygonCanvas';
import { getDetectorDef } from './ActivityDetectorSidebar';

/** Detectors that require a polygon ROI to function correctly */
const POLYGON_REQUIRED = new Set(['trespassing', 'loitering']);
const POLYGON_OPTIONAL = new Set(['occupancy', 'fall', 'fighting']);

export function ConfigureTab() {
  const {
    selectedDetector,
    uploadedFile,
    uploadedMedia,
    polygonPoints,
    setPolygonPoints,
    detectFlags,
    setFlag,
    loiteringThreshold,
    setLoiteringThreshold,
    occupancyLimit,
    setOccupancyLimit,
    mediaType,
    interval,
    setInterval,
    submitting,
    startProcessing,
  } = useActivityDetectionStore();

  const det = getDetectorDef(selectedDetector);
  const needsPolygon = POLYGON_REQUIRED.has(selectedDetector);
  const polygonOptional = POLYGON_OPTIONAL.has(selectedDetector);
  const polygonRequired = needsPolygon;

  const polygonLabel = needsPolygon
    ? 'Required'
    : polygonOptional
      ? 'Optional — restrict ROI'
      : undefined;

  const canStart = uploadedMedia && (!needsPolygon || polygonPoints !== null);

  // Flag rows config
  const flagRows: {
    key: keyof typeof detectFlags;
    label: string;
    description: string;
  }[] = [
    {
      key: 'fall',
      label: 'Fall Detection',
      description: 'Detect falling / collapsed persons',
    },
    {
      key: 'aggression',
      label: 'Aggression',
      description: 'Fighting, pushing, grabbing',
    },
    {
      key: 'intrusion',
      label: 'Intrusion / Trespassing',
      description: 'Persons entering restricted polygon zone',
    },
    {
      key: 'loitering',
      label: 'Loitering',
      description: 'Time-in-zone threshold alerting',
    },
    {
      key: 'occupancy',
      label: 'Occupancy Limit',
      description: 'Alert when headcount exceeds limit',
    },
    {
      key: 'sleeping',
      label: 'Sleeping',
      description: 'Detect lying / sleeping behavior',
    },
    {
      key: 'walking',
      label: 'Walking / Running',
      description: 'Track walking, running, standing patterns',
    },
  ];

  return (
    <div className="space-y-5">
      {/* ── ROI Zone ── */}
      <div className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-5">
        <p className="mb-3 text-xs font-semibold tracking-wider text-[#5A7A9A] uppercase">
          Region of Interest (ROI)
        </p>
        <PolygonCanvas
          localFile={uploadedFile}
          savedPath={uploadedMedia?.filepath ?? null}
          mediaType={mediaType}
          required={polygonRequired || polygonOptional}
          label={polygonLabel}
          onConfirm={setPolygonPoints}
          onClear={() => setPolygonPoints(null)}
        />
        {needsPolygon && !polygonPoints && (
          <p className="mt-2 text-[11px] text-amber-400">
            ⚠ A polygon zone is required for {det.label}. Draw and confirm above
            before starting.
          </p>
        )}
      </div>

      {/* ── Detection Settings ── */}
      <div className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-5">
        <p className="mb-4 text-xs font-semibold tracking-wider text-[#5A7A9A] uppercase">
          Detection Settings
        </p>

        <div className="space-y-3">
          {flagRows.map(({ key, label, description }) => (
            <div
              key={key}
              className={cn(
                'flex items-center justify-between rounded-lg border px-4 py-3 transition-colors',
                detectFlags[key]
                  ? 'border-amber-500/20 bg-amber-500/5'
                  : 'border-[#1E3048] bg-[#0A0F1E]',
              )}
            >
              <div>
                <p className="text-xs font-medium text-[#E8EDF5]">{label}</p>
                <p className="text-[10px] text-[#5A7A9A]">{description}</p>
              </div>
              <button
                onClick={() => setFlag(key, !detectFlags[key])}
                className="shrink-0 transition-opacity hover:opacity-80"
              >
                {detectFlags[key] ? (
                  <ToggleRight className="h-6 w-6 text-amber-400" />
                ) : (
                  <ToggleLeft className="h-6 w-6 text-[#1E3048]" />
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Loitering threshold */}
        {detectFlags.loitering && (
          <div className="mt-4 space-y-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[#E8EDF5]">
                Loitering Threshold
              </label>
              <span className="rounded-md bg-[#1E3048] px-2 py-0.5 font-mono text-xs font-semibold text-amber-400">
                {loiteringThreshold}s
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={120}
              step={5}
              value={loiteringThreshold}
              onChange={(e) => setLoiteringThreshold(Number(e.target.value))}
              className="w-full accent-amber-500"
            />
            <div className="flex justify-between text-[9px] text-[#5A7A9A]">
              <span>5s — strict</span>
              <span>120s — lenient</span>
            </div>
          </div>
        )}

        {/* Occupancy limit */}
        {detectFlags.occupancy && (
          <div className="mt-4 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-medium text-[#E8EDF5]">
                Occupancy Limit
              </label>
              <span className="text-xs font-bold text-cyan-400">
                {occupancyLimit} persons
              </span>
            </div>
            <input
              type="number"
              min={1}
              max={100}
              value={occupancyLimit}
              onChange={(e) => setOccupancyLimit(Number(e.target.value))}
              className="w-full rounded-lg border border-[#1E3048] bg-[#0A0F1E] px-3 py-2 text-xs text-[#E8EDF5] outline-none focus:border-cyan-500/40"
            />
          </div>
        )}

        {/* Interval for video */}
        {mediaType === 'video' && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[#5A7A9A]">
                Frame Interval
              </label>
              <span className="rounded-md bg-[#1E3048] px-2 py-0.5 font-mono text-xs font-semibold text-[#E8EDF5]">
                {interval.toFixed(1)}s
              </span>
            </div>
            <input
              type="range"
              min={0.5}
              max={5.0}
              step={0.5}
              value={interval}
              onChange={(e) => setInterval(Number(e.target.value))}
              className="w-full accent-amber-500"
            />
          </div>
        )}
      </div>

      {/* Start button */}
      <button
        onClick={startProcessing}
        disabled={!canStart || submitting}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 text-sm font-semibold text-white transition-all hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Starting…
          </>
        ) : (
          <>
            <Play className="h-4 w-4" /> Start {det.label} Analysis
          </>
        )}
      </button>
    </div>
  );
}
