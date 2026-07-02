'use client';

import { Loader2, Play, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useActivityDetectionStore } from '@/stores/activityDetectionStore';
import { PolygonCanvas } from './PolygonCanvas';
import { getDetectorDef } from './ActivityDetectorSidebar';
import {
  SLIDER_MIN,
  SLIDER_MAX,
  stepToInterval,
  intervalToStep,
  stepLabel,
} from '@/lib/frameIntervalUtils';

// ─────────────────────────────────────────────────────────────────────────────
// Map sidebar detector ID → detect flag key
// ─────────────────────────────────────────────────────────────────────────────

const DETECTOR_TO_FLAG: Record<
  string,
  keyof ReturnType<typeof useActivityDetectionStore.getState>['detectFlags']
> = {
  fall: 'fall',
  fighting: 'aggression',
  trespassing: 'intrusion',
  loitering: 'loitering',
  occupancy: 'occupancy',
  sleeping: 'sleeping',
  walking: 'walking',
};

// ─────────────────────────────────────────────────────────────────────────────
// Static ordered flag rows (matches API field order)
// ─────────────────────────────────────────────────────────────────────────────

const FLAG_ROWS: {
  key:
    | 'fall'
    | 'aggression'
    | 'intrusion'
    | 'loitering'
    | 'occupancy'
    | 'sleeping'
    | 'walking';
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

// ─────────────────────────────────────────────────────────────────────────────
// Premium SVG illustrations representing each detector
// ─────────────────────────────────────────────────────────────────────────────

function DetectorIllustration({
  detectorKey,
  active,
}: {
  detectorKey: string;
  active: boolean;
}) {
  const activeColor = '#F59E0B'; // Amber-500
  const inactiveColor = '#334155'; // Slate-700

  switch (detectorKey) {
    case 'fall':
      return (
        <svg
          viewBox="0 0 100 100"
          className="h-14 w-14 transition-colors duration-300"
        >
          {/* Floor */}
          <line
            x1="10"
            y1="80"
            x2="90"
            y2="80"
            stroke={active ? activeColor : inactiveColor}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Falling Person figure */}
          <circle
            cx="65"
            cy="42"
            r="8"
            fill="none"
            stroke={active ? activeColor : inactiveColor}
            strokeWidth="3.5"
          />
          <path
            d="M 58,46 L 44,53 L 22,63"
            fill="none"
            stroke={active ? activeColor : inactiveColor}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 44,53 L 38,78"
            fill="none"
            stroke={active ? activeColor : inactiveColor}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M 48,49 L 32,43"
            fill="none"
            stroke={active ? activeColor : inactiveColor}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Action indicator lines */}
          <path
            d="M 22,35 L 16,40 M 27,20 L 22,27"
            fill="none"
            stroke={active ? '#EF4444' : inactiveColor}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'aggression':
      return (
        <svg
          viewBox="0 0 100 100"
          className="h-14 w-14 transition-colors duration-300"
        >
          {/* Figure 1 - Pushing */}
          <circle
            cx="32"
            cy="35"
            r="6.5"
            fill="none"
            stroke={active ? activeColor : inactiveColor}
            strokeWidth="3.5"
          />
          <path
            d="M 32,41.5 L 32,62 L 22,78 M 32,62 L 42,78 M 32,48 L 52,43"
            fill="none"
            stroke={active ? activeColor : inactiveColor}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Figure 2 - Pushed */}
          <circle
            cx="68"
            cy="38"
            r="6.5"
            fill="none"
            stroke={active ? activeColor : inactiveColor}
            strokeWidth="3.5"
          />
          <path
            d="M 68,44.5 L 74,65 L 68,78 M 74,65 L 84,78 M 68,50 L 48,54"
            fill="none"
            stroke={active ? activeColor : inactiveColor}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Conflict energy lines */}
          <path
            d="M 48,28 L 52,34 M 53,42 L 47,48"
            fill="none"
            stroke={active ? '#EF4444' : inactiveColor}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'intrusion':
      return (
        <svg
          viewBox="0 0 100 100"
          className="h-14 w-14 transition-colors duration-300"
        >
          {/* Security Fence/Zone Grid */}
          <path
            d="M 15,75 L 85,75 L 75,45 L 25,45 Z"
            fill={active ? 'rgba(245, 158, 11, 0.08)' : 'none'}
            stroke={active ? activeColor : inactiveColor}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Warning / Barrier Shield */}
          <path
            d="M 50,20 L 75,32 L 75,55 C 75,68 65,76 50,82 C 35,76 25,68 25,55 L 25,32 Z"
            fill="none"
            stroke={active ? '#3B82F6' : inactiveColor}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* Trespassing Alert Cross */}
          <path
            d="M 42,42 L 58,58 M 58,42 L 42,58"
            fill="none"
            stroke={active ? '#EF4444' : inactiveColor}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'loitering':
      return (
        <svg
          viewBox="0 0 100 100"
          className="h-14 w-14 transition-colors duration-300"
        >
          {/* Clock representing time spent */}
          <circle
            cx="50"
            cy="50"
            r="32"
            fill="none"
            stroke={active ? activeColor : inactiveColor}
            strokeWidth="3.5"
          />
          <path
            d="M 50,28 L 50,50 L 68,50"
            fill="none"
            stroke={active ? '#3B82F6' : inactiveColor}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Standing figure next to clock */}
          <circle
            cx="28"
            cy="45"
            r="4.5"
            fill="none"
            stroke={active ? activeColor : inactiveColor}
            strokeWidth="2.5"
          />
          <path
            d="M 28,49.5 L 28,68 M 25,78 L 28,68 L 31,78"
            fill="none"
            stroke={active ? activeColor : inactiveColor}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'occupancy':
      return (
        <svg
          viewBox="0 0 100 100"
          className="h-14 w-14 transition-colors duration-300"
        >
          {/* Person 1 (Center) */}
          <circle
            cx="50"
            cy="38"
            r="8"
            fill="none"
            stroke={active ? activeColor : inactiveColor}
            strokeWidth="3.5"
          />
          <path
            d="M 28,75 C 28,58 38,50 50,50 C 62,50 72,58 72,75"
            fill="none"
            stroke={active ? activeColor : inactiveColor}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Person 2 (Left back) */}
          <circle
            cx="25"
            cy="44"
            r="6"
            fill="none"
            stroke={active ? activeColor : inactiveColor}
            strokeWidth="2.5"
            opacity="0.65"
          />
          <path
            d="M 12,75 C 12,61 18,54 25,54 C 32,54 36,61 36,75"
            fill="none"
            stroke={active ? activeColor : inactiveColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.65"
          />
          {/* Person 3 (Right back) */}
          <circle
            cx="75"
            cy="44"
            r="6"
            fill="none"
            stroke={active ? activeColor : inactiveColor}
            strokeWidth="2.5"
            opacity="0.65"
          />
          <path
            d="M 64,75 C 64,61 68,54 75,54 C 82,54 88,61 88,75"
            fill="none"
            stroke={active ? activeColor : inactiveColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.65"
          />
        </svg>
      );
    case 'sleeping':
      return (
        <svg
          viewBox="0 0 100 100"
          className="h-14 w-14 transition-colors duration-300"
        >
          {/* Bench/bed */}
          <line
            x1="12"
            y1="70"
            x2="88"
            y2="70"
            stroke={active ? activeColor : inactiveColor}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <line
            x1="18"
            y1="70"
            x2="18"
            y2="82"
            stroke={active ? activeColor : inactiveColor}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <line
            x1="82"
            y1="70"
            x2="82"
            y2="82"
            stroke={active ? activeColor : inactiveColor}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Lying figure */}
          <circle
            cx="28"
            cy="52"
            r="6.5"
            fill="none"
            stroke={active ? activeColor : inactiveColor}
            strokeWidth="3.5"
          />
          <path
            d="M 34.5,55 L 75,55 C 78,55 80,60 78,65 L 75,70"
            fill="none"
            stroke={active ? activeColor : inactiveColor}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Sleeping 'Zzz' icons */}
          <path
            d="M 60,32 L 68,32 L 60,40 L 68,40 M 72,18 L 78,18 L 72,24 L 78,24"
            fill="none"
            stroke={active ? '#3B82F6' : inactiveColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'walking':
      return (
        <svg
          viewBox="0 0 100 100"
          className="h-14 w-14 transition-colors duration-300"
        >
          {/* Walking figure in motion */}
          <circle
            cx="50"
            cy="26"
            r="6.5"
            fill="none"
            stroke={active ? activeColor : inactiveColor}
            strokeWidth="3.5"
          />
          <path
            d="M 48,32 L 44,50 L 35,74 M 44,50 L 56,58 L 68,75"
            fill="none"
            stroke={active ? activeColor : inactiveColor}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 48,36 L 32,44 M 48,36 L 60,46 L 72,40"
            fill="none"
            stroke={active ? activeColor : inactiveColor}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Speed/movement indicator lines */}
          <line
            x1="20"
            y1="36"
            x2="28"
            y2="36"
            stroke={active ? '#10B981' : inactiveColor}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <line
            x1="16"
            y1="46"
            x2="24"
            y2="46"
            stroke={active ? '#10B981' : inactiveColor}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      );
    default:
      return null;
  }
}

export function ConfigureTab() {
  const {
    selectedDetector,
    uploadedFile,
    uploadedMedia,
    mediaType,
    polygonPoints,
    setPolygonPoints,
    detectFlags,
    setFlag,
    loiteringThreshold,
    setLoiteringThreshold,
    occupancyLimit,
    setOccupancyLimit,
    interval,
    setInterval,
    submitting,
    startProcessing,
  } = useActivityDetectionStore();

  const det = getDetectorDef(selectedDetector);
  const primaryFlagKey = DETECTOR_TO_FLAG[selectedDetector];

  // Polygon ROI is shared between Loitering and Intrusion/Trespassing
  const showROI = detectFlags.loitering || detectFlags.intrusion;
  const polygonRequired = showROI;

  const canStart =
    uploadedMedia !== null && (!polygonRequired || polygonPoints !== null);

  // Non-linear slider — current step index
  const sliderStep = intervalToStep(interval);

  // ── Smoking: static informational configure panel ──────────────────────────
  if (selectedDetector === 'smoking') {
    const signals = [
      {
        emoji: '🚬',
        title: 'Cigarette Detection',
        desc: 'YOLOv8 object detector trained to identify cigarettes and lit tips in any lighting condition.',
      },
      {
        emoji: '🔥',
        title: 'Lit Tip Confirmation',
        desc: 'Colour-temperature analysis confirms an active burning tip, reducing false positives from pens or straws.',
      },
      {
        emoji: '💨',
        title: 'Smoke Plume Analysis',
        desc: 'Optical flow + density map detects rising smoke in the frame and links it to the detected object.',
      },
      {
        emoji: '🧠',
        title: 'Multi-Signal Fusion',
        desc: 'All three signals are combined into a confidence score. Results are classified as Confirmed, Likely, Holding, or Clean.',
      },
    ];

    return (
      <div className="space-y-5">
        {/* Header card */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-500/10 p-3">
              <det.Icon
                className="h-6 w-6 text-amber-400"
                style={{ color: det.accent }}
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#E8EDF5]">
                {det.label}
              </p>
              <p className="text-xs text-[#5A7A9A]">{det.description}</p>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-5">
          <p className="mb-4 text-xs font-semibold tracking-wider text-[#5A7A9A] uppercase">
            How it works
          </p>
          <div className="space-y-3">
            {signals.map(({ emoji, title, desc }) => (
              <div key={title} className="flex items-start gap-3">
                <span className="mt-0.5 text-base leading-none">{emoji}</span>
                <div>
                  <p className="text-xs font-semibold text-[#E8EDF5]">
                    {title}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#5A7A9A]">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected frame interval */}
        <div className="flex items-center justify-between rounded-xl border border-[#1E3048] bg-[#0D1628] px-5 py-4">
          <div>
            <p className="text-xs font-semibold text-[#E8EDF5]">
              Frame sampling interval
            </p>
            <p className="mt-0.5 text-[11px] text-[#5A7A9A]">
              Set in the Media tab — applied to this analysis.
            </p>
          </div>
          <span className="rounded-md bg-amber-500/10 px-3 py-1 font-mono text-xs font-bold text-amber-400">
            {stepLabel(sliderStep)}
          </span>
        </div>

        {/* Note — analysis starts on upload */}
        <div className="flex items-start gap-2.5 rounded-xl border border-[#1E3048] bg-[#0A0F1E] px-4 py-3">
          <span className="mt-0.5 text-sm">ℹ️</span>
          <p className="text-xs text-[#5A7A9A]">
            Smoking Detection starts automatically after upload. There are no
            additional configuration options — the AI handles everything. Go
            back to <strong className="text-[#E8EDF5]">Media</strong> to upload
            your video.
          </p>
        </div>
      </div>
    );
  }
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* ── Section A: Detection Types — Premium 3-column highlighted cards ── */}
      <div className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-5">
        <p className="mb-4 text-xs font-semibold tracking-wider text-[#5A7A9A] uppercase">
          Detection Types
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {FLAG_ROWS.map(({ key, label, description }) => {
            const isPrimary = key === primaryFlagKey;
            const isOn = detectFlags[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => !isPrimary && setFlag(key, !isOn)}
                disabled={isPrimary}
                className={cn(
                  'group relative flex flex-col items-center overflow-hidden rounded-xl border p-5 text-center transition-all',
                  isOn
                    ? 'border-amber-500/30 bg-amber-500/5 shadow-lg shadow-amber-500/5'
                    : 'border-[#1E3048] bg-[#0A0F1E] hover:border-[#1E3048]/80',
                  isPrimary ? 'cursor-default' : 'cursor-pointer',
                )}
              >
                {/* Ribbon badge for Primary */}
                {isPrimary && (
                  <span className="absolute top-0 right-0 rounded-bl-lg border-b border-l border-amber-500/30 bg-amber-500/20 px-2.5 py-0.5 text-[9px] font-semibold text-amber-400">
                    Primary
                  </span>
                )}

                {/* SVG Illustration Container */}
                <div className="mb-4 flex h-24 w-full items-center justify-center overflow-hidden rounded-lg bg-black/20 p-2 transition-colors group-hover:bg-black/35">
                  <DetectorIllustration detectorKey={key} active={isOn} />
                </div>

                {/* Label & Description */}
                <div className="w-full">
                  <p className="text-xs font-semibold text-[#E8EDF5]">
                    {label}
                  </p>
                  <p className="mt-1.5 line-clamp-2 h-8 text-[10px] leading-normal text-[#5A7A9A]">
                    {description}
                  </p>
                </div>

                {/* Checkbox indicator */}
                <div
                  className={cn(
                    'absolute right-3 bottom-3 flex h-4 w-4 items-center justify-center rounded border transition-colors',
                    isOn
                      ? 'border-amber-500 bg-amber-500 text-[#0D1628]'
                      : 'border-[#1E3048] bg-transparent',
                  )}
                >
                  {isOn && <Check className="h-3 w-3 stroke-[3]" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Section B: Conditional Inputs ─────────────────────────────────── */}

      {/* Shared Polygon ROI — shown when Loitering OR Intrusion is enabled */}
      {showROI && (
        <div className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-5">
          <p className="mb-3 text-xs font-semibold tracking-wider text-[#5A7A9A] uppercase">
            Region of Interest (ROI)
          </p>
          <p className="mb-3 text-[11px] text-[#5A7A9A]">
            Draw a polygon zone on the frame below. Used for{' '}
            {detectFlags.loitering && detectFlags.intrusion
              ? 'Loitering and Intrusion'
              : detectFlags.loitering
                ? 'Loitering'
                : 'Intrusion / Trespassing'}
            .
          </p>
          <PolygonCanvas
            localFile={uploadedFile}
            savedPath={uploadedMedia?.filepath ?? null}
            mediaType={mediaType}
            required={showROI}
            onConfirm={(pts) => setPolygonPoints(pts)}
            onClear={() => setPolygonPoints(null)}
          />
        </div>
      )}

      {/* Loitering threshold — shown when Loitering is enabled */}
      {detectFlags.loitering && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-medium text-[#E8EDF5]">
              Loitering threshold time
            </label>
            <span className="text-xs font-bold text-amber-400">
              {loiteringThreshold} seconds
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

      {/* Occupancy limit — shown when Occupancy is enabled */}
      {detectFlags.occupancy && (
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-medium text-[#E8EDF5]">
              Max allowed persons
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

      {/* ── Section C: Frame Interval (always visible) ─────────────────────── */}
      <div className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-[#5A7A9A]">
              Frame sampling interval
            </label>
            <span className="rounded-md bg-[#1E3048] px-2 py-0.5 font-mono text-xs font-semibold text-[#E8EDF5]">
              {stepLabel(sliderStep)}
            </span>
          </div>
          <input
            type="range"
            min={SLIDER_MIN}
            max={SLIDER_MAX}
            step={1}
            value={sliderStep}
            onChange={(e) =>
              setInterval(stepToInterval(Number(e.target.value)))
            }
            className="w-full accent-amber-500"
          />
          <div className="flex justify-between text-[9px] text-[#5A7A9A]">
            <span>1 frame — max detail</span>
            <span className="text-center">← 1.0s center →</span>
            <span>5.0s — fastest</span>
          </div>
        </div>
      </div>

      {/* ── CTA Button ───────────────────────────────────────────────────────── */}
      <button
        onClick={startProcessing}
        disabled={!canStart || submitting}
        id="activity-start-analysis-btn"
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
