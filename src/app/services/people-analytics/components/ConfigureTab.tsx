import React from 'react';
import { Video, Loader2, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePersonAnalysisStore } from '@/stores/personAnalysisStore';
import { LineDrawingCanvas } from './LineDrawingCanvas';
import toast from 'react-hot-toast';

export function ConfigureTab({
  showThresholds = false,
  isReadOnly = false,
  onRun,
  running = false,
}: {
  showThresholds?: boolean;
  isReadOnly?: boolean;
  onRun?: () => void;
  running?: boolean;
}) {
  const {
    wizardVideos,
    wizardVideoIndex,
    videoLines,
    simThreshold,
    confThreshold,
    setSimThreshold,
    setConfThreshold,
  } = usePersonAnalysisStore();

  const handleDirectLineDraw = (
    start: [number, number],
    end: [number, number],
    width: number,
    height: number,
  ) => {
    const video = wizardVideos[wizardVideoIndex];
    if (!video) return;
    usePersonAnalysisStore.setState((s) => ({
      videoLines: {
        ...s.videoLines,
        [video.id]: { start, end, resolution: { width, height } },
      },
    }));
    toast.success('Crossing gate line updated successfully.');
  };

  const handleDirectSkipLine = () => {
    const video = wizardVideos[wizardVideoIndex];
    if (!video) return;
    usePersonAnalysisStore.setState((s) => ({
      videoLines: {
        ...s.videoLines,
        [video.id]: null,
      },
    }));
    toast.success('Default full-screen detection applied.');
  };

  if (wizardVideos.length === 0) {
    return (
      <div className="flex h-64 h-full flex-col items-center justify-center gap-3 rounded-xl border border-[#1E3048] bg-[#0D1628] p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#1E3048] bg-[#0D1628]">
          <Video className="h-6 w-6 text-[#5A7A9A]/40" />
        </div>
        <div>
          <p className="text-sm font-medium text-[#E8EDF5]">
            No Videos Selected
          </p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-[#5A7A9A]">
            Please select one or more videos from the library to configure.
          </p>
        </div>
      </div>
    );
  }

  const activeVideo = wizardVideos[wizardVideoIndex];
  const activeLine = videoLines[activeVideo.id];

  // Slider background percentages
  const simPercent = ((simThreshold - 0.5) / 0.5) * 100;
  const confPercent = ((confThreshold - 0.1) / 0.9) * 100;

  if (showThresholds) {
    // Side-by-side grid when reviewing and running (Step 4)
    return (
      <div className="grid w-full grid-cols-1 items-stretch gap-5 lg:grid-cols-12">
        {/* Left Card: drawing gate preview */}
        <div className="flex flex-col lg:col-span-8">
          <div className="flex h-full flex-col justify-between space-y-6 overflow-hidden rounded-xl border border-[#1E3048] bg-[#0D1628] p-6 shadow-2xl">
            {/* Header bar */}
            <div className="flex items-center justify-between border-b border-[#1E3048]/60 pb-4">
              <div>
                <h3 className="text-sm font-bold text-[#E8EDF5]">
                  Review Gate
                </h3>
                <p className="mt-0.5 text-[10px] text-[#5A7A9A]">
                  Drawn crossing gate for bidirectional count analysis.
                </p>
              </div>
              {activeLine ? (
                <span className="rounded border border-emerald-500/15 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-400">
                  ✓ Gate Set
                </span>
              ) : (
                <span className="rounded border border-amber-500/15 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold text-amber-400">
                  Full-Frame Mode
                </span>
              )}
            </div>

            {/* Canvas */}
            <div className="flex w-full flex-1 items-center justify-center">
              <LineDrawingCanvas
                key={activeVideo.id}
                videoName={activeVideo.original_name ?? ''}
                videoFile={null}
                videoSavedPath={activeVideo.saved_path ?? null}
                onLineDraw={handleDirectLineDraw}
                onSkip={handleDirectSkipLine}
                initialLine={
                  activeLine?.resolution
                    ? (activeLine as {
                        start: [number, number];
                        end: [number, number];
                        resolution: { width: number; height: number };
                      })
                    : null
                }
                isReadOnly={isReadOnly}
                showMinimalHeader={true}
              />
            </div>
          </div>
        </div>

        {/* Right Card: sliders thresholds & run button */}
        <div className="flex flex-col lg:col-span-4">
          <div className="flex h-full flex-col justify-between space-y-6 rounded-xl border border-[#1E3048] bg-[#0D1628] p-6 shadow-2xl">
            <div className="border-b border-[#1E3048]/60 pb-4">
              <h3 className="text-sm font-bold text-[#E8EDF5]">
                Adjust Thresholds
              </h3>
              <p className="mt-0.5 text-[10px] text-[#5A7A9A]">
                Configure detection parameters.
              </p>
            </div>

            <div className="flex-1 space-y-6">
              {/* Similarity Threshold */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#E8EDF5]">
                    Similarity Threshold
                  </label>
                  <span className="text-xs font-bold text-[#60A5FA]">
                    {simThreshold.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={1.0}
                  step={0.01}
                  value={simThreshold}
                  onChange={(e) => setSimThreshold(parseFloat(e.target.value))}
                  className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-[#0A0F1E] accent-[#1565C0] transition-all"
                  style={{
                    background: `linear-gradient(to right, #1565C0 0%, #1565C0 ${simPercent}%, #0A0F1E ${simPercent}%, #0A0F1E 100%)`,
                  }}
                />
                <p className="text-[10px] leading-relaxed text-[#5A7A9A]">
                  Stricter face matching. Higher values prevent false positives
                  (default: 0.80).
                </p>
              </div>

              {/* Confidence Threshold */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#E8EDF5]">
                    Confidence Threshold
                  </label>
                  <span className="text-xs font-bold text-[#60A5FA]">
                    {confThreshold.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={1.0}
                  step={0.05}
                  value={confThreshold}
                  onChange={(e) => setConfThreshold(parseFloat(e.target.value))}
                  className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-[#0A0F1E] accent-[#1565C0] transition-all"
                  style={{
                    background: `linear-gradient(to right, #1565C0 0%, #1565C0 ${confPercent}%, #0A0F1E ${confPercent}%, #0A0F1E 100%)`,
                  }}
                />
                <p className="text-[10px] leading-relaxed text-[#5A7A9A]">
                  YOLO detection confidence threshold. Lower values detect more
                  objects (default: 0.30).
                </p>
              </div>
            </div>

            {/* Run Button (Embedded inside thresholds settings box) */}
            {onRun && (
              <div className="border-t border-[#1E3048]/60 pt-4">
                <button
                  disabled={running}
                  onClick={onRun}
                  className={cn(
                    'flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white shadow-md transition-all',
                    'bg-[#1565C0] shadow-[#1565C0]/20 hover:bg-[#1976D2] disabled:opacity-60',
                  )}
                >
                  {running ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Triggering People Analytics...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 fill-current" />
                      Run Analysis Now
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Fallback single card layout for Step 3 draw crossing gate
  return (
    <div className="flex h-full flex-col justify-between space-y-6 overflow-hidden rounded-xl border border-[#1E3048] bg-[#0D1628] p-6 shadow-2xl">
      {/* Header bar (Clean, non-nested) */}
      <div className="flex items-center justify-between border-b border-[#1E3048]/60 pb-4">
        <div>
          <h3 className="text-sm font-bold text-[#E8EDF5]">
            Draw Crossing Gate
          </h3>
          <p className="mt-0.5 text-[10px] text-[#5A7A9A]">
            Click and drag to draw entry/exit line. Red is OUT, Green is IN.
            Press ESC to clear.
          </p>
        </div>
        {activeLine ? (
          <span className="rounded border border-emerald-500/15 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-400">
            ✓ Gate Set
          </span>
        ) : (
          <span className="rounded border border-amber-500/15 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold text-amber-400">
            Full-Frame Mode
          </span>
        )}
      </div>

      {/* Video Drawing Canvas Area */}
      <div className="flex w-full flex-1 items-center justify-center">
        <LineDrawingCanvas
          key={activeVideo.id}
          videoName={activeVideo.original_name ?? ''}
          videoFile={null}
          videoSavedPath={activeVideo.saved_path ?? null}
          onLineDraw={handleDirectLineDraw}
          onSkip={handleDirectSkipLine}
          initialLine={
            activeLine?.resolution
              ? (activeLine as {
                  start: [number, number];
                  end: [number, number];
                  resolution: { width: number; height: number };
                })
              : null
          }
          isReadOnly={isReadOnly}
          showMinimalHeader={true}
        />
      </div>

      {/* Queue List */}
      {wizardVideos.length > 1 && (
        <div className="space-y-1.5 pt-2">
          <span className="text-[9px] font-bold tracking-wider text-[#5A7A9A] uppercase">
            Videos Queue ({wizardVideos.length})
          </span>
          <div className="flex flex-wrap gap-2">
            {wizardVideos.map((v, i) => {
              const hasLine = videoLines[v.id] !== undefined;
              const isActive = wizardVideoIndex === i;
              return (
                <button
                  key={v.id}
                  onClick={() =>
                    usePersonAnalysisStore.setState({ wizardVideoIndex: i })
                  }
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition-colors',
                    isActive
                      ? 'border-[#1565C0] bg-[#1565C0]/10 text-[#E8EDF5]'
                      : 'border-[#1E3048]/50 bg-[#070B14]/20 text-[#5A7A9A] hover:bg-[#1E3048]/30',
                  )}
                >
                  <span className="max-w-[120px] truncate font-semibold">
                    {v.original_name}
                  </span>
                  <span
                    className={cn(
                      'rounded px-1 text-[8px] font-bold uppercase',
                      hasLine
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-amber-500/10 text-amber-400',
                    )}
                  >
                    {hasLine ? 'Line' : 'None'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
