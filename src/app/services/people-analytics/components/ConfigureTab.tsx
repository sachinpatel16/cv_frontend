import React from 'react';
import { SlidersHorizontal, X, Video, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePersonAnalysisStore } from '@/stores/personAnalysisStore';
import { LineDrawingCanvas } from './LineDrawingCanvas';
import { getRawVideoUrl } from '@/lib/api/peopleanalytics';

export function ConfigureTab() {
  const {
    wizardVideos,
    wizardStep,
    wizardVideoIndex,
    videoLines,
    simThreshold,
    setSimThreshold,
    confThreshold,
    setConfThreshold,
    processing,
    setWizardStep,
    handleLineDraw,
    handleSkipLine,
    handleProcess,
    fetchSessions,
    selectSession,
    closeWizard,
  } = usePersonAnalysisStore();

  const handleProcessWrapper = async () => {
    await handleProcess((newSessions) => {
      fetchSessions();
      if (newSessions.length > 0) {
        selectSession(newSessions[0]);
      }
    });
  };

  if (wizardVideos.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-[#1E3048] bg-[#0D1628] p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#1E3048] bg-[#0D1628]">
          <SlidersHorizontal className="h-6 w-6 text-[#5A7A9A]/40" />
        </div>
        <div>
          <p className="text-sm font-medium text-[#E8EDF5]">
            No Videos Selected
          </p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-[#5A7A9A]">
            Please select one or more videos from the Uploads tab to configure
            analysis.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#1E3048] bg-[#0D1628] shadow-2xl">
      <div className="h-1 w-full bg-gradient-to-r from-[#1565C0] to-[#60A5FA]" />

      {/* Wizard Steps Indicator */}
      <div className="flex items-center gap-2 border-b border-[#1E3048] px-6 py-3">
        {(['line', 'thresholds', 'confirm'] as const).map((step, i) => (
          <div key={step} className="flex items-center gap-2">
            <div
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold',
                wizardStep === step
                  ? 'bg-[#1565C0] text-white'
                  : 'bg-[#1E3048] text-[#5A7A9A]',
              )}
            >
              {i + 1}
            </div>
            <span
              className={cn(
                'text-xs',
                wizardStep === step ? 'text-[#E8EDF5]' : 'text-[#5A7A9A]',
              )}
            >
              {step === 'line'
                ? 'Draw Line'
                : step === 'thresholds'
                  ? 'Thresholds'
                  : 'Confirm'}
            </span>
            {i < 2 && <div className="h-px w-6 bg-[#1E3048]" />}
          </div>
        ))}
        <button
          onClick={closeWizard}
          className="ml-auto flex items-center gap-1 text-xs text-[#5A7A9A] hover:text-[#E8EDF5]"
        >
          <X className="h-3 w-3" /> Cancel
        </button>
      </div>

      <div className="p-6">
        {wizardStep === 'line' && (
          <LineDrawingCanvas
            videoName={wizardVideos[wizardVideoIndex]?.original_name ?? ''}
            videoFile={null}
            videoSavedPath={wizardVideos[wizardVideoIndex]?.saved_path ?? null}
            onLineDraw={handleLineDraw}
            onSkip={handleSkipLine}
          />
        )}

        {wizardStep === 'thresholds' && (
          <div className="animate-in fade-in mx-auto max-w-4xl space-y-4 duration-200">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
              {/* Left Side: Sliders */}
              <div className="space-y-6 md:col-span-7">
                <div>
                  <div className="flexmt-8 mb-1 items-center justify-between">
                    <label className="text-xs font-medium text-[#E8EDF5]">
                      Similarity Threshold
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
                    onChange={(e) =>
                      setSimThreshold(parseFloat(e.target.value))
                    }
                    className="w-full accent-[#1565C0]"
                  />
                  <p className="mt-1 text-[10px] leading-relaxed text-[#5A7A9A]">
                    Higher = stricter face matching (default 0.85).{' '}
                    <span
                      className={cn(
                        'font-medium',
                        simThreshold > 0.9
                          ? 'text-amber-400/80'
                          : simThreshold < 0.75
                            ? 'text-blue-400/80'
                            : 'text-[#60A5FA]/80',
                      )}
                    >
                      {simThreshold > 0.9
                        ? 'Strict: Minimizes false matches, but may miss matches.'
                        : simThreshold < 0.75
                          ? 'Lenient: Maximizes detection, but may cause false matches.'
                          : 'Balanced: Recommended for general use cases.'}
                    </span>
                  </p>
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-xs font-medium text-[#E8EDF5]">
                      Confidence Threshold
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
                    onChange={(e) =>
                      setConfThreshold(parseFloat(e.target.value))
                    }
                    className="w-full accent-[#1565C0]"
                  />
                  <p className="mt-1 text-[10px] leading-relaxed text-[#5A7A9A]">
                    YOLO detection confidence (default 0.30).{' '}
                    <span
                      className={cn(
                        'font-medium',
                        confThreshold > 0.5
                          ? 'text-amber-400/80'
                          : confThreshold < 0.25
                            ? 'text-blue-400/80'
                            : 'text-[#60A5FA]/80',
                      )}
                    >
                      {confThreshold > 0.5
                        ? 'Strict: Only clear/close detections. High precision.'
                        : confThreshold < 0.25
                          ? 'Sensitive: Detects distant/occluded objects, higher noise.'
                          : 'Balanced: Standard YOLO detection settings.'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Right Side: Button on Top, Info Card Below */}
              <div className="flex flex-col gap-4 md:col-span-5">
                <button
                  onClick={() => setWizardStep('confirm')}
                  className="w-full rounded-xl bg-[#1565C0] py-3 text-sm font-semibold text-white shadow-lg shadow-[#1565C0]/20 transition-colors hover:bg-[#1976D2]"
                >
                  Next: Review →
                </button>

                {/* Threshold Help Card */}
                <div className="space-y-3 rounded-xl border border-[#1E3048] bg-[#0A0F1E]/80 p-4">
                  <h4 className="flex items-center gap-1.5 border-b border-[#1E3048]/60 pb-2 text-xs font-semibold text-[#E8EDF5]">
                    <SlidersHorizontal className="h-3.5 w-3.5 text-[#60A5FA]" />
                    How Thresholds Affect Analysis
                  </h4>
                  <div className="space-y-3 text-[11px] leading-relaxed text-[#5A7A9A]">
                    <div className="space-y-1">
                      <span className="font-semibold text-[#60A5FA]">
                        Similarity Threshold:
                      </span>
                      <p>
                        Determines how strict face matching is. If set too high
                        (e.g., &gt; 0.90), you might miss genuine matches. If
                        too low (e.g., &lt; 0.70), you may get false positive
                        matches.
                      </p>
                    </div>
                    <div className="space-y-1 border-t border-[#1E3048]/40 pt-2.5">
                      <span className="font-semibold text-[#60A5FA]">
                        Confidence Threshold:
                      </span>
                      <p>
                        Determines YOLO detection sensitivity. Higher confidence
                        (e.g., &gt; 0.50) reduces false detections of background
                        objects. Lower confidence (e.g., &lt; 0.25) is better
                        for small or distant targets.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {wizardStep === 'confirm' && (
          <div className="animate-in fade-in mx-auto max-w-4xl space-y-4 duration-200">
            <p className="text-sm font-semibold text-[#E8EDF5]">
              Review &amp; Submit
            </p>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
              {/* Left Side: Video Preview(s) */}
              <div className="space-y-4 md:col-span-7">
                {wizardVideos.map((u, index) => {
                  const lineInfo = videoLines[u.id];
                  const width = lineInfo?.resolution?.width ?? 1280;
                  const height = lineInfo?.resolution?.height ?? 720;
                  return (
                    <div
                      key={u.id}
                      className="group relative aspect-video overflow-hidden rounded-xl border border-[#1E3048] bg-[#0A0F1E]"
                    >
                      {/* Video Frame Preview with SVG Overlay */}
                      <video
                        src={`${getRawVideoUrl(u.saved_path)}#t=0.5`}
                        preload="metadata"
                        muted
                        playsInline
                        className="h-full w-full object-cover"
                      />

                      {/* SVG Line Overlay */}
                      {lineInfo && (
                        <svg
                          className="pointer-events-none absolute inset-0 z-10 h-full w-full"
                          viewBox="0 0 100 100"
                          preserveAspectRatio="none"
                        >
                          <line
                            x1={`${(lineInfo.start[0] / width) * 100}%`}
                            y1={`${(lineInfo.start[1] / height) * 100}%`}
                            x2={`${(lineInfo.end[0] / width) * 100}%`}
                            y2={`${(lineInfo.end[1] / height) * 100}%`}
                            stroke="#EF4444"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            className="drop-shadow-[0_2.5px_4px_rgba(0,0,0,0.6)]"
                          />
                        </svg>
                      )}

                      {/* Hover / Edit Overlay */}
                      <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => {
                            setWizardStep('line');
                            usePersonAnalysisStore.setState({
                              wizardVideoIndex: index,
                            });
                          }}
                          className="flex items-center gap-2 rounded-xl bg-[#1565C0] px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-[#1565C0]/30 transition-all hover:bg-[#1976D2] focus:outline-none"
                        >
                          <SlidersHorizontal className="h-3.5 w-3.5" />
                          Redraw Detection Line
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Side: Button on Top, Data Below */}
              <div className="flex flex-col gap-4 md:col-span-5">
                {/* Button at the top right of this section */}
                <button
                  onClick={handleProcessWrapper}
                  disabled={processing}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1565C0] py-3 text-sm font-semibold text-white shadow-lg shadow-[#1565C0]/20 transition-colors hover:bg-[#1976D2] disabled:opacity-60"
                >
                  {processing && <Loader2 className="h-4 w-4 animate-spin" />}
                  Start Processing
                </button>

                {/* Data below the button */}
                <div className="space-y-4 rounded-xl border border-[#1E3048] bg-[#0A0F1E]/80 p-4">
                  <div>
                    <h4 className="mb-2 text-xs font-semibold tracking-wider text-[#5A7A9A] uppercase">
                      Configuration Settings
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border border-[#1E3048]/60 bg-[#0D1628] p-2.5">
                        <p className="text-[10px] text-[#5A7A9A]">Similarity</p>
                        <p className="text-sm font-bold text-[#E8EDF5]">
                          {simThreshold.toFixed(2)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-[#1E3048]/60 bg-[#0D1628] p-2.5">
                        <p className="text-[10px] text-[#5A7A9A]">Confidence</p>
                        <p className="text-sm font-bold text-[#E8EDF5]">
                          {confThreshold.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-[#1E3048]/60 pt-3">
                    <h4 className="mb-2 text-xs font-semibold tracking-wider text-[#5A7A9A] uppercase">
                      Selected Video Details
                    </h4>
                    <div className="space-y-3">
                      {wizardVideos.map((u) => {
                        const lineInfo = videoLines[u.id];
                        return (
                          <div key={u.id} className="space-y-1.5">
                            <div className="flex min-w-0 items-center gap-1.5">
                              <Video className="h-3.5 w-3.5 shrink-0 text-[#60A5FA]" />
                              <span className="truncate text-xs font-semibold text-[#E8EDF5]">
                                {u.original_name}
                              </span>
                            </div>
                            <div className="rounded-lg bg-[#0D1628] p-2 font-mono text-[10px]">
                              <p className="flex justify-between text-[#5A7A9A]">
                                <span>Detection Line:</span>
                                {lineInfo ? (
                                  <span className="font-medium text-[#EF4444]">
                                    [{lineInfo.start.join(', ')}] → [
                                    {lineInfo.end.join(', ')}]
                                  </span>
                                ) : (
                                  <span className="text-[#5A7A9A]">
                                    No line (default)
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
