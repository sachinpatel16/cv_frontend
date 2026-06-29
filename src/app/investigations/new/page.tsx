'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ImageIcon,
  Video,
  Loader2,
  CheckCircle2,
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  Folder,
  Sparkles,
  Settings2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { listMedia } from '@/lib/api/peoplefind';
import { getAnalysis } from '@/features/analyses/registry';
import { ManifestScanner } from '@/features/analyses/shared/ManifestScanner';
import type { MediaSource, AnalysisId } from '@/features/analyses/types';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

// ── Wizard steps ──────────────────────────────────────────────────────────────

type WizardStep = 'media' | 'scan' | 'configure';

const STEPS: { id: WizardStep; label: string; icon: React.ElementType }[] = [
  { id: 'media', label: 'Select Media', icon: Folder },
  { id: 'scan', label: 'Discover', icon: Sparkles },
  { id: 'configure', label: 'Configure', icon: Settings2 },
];

// ── Step indicator ────────────────────────────────────────────────────────────

function StepIndicator({
  steps,
  currentStep,
  onStepClick,
  canNavigateTo,
}: {
  steps: typeof STEPS;
  currentStep: WizardStep;
  onStepClick: (stepId: WizardStep) => void;
  canNavigateTo: (stepId: WizardStep) => boolean;
}) {
  const currentIdx = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="flex items-center gap-2">
      {steps.map((step, idx) => {
        const isActive = step.id === currentStep;
        const isCompleted = idx < currentIdx;
        const isClickable = canNavigateTo(step.id);
        const Icon = step.icon;

        return (
          <div key={step.id} className="flex items-center gap-2">
            {idx > 0 && (
              <div
                className={cn(
                  'h-px w-8 transition-colors sm:w-12',
                  isCompleted ? 'bg-[#1565C0]' : 'bg-[#1E3048]',
                )}
              />
            )}
            <button
              onClick={() => {
                if (isClickable && !isActive) {
                  onStepClick(step.id);
                }
              }}
              disabled={!isClickable}
              className={cn(
                'flex items-center gap-2 text-left disabled:cursor-not-allowed',
                isClickable && 'group cursor-pointer',
              )}
            >
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg border transition-all',
                  isActive
                    ? 'border-[#1565C0] bg-[#1565C0] text-white'
                    : isCompleted
                      ? 'border-[#1565C0]/40 bg-[#1565C0]/10 text-[#60A5FA]'
                      : 'border-[#1E3048] bg-[#0A0F1E] text-[#5A7A9A]',
                  isClickable &&
                    !isActive &&
                    'hover:border-[#1565C0] hover:text-[#60A5FA]',
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <span
                className={cn(
                  'hidden text-xs font-medium transition-colors sm:block',
                  isActive
                    ? 'text-[#E8EDF5]'
                    : isCompleted
                      ? 'text-[#60A5FA]'
                      : 'text-[#5A7A9A]',
                  isClickable && !isActive && 'group-hover:text-[#E8EDF5]',
                )}
              >
                {step.label}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function NewInvestigationPage() {
  const router = useRouter();

  // Wizard state
  const [step, setStep] = useState<WizardStep>('media');
  const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set());
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisId | null>(
    null,
  );
  const [hasVisitedDiscover, setHasVisitedDiscover] = useState(false);
  const [hasVisitedConfigure, setHasVisitedConfigure] = useState(false);

  useEffect(() => {
    if (step === 'scan') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasVisitedDiscover(true);
    } else if (step === 'configure') {
      setHasVisitedConfigure(true);
    }
  }, [step]);

  const canNavigateTo = useCallback(
    (targetStep: WizardStep) => {
      if (targetStep === 'media') return true;
      if (targetStep === 'scan') {
        return selectedMedia.size > 0 && hasVisitedDiscover;
      }
      if (targetStep === 'configure') {
        return (
          selectedMedia.size > 0 &&
          selectedAnalysis !== null &&
          hasVisitedConfigure
        );
      }
      return false;
    },
    [
      selectedMedia.size,
      hasVisitedDiscover,
      selectedAnalysis,
      hasVisitedConfigure,
    ],
  );

  // Media library state
  const [media, setMedia] = useState<MediaSource[]>([]);
  const [mediaLoading, setMediaLoading] = useState(true);

  const completedMedia = useMemo(
    () => media.filter((m) => m.status === 'completed'),
    [media],
  );

  const selectedMediaItems = useMemo(
    () => completedMedia.filter((m) => selectedMedia.has(m.id)),
    [completedMedia, selectedMedia],
  );

  // ── Fetch media ──
  const fetchMedia = useCallback(async () => {
    setMediaLoading(true);
    try {
      const res = await listMedia();
      setMedia(res.data);
    } catch {
      // silently fail
    } finally {
      setMediaLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMedia();
  }, [fetchMedia]);

  // ── Selection helpers ──
  function toggleMedia(id: string) {
    setSelectedMedia((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedMedia(new Set(completedMedia.map((m) => m.id)));
  }

  function clearSelection() {
    setSelectedMedia(new Set());
  }

  // ── Navigation ──
  function goNext() {
    if (step === 'media' && selectedMedia.size > 0) setStep('scan');
    else if (step === 'scan' && selectedAnalysis) setStep('configure');
  }

  function goBack() {
    if (step === 'scan') {
      setStep('media');
      setSelectedAnalysis(null);
    } else if (step === 'configure') {
      setStep('scan');
    }
  }

  // ── Analysis submission handler ──
  function handleAnalysisSubmit(sessionId: string) {
    if (selectedAnalysis) {
      router.push(`/investigations/${selectedAnalysis}?sessionId=${sessionId}`);
    }
  }

  // ── Resolve the selected analysis config ──
  const analysisConfig = selectedAnalysis
    ? getAnalysis(selectedAnalysis)
    : null;
  const InputComponent = analysisConfig?.InputComponent;

  return (
    <div className="max-w-5xl space-y-6">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#E8EDF5]">
            New Investigation
          </h1>
          <p className="mt-1 text-sm text-[#5A7A9A]">
            Select media, discover applicable analyses, and configure your run.
          </p>
        </div>
        <StepIndicator
          steps={STEPS}
          currentStep={step}
          onStepClick={setStep}
          canNavigateTo={canNavigateTo}
        />
      </div>

      {/* ════════ Step: Select Media ════════ */}
      {step === 'media' && (
        <div className="space-y-5">
          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <p className="text-xs font-semibold text-[#5A7A9A]">
                Indexed Media ({completedMedia.length})
              </p>
              {selectedMedia.size > 0 && (
                <span className="rounded-full bg-[#1565C0]/10 px-2.5 py-0.5 text-[10px] font-semibold text-[#60A5FA]">
                  {selectedMedia.size} selected
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selectedMedia.size < completedMedia.length ? (
                <button
                  onClick={selectAll}
                  className="text-xs font-medium text-[#5A7A9A] transition-colors hover:text-[#E8EDF5]"
                >
                  Select all
                </button>
              ) : (
                <button
                  onClick={clearSelection}
                  className="text-xs font-medium text-[#5A7A9A] transition-colors hover:text-[#E8EDF5]"
                >
                  Clear
                </button>
              )}
              <button
                onClick={fetchMedia}
                className="rounded-md p-1.5 text-[#5A7A9A] transition-colors hover:bg-[#1E3048] hover:text-[#E8EDF5]"
                title="Refresh"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              {/* Continue */}
              <div className="flex justify-end">
                <button
                  onClick={goNext}
                  disabled={selectedMedia.size === 0}
                  className="flex items-center gap-2 rounded-xl bg-[#1565C0] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1565C0]/90 disabled:opacity-40"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Media grid */}
          <div className="rounded-xl border border-[#1E3048] bg-[#0D1628]">
            {mediaLoading ? (
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-[#5A7A9A]" />
              </div>
            ) : completedMedia.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center gap-3 p-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#1E3048] bg-[#0A0F1E]">
                  <Folder className="h-6 w-6 text-[#5A7A9A]/40" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#E8EDF5]">
                    No media indexed
                  </p>
                  <p className="mt-0.5 text-xs text-[#5A7A9A]">
                    Upload photos or videos via{' '}
                    <a
                      href="/services/person-search"
                      className="font-medium text-[#60A5FA] hover:underline"
                    >
                      Person Search
                    </a>{' '}
                    to get started.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {completedMedia.map((item) => {
                  const isSelected = selectedMedia.has(item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggleMedia(item.id)}
                      className={cn(
                        'group relative overflow-hidden rounded-lg border text-left transition-all',
                        isSelected
                          ? 'border-[#1565C0] bg-[#1565C0]/5 ring-1 ring-[#1565C0]/30'
                          : 'border-[#1E3048] bg-[#0A0F1E] hover:border-[#1565C0]/30',
                      )}
                    >
                      {/* Thumbnail */}
                      <div className="relative aspect-square overflow-hidden bg-[#1E3048]/20">
                        {item.media_type === 'photo' ? (
                          <Image
                            src={`${BACKEND_URL}/${item.filepath}`}
                            alt={item.filename}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                          />
                        ) : (
                          <div className="relative h-full w-full">
                            <video
                              src={`${BACKEND_URL}/${item.filepath}#t=0.1`}
                              className="h-full w-full object-cover"
                              preload="metadata"
                              muted
                              playsInline
                            />
                            <div className="absolute right-2 bottom-2 rounded bg-black/60 p-1 text-white/80 backdrop-blur-sm">
                              <Video className="h-3.5 w-3.5" />
                            </div>
                          </div>
                        )}

                        {/* Selection checkbox */}
                        <div
                          className={cn(
                            'absolute top-2 left-2 flex h-5 w-5 items-center justify-center rounded-md border transition-all',
                            isSelected
                              ? 'border-[#1565C0] bg-[#1565C0]'
                              : 'border-white/30 bg-black/40 backdrop-blur-sm group-hover:border-white/60',
                          )}
                        >
                          {isSelected && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                          )}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="space-y-0.5 p-2">
                        <p
                          className="truncate text-xs text-[#E8EDF5]"
                          title={item.filename}
                        >
                          {item.filename}
                        </p>
                        <div className="flex items-center gap-1 text-[10px] text-[#5A7A9A]">
                          {item.media_type === 'photo' ? (
                            <ImageIcon className="h-3 w-3" />
                          ) : (
                            <Video className="h-3 w-3" />
                          )}
                          {item.media_type}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════ Step: Discover Analyses ════════ */}
      {step === 'scan' && (
        <div className="space-y-5">
          <ManifestScanner
            mediaCount={selectedMedia.size}
            onSelect={(id) => {
              setSelectedAnalysis(id);
              setStep('configure');
            }}
          />

          {/* Back */}
          <div className="flex justify-start">
            <button
              onClick={goBack}
              className="flex items-center gap-2 rounded-xl border border-[#1E3048] bg-transparent px-5 py-2.5 text-sm font-medium text-[#5A7A9A] transition-colors hover:bg-[#1E3048] hover:text-[#E8EDF5]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Media
            </button>
          </div>
        </div>
      )}

      {/* ════════ Step: Configure Analysis ════════ */}
      {step === 'configure' && InputComponent && (
        <div className="space-y-5">
          {/* Config header */}
          <div className="flex items-center gap-3 rounded-xl border border-[#1E3048] bg-[#0D1628] px-5 py-4">
            {analysisConfig && (
              <>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#1565C0]/20 bg-[#1565C0]/10">
                  <analysisConfig.icon className="h-5 w-5 text-[#60A5FA]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#E8EDF5]">
                    {analysisConfig.label}
                  </p>
                  <p className="mt-0.5 text-xs text-[#5A7A9A]">
                    Analysing {selectedMedia.size} media file
                    {selectedMedia.size !== 1 ? 's' : ''}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Analysis-specific input */}
          <InputComponent
            media={selectedMediaItems}
            onSubmit={handleAnalysisSubmit}
          />

          {/* Back */}
          <div className="flex justify-start">
            <button
              onClick={goBack}
              className="flex items-center gap-2 rounded-xl border border-[#1E3048] bg-transparent px-5 py-2.5 text-sm font-medium text-[#5A7A9A] transition-colors hover:bg-[#1E3048] hover:text-[#E8EDF5]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Analyses
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
