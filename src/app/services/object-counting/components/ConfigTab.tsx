'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Calendar,
  Trash2,
  Settings2,
  Users,
  Car,
  Activity,
  Layers,
  Search,
  Sliders,
  AlertCircle,
  Loader2,
  Play,
  Sparkles,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/services/shared/StatusBadge';
import { useObjectCountingStore } from '@/stores/objectCountingStore';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

// Provided by YOLO backend mapping
const COCO_CLASSES = [
  'person',
  'bicycle',
  'car',
  'motorcycle',
  'airplane',
  'bus',
  'train',
  'truck',
  'boat',
  'traffic light',
  'fire hydrant',
  'stop sign',
  'parking meter',
  'bench',
  'bird',
  'cat',
  'dog',
  'horse',
  'sheep',
  'cow',
  'elephant',
  'bear',
  'zebra',
  'giraffe',
  'backpack',
  'umbrella',
  'handbag',
  'tie',
  'suitcase',
  'frisbee',
  'skis',
  'snowboard',
  'sports ball',
  'kite',
  'baseball bat',
  'baseball glove',
  'skateboard',
  'surfboard',
  'tennis racket',
  'bottle',
  'wine glass',
  'cup',
  'fork',
  'knife',
  'spoon',
  'bowl',
  'banana',
  'apple',
  'sandwich',
  'orange',
  'broccoli',
  'carrot',
  'hot dog',
  'pizza',
  'donut',
  'cake',
  'chair',
  'couch',
  'potted plant',
  'bed',
  'dining table',
  'toilet',
  'tv',
  'laptop',
  'mouse',
  'remote',
  'keyboard',
  'cell phone',
  'microwave',
  'oven',
  'toaster',
  'sink',
  'refrigerator',
  'book',
  'clock',
  'vase',
  'scissors',
  'teddy bear',
  'hair drier',
  'toothbrush',
];

export function ConfigTab() {
  const {
    details,
    detailsLoading,
    removeMedia,
    trackPeople,
    setTrackPeople,
    classifyGender,
    setClassifyGender,
    trackVehicles,
    setTrackVehicles,
    classifyVehicle,
    setClassifyVehicle,
    trackCustom,
    setTrackCustom,
    selectedCustomClasses,
    setSelectedCustomClasses,
    customSearchQuery,
    setCustomSearchQuery,
    toggleCustomClass,
    confidenceThreshold,
    setConfidenceThreshold,
    minTrackFrames,
    setMinTrackFrames,
    trackBuffer,
    setTrackBuffer,
    gmcMethod,
    setGmcMethod,
    imgsz,
    setImgsz,
    reidClasses,
    setReidClasses,
    entryExitReport,
    setEntryExitReport,
    lineCoords,
    setLineCoords,
    isDrawingModalOpen,
    setIsDrawingModalOpen,
    triggeringAnalysisId,
    triggerAnalysis,
    getActiveClassesToTrack,
  } = useObjectCountingStore();

  const filteredCocoClasses = COCO_CLASSES.filter(
    (c) =>
      c.toLowerCase().includes(customSearchQuery.toLowerCase()) &&
      c !== 'person' &&
      !['car', 'truck', 'bus', 'motorcycle', 'bicycle'].includes(c),
  );

  const availableReidClasses = getActiveClassesToTrack();

  if (detailsLoading && !details) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-[#1E3048] bg-[#0D1628]">
        <Loader2 className="h-6 w-6 animate-spin text-[#5A7A9A]" />
      </div>
    );
  }

  if (!details) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-[#1E3048] bg-[#0D1628]">
        <p className="text-sm text-[#5A7A9A]">
          Select a media item from the library first to configure tracking.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Media Info Dashboard Bar */}
      <div className="flex flex-col gap-4 rounded-xl border border-[#1E3048] bg-[#0D1628] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-[#E8EDF5]">
            {details.filename}
            <span className="rounded bg-[#1E3048] px-2 py-0.5 text-[10px] font-normal text-[#5A7A9A] uppercase">
              {details.media_type}
            </span>
          </h2>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[#5A7A9A]">
            <Calendar className="h-3.5 w-3.5" />
            Uploaded on {new Date(details.created_at).toLocaleString()} · ID:{' '}
            {details.id}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={details.status} />
          <button
            onClick={() => removeMedia(details.id)}
            className="flex items-center gap-1.5 rounded-md border border-red-400/20 bg-red-400/5 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-400/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete Media
          </button>
        </div>
      </div>

      {/* AI Tracking Configuration */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Form Settings */}
        <div className="space-y-6 rounded-xl border border-[#1E3048] bg-[#0D1628] p-5 lg:col-span-2">
          <div className="flex items-center gap-1.5 border-b border-[#1E3048] pb-3">
            <Settings2 className="h-5 w-5 text-[#1565C0]" />
            <div>
              <h3 className="text-sm font-semibold text-[#E8EDF5]">
                AI Tracking Configuration
              </h3>
              <p className="text-[11px] text-[#5A7A9A]">
                Configure tracking parameters and models before firing the
                background task.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Presets Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Preset: People */}
              <div
                className={cn(
                  'cursor-pointer rounded-lg border p-4 transition-colors',
                  trackPeople
                    ? 'border-[#1565C0]/50 bg-[#1565C0]/5'
                    : 'border-[#1E3048] bg-[#0A0F1E] hover:border-[#1E3048]/80',
                )}
                onClick={() => setTrackPeople(!trackPeople)}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={trackPeople}
                    onChange={() => {}}
                    className="mt-1 h-3.5 w-3.5 rounded border-[#1E3048] text-[#1565C0] focus:ring-[#1565C0]"
                  />
                  <div className="min-w-0 flex-1">
                    <label className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-[#E8EDF5]">
                      <Users className="h-3.5 w-3.5 text-[#1565C0]" />
                      Track People
                    </label>
                    <p className="mt-1 text-[10px] leading-relaxed text-[#5A7A9A]">
                      Detect and count pedestrians, customers, or occupants
                      (`person` category).
                    </p>
                  </div>
                </div>

                {trackPeople && (
                  <div
                    className="mt-3.5 space-y-2 border-t border-[#1E3048] pt-3.5 pl-6"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="classifyGender"
                        checked={classifyGender}
                        onChange={(e) => setClassifyGender(e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-[#1E3048] text-[#1565C0] focus:ring-[#1565C0]"
                      />
                      <label
                        htmlFor="classifyGender"
                        className="flex cursor-pointer items-center gap-1 text-[11px] font-medium text-[#E8EDF5]"
                      >
                        <Sparkles className="h-3 w-3 text-[#60A5FA]" />
                        Gender Classification (InsightFace)
                      </label>
                    </div>
                    <p className="text-[9px] leading-relaxed text-[#5A7A9A]">
                      Classifies cropped head-crops into Male and Female
                      demographics.
                    </p>
                  </div>
                )}
              </div>

              {/* Preset: Vehicles */}
              <div
                className={cn(
                  'cursor-pointer rounded-lg border p-4 transition-colors',
                  trackVehicles
                    ? 'border-[#1565C0]/50 bg-[#1565C0]/5'
                    : 'border-[#1E3048] bg-[#0A0F1E] hover:border-[#1E3048]/80',
                )}
                onClick={() => setTrackVehicles(!trackVehicles)}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={trackVehicles}
                    onChange={() => {}}
                    className="mt-1 h-3.5 w-3.5 rounded border-[#1E3048] text-[#1565C0] focus:ring-[#1565C0]"
                  />
                  <div className="min-w-0 flex-1">
                    <label className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-[#E8EDF5]">
                      <Car className="h-3.5 w-3.5 text-[#1565C0]" />
                      Track Vehicles
                    </label>
                    <p className="mt-1 text-[10px] leading-relaxed text-[#5A7A9A]">
                      Detect and count traffic flows (`car`, `truck`, `bus`,
                      `motorcycle`, `bicycle`).
                    </p>
                  </div>
                </div>

                {trackVehicles && (
                  <div
                    className="mt-3.5 space-y-2 border-t border-[#1E3048] pt-3.5 pl-6"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="classifyVehicle"
                        checked={classifyVehicle}
                        onChange={(e) => setClassifyVehicle(e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-[#1E3048] text-[#1565C0] focus:ring-[#1565C0]"
                      />
                      <label
                        htmlFor="classifyVehicle"
                        className="cursor-pointer text-[11px] font-medium text-[#E8EDF5]"
                      >
                        Vehicle Subclass Classification
                      </label>
                    </div>
                    <p className="text-[9px] leading-relaxed text-[#5A7A9A]">
                      Preserves class breakdown (car, truck, bike). If disabled,
                      simplifies all to a generic &quot;vehicle&quot; tracker
                      label.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Entry & Exit Crossing Line Preset */}
            <div
              className={cn(
                'cursor-pointer rounded-lg border p-4 transition-colors',
                entryExitReport
                  ? 'border-[#1565C0]/50 bg-[#1565C0]/5'
                  : 'border-[#1E3048] bg-[#0A0F1E] hover:border-[#1E3048]/80',
              )}
              onClick={() => {
                const nextVal = !entryExitReport;
                setEntryExitReport(nextVal);
                if (nextVal) setIsDrawingModalOpen(true);
                else setLineCoords(null);
              }}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={entryExitReport}
                  onChange={() => {}}
                  className="mt-1 h-3.5 w-3.5 rounded border-[#1E3048] text-[#1565C0] focus:ring-[#1565C0]"
                />
                <div className="min-w-0 flex-1">
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-[#E8EDF5]">
                    <Activity className="h-3.5 w-3.5 text-[#1565C0]" />
                    Entry & Exit Line Crossing Report
                  </label>
                  <p className="mt-1 text-[10px] leading-relaxed text-[#5A7A9A]">
                    Configure a crossing gate line. Detects and logs IN/OUT
                    count directions for tracked objects.
                  </p>
                </div>
              </div>

              {entryExitReport && (
                <div
                  className="mt-3.5 flex items-center justify-between border-t border-[#1E3048]/60 pt-3.5 pl-6"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-[11px] text-[#E8EDF5]">
                    {lineCoords
                      ? `Line defined: [(${lineCoords[0][0]}, ${lineCoords[0][1]}), (${lineCoords[1][0]}, ${lineCoords[1][1]})]`
                      : 'No custom line drawn. Defaults to middle horizontal line.'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsDrawingModalOpen(true)}
                    className="rounded bg-[#1E3048] px-2.5 py-1 text-[10px] font-semibold text-[#60A5FA] transition-colors hover:bg-[#1E3048]/80"
                  >
                    {lineCoords ? 'Redraw Line' : 'Draw Line'}
                  </button>
                </div>
              )}
            </div>

            {/* Custom Category Selection Toggle */}
            <div className="overflow-hidden rounded-lg border border-[#1E3048] bg-[#0A0F1E]">
              <div
                className="flex cursor-pointer items-center justify-between border-b border-[#1E3048] px-4 py-3 hover:bg-[#1E3048]/30"
                onClick={() => setTrackCustom(!trackCustom)}
              >
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-[#1565C0]" />
                  <span className="text-xs font-semibold text-[#E8EDF5]">
                    Track Custom COCO Categories ({selectedCustomClasses.length}
                    )
                  </span>
                </div>
                <span className="rounded bg-[#1E3048] px-2 py-0.5 text-[10px] font-bold text-[#E8EDF5]">
                  {trackCustom ? 'Hide List' : 'Expand Classes (74 more)'}
                </span>
              </div>

              {trackCustom && (
                <div className="space-y-3 p-4">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute top-2.5 left-2.5 h-3.5 w-3.5 text-[#5A7A9A]" />
                      <input
                        type="text"
                        placeholder="Search 74 COCO classes (e.g. dog, backpack, chair)..."
                        value={customSearchQuery}
                        onChange={(e) => setCustomSearchQuery(e.target.value)}
                        className="h-8.5 w-full rounded-md border border-[#1E3048] bg-[#0D1628] pr-3 pl-8.5 text-xs text-[#E8EDF5] placeholder-[#5A7A9A] focus:border-[#1565C0] focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCustomClasses([])}
                      className="rounded-md border border-[#1E3048] bg-[#0D1628] px-2.5 py-1 text-[10px] font-medium text-[#5A7A9A] hover:bg-[#1E3048] hover:text-[#E8EDF5]"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="grid max-h-36 grid-cols-2 gap-2 overflow-y-auto rounded-md border border-[#1E3048]/60 bg-[#0D1628]/40 p-2 pr-1">
                    {filteredCocoClasses.map((cls) => {
                      const selected = selectedCustomClasses.includes(cls);
                      return (
                        <div
                          key={cls}
                          onClick={() => toggleCustomClass(cls)}
                          className={cn(
                            'flex cursor-pointer items-center gap-2 rounded border px-2 py-1 text-xs transition-colors',
                            selected
                              ? 'border-[#1565C0]/40 bg-[#1565C0]/15 text-[#60A5FA]'
                              : 'border-transparent text-[#5A7A9A] hover:bg-[#1E3048]/40 hover:text-[#E8EDF5]',
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            readOnly
                            className="h-3 w-3 rounded border-[#1E3048] text-[#1565C0]"
                          />
                          <span className="truncate">{cls}</span>
                        </div>
                      );
                    })}
                    {filteredCocoClasses.length === 0 && (
                      <div className="col-span-2 py-4 text-center text-xs text-[#5A7A9A]">
                        No classes matching &quot;{customSearchQuery}&quot;
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Advanced & Action */}
        <div className="space-y-6 rounded-xl border border-[#1E3048] bg-[#0D1628] p-5">
          <div className="flex items-center gap-1.5 border-b border-[#1E3048] pb-3 text-[#E8EDF5]">
            <Sliders className="h-4 w-4 text-[#1565C0]" />
            <h3 className="text-xs font-semibold tracking-wider uppercase">
              Advanced settings
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-[#5A7A9A]">Detection Confidence</span>
              <span className="font-semibold text-[#E8EDF5]">
                {confidenceThreshold.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0.10"
              max="1.00"
              step="0.05"
              value={confidenceThreshold}
              onChange={(e) =>
                setConfidenceThreshold(parseFloat(e.target.value))
              }
              className="w-full accent-[#1565C0]"
            />
            <div className="flex justify-between text-[9px] text-[#5A7A9A]/60">
              <span>0.10 (More matches)</span>
              <span>1.00 (Strictly precise)</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-[#5A7A9A]">
              Min Track Duration (Frames)
            </label>
            <input
              type="number"
              min="1"
              value={minTrackFrames}
              onChange={(e) => setMinTrackFrames(parseInt(e.target.value) || 1)}
              className="w-full rounded-md border border-[#1E3048] bg-[#0A0F1E] px-3 py-1.5 text-xs text-[#E8EDF5] focus:border-[#1565C0] focus:outline-none"
            />
            <p className="text-[10px] text-[#5A7A9A]/60">
              Minimum frames active before track is saved.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-[#5A7A9A]">
              Track Memory Buffer (Frames)
            </label>
            <input
              type="number"
              min="1"
              value={trackBuffer}
              onChange={(e) => setTrackBuffer(parseInt(e.target.value) || 1)}
              className="w-full rounded-md border border-[#1E3048] bg-[#0A0F1E] px-3 py-1.5 text-xs text-[#E8EDF5] focus:border-[#1565C0] focus:outline-none"
            />
            <p className="text-[10px] text-[#5A7A9A]/60">
              Buffer frames to remember an occluded track.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-[#5A7A9A]">
              Global Motion Compensation (GMC)
            </label>
            <select
              value={gmcMethod}
              onChange={(e) => setGmcMethod(e.target.value)}
              className="w-full rounded-md border border-[#1E3048] bg-[#0A0F1E] px-3 py-1.5 text-xs text-[#E8EDF5] focus:border-[#1565C0] focus:outline-none"
            >
              <option value="none">None (Disabled)</option>
              <option value="ortho">Ortho</option>
              <option value="aff_sift">Aff Sift</option>
              <option value="ecc">ECC</option>
              <option value="sparseOptFlow">Sparse Optical Flow</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-[#5A7A9A]">
              YOLO Image Size (Resolution)
            </label>
            <select
              value={imgsz}
              onChange={(e) => setImgsz(parseInt(e.target.value))}
              className="w-full rounded-md border border-[#1E3048] bg-[#0A0F1E] px-3 py-1.5 text-xs text-[#E8EDF5] focus:border-[#1565C0] focus:outline-none"
            >
              <option value={320}>320 x 320</option>
              <option value={480}>480 x 480 (Default)</option>
              <option value={640}>640 x 640</option>
              <option value={1280}>1280 x 1280</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-[#5A7A9A]">
              Re-ID Tracking Classes
            </label>
            <div className="max-h-32 space-y-2 overflow-y-auto rounded-md border border-[#1E3048] bg-[#0A0F1E] p-2.5">
              {availableReidClasses.map((cls) => {
                const isChecked = reidClasses.includes(cls);
                return (
                  <label
                    key={cls}
                    className="flex cursor-pointer items-center gap-2 text-[11px] text-[#E8EDF5]"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        if (isChecked)
                          setReidClasses(reidClasses.filter((c) => c !== cls));
                        else setReidClasses([...reidClasses, cls]);
                      }}
                      className="h-3.5 w-3.5 rounded border-[#1E3048] text-[#1565C0] focus:ring-[#1565C0]"
                    />
                    <span className="capitalize">{cls}</span>
                  </label>
                );
              })}
              {availableReidClasses.length === 0 && (
                <div className="text-[10px] text-[#5A7A9A] italic">
                  No active classes to select
                </div>
              )}
            </div>
          </div>

          <div className="pt-2">
            {details.status === 'failed' && (
              <div className="mb-4 flex items-start gap-2 rounded border border-red-400/15 bg-red-400/5 p-3 text-[11px] text-red-400">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Previous tracker run failed. You can tweak thresholds and
                  trigger a new analysis queue.
                </span>
              </div>
            )}

            <button
              onClick={() => triggerAnalysis()}
              disabled={
                triggeringAnalysisId !== null ||
                details.status === 'processing' ||
                (!trackPeople &&
                  !trackVehicles &&
                  (!trackCustom || selectedCustomClasses.length === 0))
              }
              className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#1565C0] text-sm font-semibold text-white transition-colors hover:bg-[#1565C0]/90 disabled:pointer-events-none disabled:opacity-40"
            >
              {triggeringAnalysisId !== null ||
              details.status === 'processing' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {details.status === 'processing'
                    ? 'Processing...'
                    : 'Triggering...'}
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-white" />
                  Run Object Tracking
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {isDrawingModalOpen && details && (
        <LineDrawingModal
          isOpen={isDrawingModalOpen}
          onClose={() => setIsDrawingModalOpen(false)}
          mediaUrl={`${BACKEND_URL}/${details.filepath}`}
          mediaType={details.media_type}
          onSave={(coords) => setLineCoords(coords)}
        />
      )}
    </div>
  );
}

// Inline modal for drawing
interface LineDrawingModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaUrl: string;
  mediaType: 'photo' | 'video';
  onSave: (coords: number[][]) => void;
}

function LineDrawingModal({
  isOpen,
  onClose,
  mediaUrl,
  mediaType,
  onSave,
}: LineDrawingModalProps) {
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [endPoint, setEndPoint] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [isDrawing, setIsDrawing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [canvasSize, setCanvasSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [videoResolution, setVideoResolution] = useState({
    width: 1280,
    height: 720,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (startPoint) {
      ctx.beginPath();
      ctx.arc(startPoint.x, startPoint.y, 6, 0, 2 * Math.PI);
      ctx.fillStyle = '#EF4444';
      ctx.fill();

      if (endPoint) {
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(endPoint.x, endPoint.y);
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(endPoint.x, endPoint.y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = '#EF4444';
        ctx.fill();

        const dx = endPoint.x - startPoint.x;
        const dy = endPoint.y - startPoint.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) {
          const nx = -dy / len;
          const ny = dx / len;
          const midX = (startPoint.x + endPoint.x) / 2;
          const midY = (startPoint.y + endPoint.y) / 2;

          ctx.font = 'bold 12px sans-serif';
          ctx.fillStyle = '#10B981';
          ctx.fillText('IN', midX + nx * 25 - 6, midY + ny * 25 + 4);
          ctx.fillStyle = '#EF4444';
          ctx.fillText('OUT', midX - nx * 25 - 10, midY - ny * 25 + 4);
        }
      }
    }
  }, [startPoint, endPoint]);

  const syncCanvasSize = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const media =
      container.querySelector('video') || container.querySelector('img');
    const canvas = canvasRef.current;
    if (!media || !canvas) return;

    canvas.width = media.clientWidth;
    canvas.height = media.clientHeight;
    setCanvasSize({ width: media.clientWidth, height: media.clientHeight });
    drawCanvas();
  }, [drawCanvas]);

  useEffect(() => {
    if (isOpen && loaded) {
      window.addEventListener('resize', syncCanvasSize);
      const t = setTimeout(syncCanvasSize, 100);
      return () => {
        window.removeEventListener('resize', syncCanvasSize);
        clearTimeout(t);
      };
    }
  }, [isOpen, loaded, syncCanvasSize]);

  useEffect(() => {
    drawCanvas();
  }, [startPoint, endPoint, drawCanvas]);

  if (!isOpen) return null;

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setStartPoint({ x, y });
    setEndPoint({ x, y });
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPoint) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setEndPoint({ x, y });
  };

  const handleMouseUp = () => setIsDrawing(false);

  const handleMediaLoad = (
    e: React.SyntheticEvent<HTMLVideoElement | HTMLImageElement>,
  ) => {
    const target = e.currentTarget;
    if (target instanceof HTMLVideoElement) {
      setVideoResolution({
        width: target.videoWidth,
        height: target.videoHeight,
      });
    } else if (target instanceof HTMLImageElement) {
      setVideoResolution({
        width: target.naturalWidth,
        height: target.naturalHeight,
      });
    }
    setLoaded(true);
    setTimeout(syncCanvasSize, 50);
  };

  const handleSave = () => {
    if (!startPoint || !endPoint || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const scaleX = videoResolution.width / canvas.width;
    const scaleY = videoResolution.height / canvas.height;
    const ptA = [
      Math.round(startPoint.x * scaleX),
      Math.round(startPoint.y * scaleY),
    ];
    const ptB = [
      Math.round(endPoint.x * scaleX),
      Math.round(endPoint.y * scaleY),
    ];
    onSave([ptA, ptB]);
    onClose();
  };

  const handleClear = () => {
    setStartPoint(null);
    setEndPoint(null);
  };

  const handleFlip = () => {
    if (!startPoint || !endPoint) return;
    const temp = startPoint;
    setStartPoint(endPoint);
    setEndPoint(temp);
  };

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl space-y-4 rounded-xl border border-[#1E3048] bg-[#0D1628] p-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1E3048] pb-3">
          <div>
            <h3 className="text-sm font-semibold text-[#E8EDF5]">
              Draw Entry/Exit Crossing Gate
            </h3>
            <p className="mt-0.5 text-[10px] text-[#5A7A9A]">
              Click and drag on the media preview to draw your crossing detector
              line.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-[#5A7A9A] transition-colors hover:bg-[#1E3048] hover:text-[#E8EDF5]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          ref={containerRef}
          className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded border border-[#1E3048]/60 bg-black/60"
        >
          {mediaType === 'video' ? (
            <video
              src={mediaUrl}
              muted
              playsInline
              onLoadedMetadata={handleMediaLoad}
              className="pointer-events-none max-h-full max-w-full object-contain"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaUrl}
              alt="Media source"
              onLoad={handleMediaLoad}
              className="pointer-events-none max-h-full max-w-full object-contain"
            />
          )}

          {loaded && (
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="absolute cursor-crosshair"
              style={{
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: canvasSize?.width ? `${canvasSize.width}px` : '100%',
                height: canvasSize?.height ? `${canvasSize.height}px` : '100%',
              }}
            />
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[#1E3048] pt-3">
          <div className="text-[10px] text-[#5A7A9A]">
            {startPoint && endPoint ? (
              <span className="font-semibold text-[#10B981]">
                Line defined. Cross from OUT (red) to IN (green) to count as
                entry.
              </span>
            ) : (
              <span>
                No line drawn. Drag your cursor across the zone to draw.
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {startPoint && endPoint && (
              <button
                type="button"
                onClick={handleFlip}
                className="rounded border border-[#F59E0B]/30 px-3 py-1.5 text-xs font-semibold text-[#F59E0B] transition-colors hover:border-[#F59E0B]/60"
              >
                Flip Directions
              </button>
            )}
            <button
              onClick={handleClear}
              className="rounded px-3 py-1.5 text-xs font-semibold text-[#5A7A9A] transition-colors hover:bg-[#1E3048] hover:text-[#E8EDF5]"
            >
              Clear Line
            </button>
            <button
              onClick={onClose}
              className="rounded px-3 py-1.5 text-xs font-semibold text-[#5A7A9A] transition-colors hover:bg-[#1E3048] hover:text-[#E8EDF5]"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="rounded bg-[#1565C0] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#1565C0]/90"
            >
              Save Line & Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
