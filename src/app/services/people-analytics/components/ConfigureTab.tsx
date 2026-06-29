import React from 'react';
import { SlidersHorizontal, X, Video, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePersonAnalysisStore } from '@/stores/personAnalysisStore';
import { LineDrawingCanvas } from './LineDrawingCanvas';

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
          <div className="mx-auto max-w-xl space-y-6">
            <div>
              <div className="mb-1 flex items-center justify-between">
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
                onChange={(e) => setSimThreshold(parseFloat(e.target.value))}
                className="w-full accent-[#1565C0]"
              />
              <p className="mt-1 text-[10px] text-[#5A7A9A]">
                Higher = stricter face matching (default 0.85)
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
                onChange={(e) => setConfThreshold(parseFloat(e.target.value))}
                className="w-full accent-[#1565C0]"
              />
              <p className="mt-1 text-[10px] text-[#5A7A9A]">
                YOLO detection confidence (default 0.30)
              </p>
            </div>
            <button
              onClick={() => setWizardStep('confirm')}
              className="w-full rounded-xl bg-[#1565C0] py-2.5 text-sm font-semibold text-white hover:bg-[#1976D2]"
            >
              Next: Review →
            </button>
          </div>
        )}

        {wizardStep === 'confirm' && (
          <div className="mx-auto max-w-xl space-y-4">
            <p className="text-sm font-semibold text-[#E8EDF5]">
              Review &amp; Submit
            </p>
            <div className="divide-y divide-[#1E3048] rounded-lg border border-[#1E3048]">
              {wizardVideos.map((u) => {
                const lineInfo = videoLines[u.id];
                return (
                  <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                    <Video className="h-4 w-4 shrink-0 text-[#60A5FA]" />
                    <span className="min-w-0 flex-1 truncate text-xs text-[#E8EDF5]">
                      {u.original_name}
                    </span>
                    <span className="text-[10px] text-[#5A7A9A]">
                      {lineInfo
                        ? `Line: [${lineInfo.start}] → [${lineInfo.end}]`
                        : 'No line (default)'}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 text-xs text-[#5A7A9A]">
              <span>
                Similarity:{' '}
                <strong className="text-[#E8EDF5]">{simThreshold}</strong>
              </span>
              <span>
                Confidence:{' '}
                <strong className="text-[#E8EDF5]">{confThreshold}</strong>
              </span>
            </div>
            <button
              onClick={handleProcessWrapper}
              disabled={processing}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1565C0] py-2.5 text-sm font-semibold text-white hover:bg-[#1976D2] disabled:opacity-60"
            >
              {processing && <Loader2 className="h-4 w-4 animate-spin" />}
              Start Processing
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
