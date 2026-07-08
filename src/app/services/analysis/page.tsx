'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  Video,
  CheckCircle2,
  Sliders,
  Play,
  Layers,
  Eye,
  BarChart2,
  Activity,
  History,
  Loader2,
  X,
  ArrowRight,
  ArrowLeft,
  FolderOpen,
  Trash2,
  Plus,
  Calendar,
  ChevronRight,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { listGalleryMedia, getGalleryMediaUrl } from '@/lib/api/gallery';

// Object Count imports
import {
  triggerObjectAnalysis,
  deleteObjectCountMedia,
} from '@/lib/api/objectcount';
import { useObjectCountingStore } from '@/stores/objectCountingStore';
import { ConfigTab as ObjectCountConfigTab } from '@/app/services/object-counting/components/ConfigTab';
import { ResultsTab as ObjectCountResultsTab } from '@/app/services/object-counting/components/ResultsTab';

// Person Analysis imports
import {
  processBatchSessions,
  getAnalyticsSessionDetails,
  deleteAnalyticsSession,
} from '@/lib/api/peopleanalytics';
import { usePersonAnalysisStore } from '@/stores/personAnalysisStore';
import { useAnalysisPageStore } from '@/stores/analysisPageStore';
import { ConfigureTab as PersonAnalysisConfigTab } from '@/app/services/people-analytics/components/ConfigureTab';
import { ResultsTab as PersonAnalysisResultsTab } from '@/app/services/people-analytics/components/ResultsTab';

import type { GalleryMedia } from '@/types/gallery';
import Link from 'next/link';

type Step = 'history' | 'upload' | 'select' | 'configure' | 'run' | 'results';
type ResultsTabName = 'object-count' | 'person-analysis' | 'activity-detection';

function StatusBadge({ status }: { status: string }) {
  const statusColors: Record<string, string> = {
    pending: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
    processing: 'bg-blue-400/10 text-blue-400 border-blue-400/20 animate-pulse',
    completed: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
    failed: 'bg-rose-400/10 text-rose-400 border-rose-400/20',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize',
        statusColors[status] ||
          'border-[#1E3048] bg-[#1E3048]/30 text-[#5A7A9A]',
      )}
    >
      {status}
    </span>
  );
}

function AnalysisPageContent() {
  const router = useRouter();
  const {
    activeStep,
    setActiveStep,
    activeResultsTab,
    setActiveResultsTab,
    uploadedMedia,
    setUploadedMedia,
    galleryList,
    loadingGallery,
    fetchGalleryList,
    selectedAnalyses,
    setSelectedAnalyses,
    toggleAnalysis,
    clearMedia,
  } = useAnalysisPageStore();

  // Object Count Store Hooks
  const {
    media: objectCountRuns,
    selectedMediaId: objectCountMediaId,
    details: objectCountDetails,
    fetchMedia: fetchObjectCountRuns,
    fetchDetails: fetchObjectCountDetails,
  } = useObjectCountingStore();

  // Person Analysis Store Hooks
  const {
    sessions: personRuns,
    selectedSession: personSession,
    wizardStep: personWizardStep,
    fetchSessions: fetchPersonSessions,
  } = usePersonAnalysisStore();
  const personSessionId = personSession?.id;

  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');

  // Auto-check analysis if loaded from service links
  useEffect(() => {
    if (mode) {
      setSelectedAnalyses({
        objectCount: mode === 'object-count',
        personAnalysis: mode === 'people-analytics',
        activityDetection: mode === 'activity-detection',
      });
      // If a mode query is present, launch the upload step immediately
      setActiveStep('upload');
      if (mode === 'object-count') setActiveResultsTab('object-count');
      else if (mode === 'people-analytics')
        setActiveResultsTab('person-analysis');
    }
  }, [mode, setSelectedAnalyses, setActiveStep, setActiveResultsTab]);

  const loadHistory = useCallback(async () => {
    await Promise.allSettled([fetchObjectCountRuns(), fetchPersonSessions()]);
  }, [fetchObjectCountRuns, fetchPersonSessions]);

  useEffect(() => {
    if (activeStep === 'history') {
      loadHistory();
    }
  }, [activeStep, loadHistory]);

  useEffect(() => {
    if (activeStep === 'upload') {
      fetchGalleryList();
    }
  }, [activeStep, fetchGalleryList]);

  const hasSelection = Object.values(selectedAnalyses).some(Boolean);

  // Sync selection to Object Counting & Person Analysis stores on transition to Configure
  useEffect(() => {
    if (activeStep === 'configure' && uploadedMedia) {
      if (selectedAnalyses.objectCount) {
        useObjectCountingStore.setState({
          selectedMediaId: uploadedMedia.id,
          details: {
            id: uploadedMedia.id,
            gallery_media_id: uploadedMedia.id,
            status: 'pending',
            filename: uploadedMedia.filename,
            filepath: uploadedMedia.filepath,
            media_type: uploadedMedia.media_type,
            created_at: uploadedMedia.created_at,
            classify_gender: false,
            classify_vehicle: false,
            classes_to_track: [],
          } as any,
        });
      }

      if (selectedAnalyses.personAnalysis) {
        usePersonAnalysisStore.setState({
          wizardVideos: [
            {
              id: uploadedMedia.id,
              tenant_id: uploadedMedia.tenant_id,
              original_name: uploadedMedia.filename,
              saved_path: uploadedMedia.filepath,
              created_at: uploadedMedia.created_at,
            } as any,
          ],
          wizardStep: 'line',
          wizardVideoIndex: 0,
          videoLines: {},
        });
      }
    }
  }, [
    activeStep,
    selectedAnalyses.objectCount,
    selectedAnalyses.personAnalysis,
    uploadedMedia,
  ]);

  // Polling for Object Count status in Results step
  useEffect(() => {
    if (
      activeStep !== 'results' ||
      !selectedAnalyses.objectCount ||
      !objectCountMediaId
    )
      return;

    const status = objectCountDetails?.status;
    if (status === 'pending' || status === 'processing') {
      const interval = setInterval(() => {
        fetchObjectCountDetails(objectCountMediaId);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [
    activeStep,
    selectedAnalyses.objectCount,
    objectCountMediaId,
    objectCountDetails?.status,
    fetchObjectCountDetails,
  ]);

  // Polling for Person Analysis status in Results step
  useEffect(() => {
    if (
      activeStep !== 'results' ||
      !selectedAnalyses.personAnalysis ||
      !personSessionId
    )
      return;

    const status = personSession?.status;
    if (status === 'pending' || status === 'processing') {
      const interval = setInterval(async () => {
        try {
          const res = await getAnalyticsSessionDetails(personSessionId);
          if (res.data) {
            if (res.data.status === 'completed') {
              usePersonAnalysisStore.getState().selectSession(res.data);
            } else {
              usePersonAnalysisStore.setState({ selectedSession: res.data });
            }
          }
        } catch (err) {
          console.error('Failed to poll person analysis status', err);
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [
    activeStep,
    selectedAnalyses.personAnalysis,
    personSessionId,
    personSession?.status,
  ]);

  // Auto-back to history if media is deleted
  useEffect(() => {
    if (activeStep === 'results') {
      if (selectedAnalyses.objectCount && !objectCountMediaId) {
        clearMedia();
      } else if (selectedAnalyses.personAnalysis && !personSessionId) {
        clearMedia();
      }
    }
  }, [
    objectCountMediaId,
    personSessionId,
    activeStep,
    selectedAnalyses.objectCount,
    selectedAnalyses.personAnalysis,
    clearMedia,
  ]);

  const selectGalleryMedia = (item: GalleryMedia) => {
    if (uploadedMedia?.id === item.id) {
      setUploadedMedia(null);
      toast.success(`Deselected "${item.filename}"`);
    } else {
      setUploadedMedia(item);
      toast.success(`Selected "${item.filename}"`);
    }
  };

  // Unified Run triggers
  const [running, setRunning] = useState(false);

  const runAnalyses = async () => {
    if (!uploadedMedia) return;
    setRunning(true);
    try {
      // 1. Run Object Counting
      if (selectedAnalyses.objectCount) {
        const store = useObjectCountingStore.getState();
        const classesToTrack = store.getActiveClassesToTrack();
        const config = {
          classes_to_track: classesToTrack.length > 0 ? classesToTrack : null,
          classify_gender: store.trackPeople ? store.classifyGender : false,
          classify_vehicle: store.trackVehicles ? store.classifyVehicle : false,
          confidence_threshold: store.confidenceThreshold,
          min_track_frames: store.minTrackFrames,
          track_buffer: store.trackBuffer,
          entry_exit_report: store.entryExitReport,
          line_coords: store.entryExitReport ? store.lineCoords : null,
          gmc_method: store.gmcMethod,
          reid_classes: store.reidClasses.length > 0 ? store.reidClasses : null,
          imgsz: store.imgsz,
        };

        const res = await triggerObjectAnalysis(uploadedMedia.id, config);
        useObjectCountingStore.setState({
          selectedMediaId: res.data.id,
          details: { ...res.data, results: [] },
        });
        toast.success('Object counting analysis triggered!');
        setActiveResultsTab('object-count');
      }

      // 2. Run Person Analysis
      if (selectedAnalyses.personAnalysis) {
        const store = usePersonAnalysisStore.getState();
        const lineInfo = store.videoLines[uploadedMedia.id];
        const payload = {
          videos: [
            {
              gallery_media_id: uploadedMedia.id,
              ...(lineInfo
                ? { line_start: lineInfo.start, line_end: lineInfo.end }
                : {}),
            },
          ],
          similarity_threshold: store.simThreshold,
          confidence_threshold: store.confThreshold,
        };

        const res = await processBatchSessions(payload);
        if (res.data && res.data.length > 0) {
          usePersonAnalysisStore.setState({
            selectedSession: res.data[0],
            activeTab: 'results',
          });
          toast.success('Person analysis triggered!');
          if (!selectedAnalyses.objectCount) {
            setActiveResultsTab('person-analysis');
          }
        }
      }

      setActiveStep('results');
    } catch (err: any) {
      toast.error(err.message || 'Failed to start analysis');
    } finally {
      setRunning(false);
    }
  };

  // Click handler to select and view history details (routes to the standalone History page)
  const viewHistoryItem = (item: {
    id: string;
    type: 'object-count' | 'person-analysis';
  }) => {
    router.push(`/services/history?session_id=${item.id}&type=${item.type}`);
  };

  // Inline delete handler for history rows
  const deleteHistoryItem = async (
    id: string,
    type: 'object-count' | 'person-analysis',
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    if (
      !confirm(
        'Are you sure you want to delete this previous run from the database?',
      )
    )
      return;
    try {
      if (type === 'object-count') {
        await deleteObjectCountMedia(id);
      } else {
        await deleteAnalyticsSession(id);
      }
      toast.success('Investigation deleted successfully');
      loadHistory();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete investigation');
    }
  };

  // Merge and sort runs history chronologically
  const combinedHistory = [
    ...(objectCountRuns || []).map((run) => ({
      id: run.id,
      type: 'object-count' as const,
      filename: run.filename || 'Object Counting Run',
      filepath: run.filepath,
      status: run.status,
      created_at: run.created_at,
      originalData: run,
    })),
    ...(personRuns || []).map((run) => ({
      id: run.id,
      type: 'person-analysis' as const,
      filename: run.video_name || 'Person Analysis Session',
      filepath: run.video_path,
      status: run.status,
      created_at: run.created_at,
      originalData: run,
    })),
  ].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const recentHistory = combinedHistory.slice(0, 3);

  // Check if setup is pending inside Person Analysis wizard
  const isPersonAnalysisConfiguring =
    selectedAnalyses.personAnalysis && personWizardStep !== 'confirm';

  return (
    <div className="max-w-6xl space-y-6">
      {/* CSS Override to hide original trigger buttons and define animations */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .object-counting-config-wrapper button.bg-\\[\\#1565C0\\] {
          display: none !important;
        }
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(21, 101, 192, 0.5);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 14px 4px rgba(21, 101, 192, 0.7);
            transform: scale(1.02);
          }
        }
        @keyframes slide-up {
          from {
            transform: translateY(30px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-pulse-glow {
          animation: pulse-glow 2s infinite ease-in-out;
        }
        .animate-slide-up {
          animation: slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `,
        }}
      />

      {/* Conditionally hide Start Processing button in Person Analysis ConfigureTab when on confirm wizard step */}
      {personWizardStep === 'confirm' && (
        <style
          dangerouslySetInnerHTML={{
            __html: `
          .people-analytics-config-wrapper .grid-cols-1 .md\\:col-span-5 > button.bg-\\[\\#1565C0\\] {
            display: none !important;
          }
        `,
          }}
        />
      )}

      {/* ── HEADER ROW ── */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#E8EDF5]">
            {activeStep === 'history'
              ? 'Investigations History'
              : 'New Investigation'}
          </h1>
          <p className="text-sm text-[#5A7A9A]">
            {activeStep === 'history'
              ? 'View previous computer vision run history, logs, and compiled analytics.'
              : 'Launch new custom object tracking, occupancy line, and behavior detections.'}
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          {/* New Investigation Button (Shown on History Landing Page) */}
          {activeStep === 'history' && (
            <button
              onClick={() => setActiveStep('upload')}
              className="flex items-center gap-2 rounded-lg bg-[#1565C0] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-[#1565C0]/20 transition-all hover:bg-[#1976D2]"
            >
              <Plus className="h-4.5 w-4.5" />
              New Investigation
            </button>
          )}

          {/* Wizard Step 1 Actions: My Library & Analyse */}
          {activeStep === 'upload' && (
            <div className="flex items-center gap-2">
              <Link
                href="/services/library"
                className="flex items-center gap-2 rounded-lg border border-[#1E3048] bg-[#0D1628] px-3.5 py-2 text-xs font-medium text-[#5A7A9A] transition-colors hover:border-[#1565C0]/50 hover:bg-[#1E3048] hover:text-[#E8EDF5]"
              >
                <FolderOpen className="h-3.5 w-3.5" />
                My Library
              </Link>

              <button
                disabled={!uploadedMedia}
                onClick={() => setActiveStep('select')}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white shadow transition-all',
                  uploadedMedia
                    ? 'animate-pulse-glow bg-[#1565C0] hover:bg-[#1976D2]'
                    : 'cursor-not-allowed bg-[#1E3048] text-[#5A7A9A] opacity-50',
                )}
              >
                Analyse
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Back to History button for cancelling Wizard */}
          {activeStep !== 'history' && (
            <button
              onClick={clearMedia}
              className="flex items-center gap-1.5 rounded-lg border border-[#1E3048] bg-[#0D1628] px-3.5 py-2 text-xs font-medium text-[#5A7A9A] transition-colors hover:bg-[#1E3048] hover:text-[#E8EDF5]"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* ── HISTORY LANDING PAGE VIEW ── */}
      {activeStep === 'history' && (
        <div className="space-y-4 rounded-xl border border-[#1E3048] bg-[#0D1628] p-5">
          <div className="flex items-center gap-2 border-b border-[#1E3048] pb-3">
            <History className="h-4 w-4 text-[#1565C0]" />
            <h2 className="text-sm font-semibold text-[#E8EDF5]">
              Previous Runs
            </h2>
          </div>

          {combinedHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center space-y-3 py-16 text-center text-[#5A7A9A]">
              <History className="h-10 w-10 opacity-30" />
              <div>
                <p className="text-sm font-semibold text-[#E8EDF5]">
                  No previous investigations found
                </p>
                <p className="mx-auto mt-0.5 max-w-sm text-xs">
                  Start a new custom tracking session or upload media files to
                  trigger analyses.
                </p>
              </div>
              <button
                onClick={() => setActiveStep('upload')}
                className="mt-2 flex items-center gap-1.5 rounded-lg bg-[#1565C0] px-3.5 py-2 text-xs font-semibold text-white shadow transition-all hover:bg-[#1976D2]"
              >
                <Plus className="h-3.5 w-3.5" /> Start New
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#E8EDF5]">
                <thead>
                  <tr className="border-b border-[#1E3048] font-semibold text-[#5A7A9A]">
                    <th className="pb-3 pl-2">Investigation Details</th>
                    <th className="pb-3">Analysis Type</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Triggered Date</th>
                    <th className="pr-2 pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E3048]/50">
                  {recentHistory.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => viewHistoryItem(item)}
                      className="group cursor-pointer transition-colors hover:bg-[#1E3048]/25"
                    >
                      <td className="py-3.5 pl-2 font-medium">
                        <div className="flex max-w-[320px] items-center gap-2 sm:max-w-md">
                          {item.type === 'object-count' ? (
                            <BarChart2 className="h-4 w-4 shrink-0 text-[#60A5FA]" />
                          ) : (
                            <Eye className="h-4 w-4 shrink-0 text-[#60A5FA]" />
                          )}
                          <span className="block truncate leading-none">
                            {item.filename}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 text-[#5A7A9A]">
                        {item.type === 'object-count'
                          ? 'Object Count & Track'
                          : 'People ReID & Crossing'}
                      </td>
                      <td className="py-3.5">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="py-3.5 text-[#5A7A9A]">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 opacity-60" />
                          {new Date(item.created_at).toLocaleDateString()}{' '}
                          {new Date(item.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>
                      <td className="py-3.5 pr-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={(e) =>
                              deleteHistoryItem(item.id, item.type, e)
                            }
                            className="rounded p-1.5 text-[#5A7A9A] opacity-0 transition-colors group-hover:opacity-100 hover:bg-red-400/10 hover:text-red-400"
                            title="Delete Permanently"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <ChevronRight className="h-4 w-4 text-[#5A7A9A] transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {combinedHistory.length > 3 && (
                <div className="flex justify-end border-t border-[#1E3048]/40 pt-3">
                  <Link
                    href="/services/history"
                    className="flex items-center gap-1 text-xs font-semibold text-[#60A5FA] transition-colors hover:text-[#1565C0]"
                  >
                    View All History ({combinedHistory.length})
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── WIZARD WORKFLOW (UPLOAD & CONFIGURATION STEPS) ── */}
      {activeStep !== 'history' && (
        <>
          {/* Steps Visual Indicator */}
          <div className="grid grid-cols-5 gap-2 rounded-xl border border-[#1E3048] bg-[#0A0F1E] p-2 text-center">
            {(['upload', 'select', 'configure', 'run', 'results'] as const).map(
              (step, idx) => {
                const isCurrent = activeStep === step;
                const isCompleted =
                  ['upload', 'select', 'configure', 'run', 'results'].indexOf(
                    activeStep,
                  ) > idx;
                const disabled = !uploadedMedia && step !== 'upload';

                return (
                  <button
                    key={step}
                    disabled={disabled}
                    onClick={() => setActiveStep(step)}
                    className={cn(
                      'flex flex-col items-center justify-center gap-1.5 rounded-lg py-2.5 transition-colors',
                      isCurrent &&
                        'border border-[#1565C0]/30 bg-[#1565C0]/20 font-medium text-[#60A5FA]',
                      !isCurrent && 'text-[#5A7A9A] hover:text-[#E8EDF5]',
                      isCompleted && 'text-emerald-400',
                      disabled &&
                        'cursor-not-allowed opacity-40 hover:text-[#5A7A9A]',
                    )}
                  >
                    <div className="flex h-5 w-5 items-center justify-center rounded-full border border-current text-[10px] font-bold">
                      {isCompleted ? '✓' : idx + 1}
                    </div>
                    <span className="hidden text-xs capitalize md:inline">
                      {step === 'select' ? 'Choose Analysis' : step}
                    </span>
                  </button>
                );
              },
            )}
          </div>

          {/* Results View */}
          {activeStep === 'results' && (
            <div className="space-y-6">
              <div className="flex gap-2 border-b border-[#1E3048]">
                {selectedAnalyses.objectCount && (
                  <button
                    onClick={() => setActiveResultsTab('object-count')}
                    className={cn(
                      'border-b-2 px-4 py-2 text-sm font-semibold transition-colors',
                      activeResultsTab === 'object-count'
                        ? 'border-[#1565C0] text-[#E8EDF5]'
                        : 'border-transparent text-[#5A7A9A]',
                    )}
                  >
                    Object Count
                  </button>
                )}
                {selectedAnalyses.personAnalysis && (
                  <button
                    onClick={() => setActiveResultsTab('person-analysis')}
                    className={cn(
                      'border-b-2 px-4 py-2 text-sm font-semibold transition-colors',
                      activeResultsTab === 'person-analysis'
                        ? 'border-[#1565C0] text-[#E8EDF5]'
                        : 'border-transparent text-[#5A7A9A]',
                    )}
                  >
                    Person Analysis
                  </button>
                )}
                {selectedAnalyses.activityDetection && (
                  <button
                    onClick={() => setActiveResultsTab('activity-detection')}
                    className={cn(
                      'border-b-2 px-4 py-2 text-sm font-semibold transition-colors',
                      activeResultsTab === 'activity-detection'
                        ? 'border-[#1565C0] text-[#E8EDF5]'
                        : 'border-transparent text-[#5A7A9A]',
                    )}
                  >
                    Activity Detection
                  </button>
                )}
              </div>

              {activeResultsTab === 'object-count' &&
                selectedAnalyses.objectCount && <ObjectCountResultsTab />}
              {activeResultsTab === 'person-analysis' &&
                selectedAnalyses.personAnalysis && <PersonAnalysisResultsTab />}
            </div>
          )}

          {/* Setup / Configuration Workflow View */}
          {activeStep !== 'results' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Wizard Step 1: Select Media (Grid of Videos only) */}
              {activeStep === 'upload' && (
                <div className="col-span-full space-y-4 rounded-xl border border-[#1E3048] bg-[#0D1628] p-5">
                  <div className="flex items-center justify-between border-b border-[#1E3048] pb-3">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-[#E8EDF5]">
                      <Video className="h-4 w-4 text-[#1565C0]" />
                      1. Select Media (Videos Only)
                    </h2>
                    <span className="text-[11px] text-[#5A7A9A]">
                      Select a single video file to analyze
                    </span>
                  </div>

                  {loadingGallery ? (
                    <div className="flex h-48 w-full items-center justify-center text-xs text-[#5A7A9A]">
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading
                      video assets...
                    </div>
                  ) : galleryList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center space-y-2 rounded-xl border border-dashed border-[#1E3048] bg-[#0A0F1E]/20 py-16 text-center text-[#5A7A9A]">
                      <FolderOpen className="h-8 w-8 opacity-30" />
                      <p className="text-xs font-semibold text-[#E8EDF5]">
                        No videos in your library
                      </p>
                      <p className="mx-auto max-w-[200px] text-[10px] leading-normal">
                        Click the &quot;My Library&quot; button in the top right
                        to upload videos first.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                      {galleryList.map((item) => {
                        const isSelected = uploadedMedia?.id === item.id;
                        return (
                          <div
                            key={item.id}
                            onClick={() => selectGalleryMedia(item)}
                            className={cn(
                              'group relative flex min-h-[160px] cursor-pointer flex-col justify-between overflow-hidden rounded-xl border bg-[#0A0F1E] transition-all',
                              isSelected
                                ? 'border-[#1565C0] ring-1 ring-[#1565C0]/40'
                                : 'border-[#1E3048] hover:border-[#1E3048]/80',
                            )}
                          >
                            {/* Video Poster Preview */}
                            <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden border-b border-[#1E3048]/60 bg-black">
                              <video
                                src={`${getGalleryMediaUrl(item.filepath)}#t=0.5`}
                                preload="metadata"
                                muted
                                className="h-full w-full object-cover opacity-60 transition-opacity group-hover:opacity-85"
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                                <Video className="h-5 w-5 text-white/50" />
                              </div>

                              {/* Round Checkbox (top-right corner) */}
                              <div
                                className={cn(
                                  'absolute top-2.5 right-2.5 z-10 flex h-4.5 w-4.5 items-center justify-center rounded-full border transition-all',
                                  isSelected
                                    ? 'border-[#60A5FA] bg-[#1565C0] text-white'
                                    : 'border-[#1E3048] bg-black/60 text-transparent',
                                )}
                              >
                                {isSelected && (
                                  <Check className="h-3 w-3 stroke-[3]" />
                                )}
                              </div>
                            </div>

                            {/* Details */}
                            <div className="min-w-0 p-3">
                              <span
                                className="block truncate text-xs font-semibold text-[#E8EDF5]"
                                title={item.filename}
                              >
                                {item.filename}
                              </span>
                              <p className="mt-0.5 text-[9px] text-[#5A7A9A]">
                                {new Date(item.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Floating Action Bar for Step 1 selection */}
              {activeStep === 'upload' && uploadedMedia && (
                <div className="animate-slide-up fixed right-6 bottom-6 z-50 w-full max-w-sm">
                  <div className="flex items-center justify-between rounded-xl border border-[#1E3048] bg-[#0A0F1E]/95 p-4 shadow-2xl shadow-black/80 backdrop-blur-md">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1565C0]/20 text-[#60A5FA]">
                        <Video className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-semibold tracking-wider text-[#5A7A9A] uppercase">
                          Ready to Analyse
                        </p>
                        <p className="truncate text-xs font-bold text-[#E8EDF5]">
                          {uploadedMedia.filename}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveStep('select')}
                      className="animate-pulse-glow flex items-center gap-1.5 rounded-lg bg-[#1565C0] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-[#1565C0]/40 transition-all hover:bg-[#1976D2]"
                    >
                      Analyse Video
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {activeStep !== 'upload' && (
                <>
                  {/* Left Column: Checklist */}
                  <div className="space-y-6 lg:col-span-1">
                    {/* Checklist */}
                    <div className="space-y-4 rounded-xl border border-[#1E3048] bg-[#0D1628] p-5">
                      <h2 className="flex items-center gap-2 text-sm font-semibold text-[#E8EDF5]">
                        <Layers className="h-4 w-4 text-[#1565C0]" />
                        2. Choose Analyses
                      </h2>
                      <p className="text-xs text-[#5A7A9A]">
                        Select one or multiple analyses to run on this video:
                      </p>

                      <div className="space-y-2.5">
                        {[
                          {
                            id: 'objectCount',
                            label: 'Object Count',
                            desc: 'Detect and track custom items (vehicles, people, etc.)',
                            icon: BarChart2,
                          },
                          {
                            id: 'personAnalysis',
                            label: 'Person Analysis',
                            desc: 'Identify crossing gates, entry/exit, and occupancy count',
                            icon: Eye,
                          },
                          {
                            id: 'activityDetection',
                            label: 'Activity Detection',
                            desc: 'Detect behavioral alerts (falls, loitering, fighting)',
                            icon: Activity,
                          },
                        ].map(({ id, label, desc, icon: Icon }) => {
                          const disabled = !uploadedMedia;
                          return (
                            <div
                              key={id}
                              onClick={() => {
                                if (disabled) {
                                  toast.error(
                                    'Please select a video file first.',
                                  );
                                  return;
                                }
                                toggleAnalysis(id as any);
                              }}
                              className={cn(
                                'flex items-start gap-3 rounded-lg border p-3 transition-all select-none',
                                selectedAnalyses[
                                  id as keyof typeof selectedAnalyses
                                ]
                                  ? 'border-[#1565C0] bg-[#1565C0]/5'
                                  : 'border-[#1E3048] bg-[#0A0F1E]',
                                disabled
                                  ? 'cursor-not-allowed opacity-40'
                                  : 'cursor-pointer hover:border-[#1E3048]/80',
                              )}
                            >
                              <div
                                className={cn(
                                  'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all',
                                  selectedAnalyses[
                                    id as keyof typeof selectedAnalyses
                                  ]
                                    ? 'border-[#60A5FA] bg-[#1565C0]'
                                    : 'border-[#1E3048] bg-[#0D1628]',
                                )}
                              >
                                {selectedAnalyses[
                                  id as keyof typeof selectedAnalyses
                                ] && (
                                  <CheckCircle2 className="h-3 w-3 text-white" />
                                )}
                              </div>
                              <div className="space-y-0.5">
                                <span className="flex items-center gap-1.5 text-xs font-semibold text-[#E8EDF5]">
                                  <Icon className="h-3.5 w-3.5 text-[#5A7A9A]" />
                                  {label}
                                </span>
                                <p className="text-[10px] leading-relaxed text-[#5A7A9A]">
                                  {desc}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {uploadedMedia && activeStep === 'select' && (
                        <button
                          disabled={!hasSelection}
                          onClick={() => setActiveStep('configure')}
                          className={cn(
                            'flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold text-white transition-all',
                            hasSelection
                              ? 'bg-[#1565C0] hover:bg-[#1976D2]'
                              : 'cursor-not-allowed bg-[#1E3048] text-[#5A7A9A] opacity-50',
                          )}
                        >
                          Configure Selected Analysis
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Previews & Configurations */}
                  <div className="space-y-6 lg:col-span-2">
                    {activeStep === 'select' && (
                      <div className="space-y-4 rounded-xl border border-[#1E3048] bg-[#0D1628] p-5">
                        <h2 className="flex items-center gap-2 text-sm font-semibold text-[#E8EDF5]">
                          <Video className="h-4 w-4 text-[#1565C0]" />
                          Media Preview
                        </h2>
                        {uploadedMedia ? (
                          <div className="overflow-hidden rounded-lg border border-[#1E3048] bg-black">
                            <video
                              src={getGalleryMediaUrl(uploadedMedia.filepath)}
                              controls
                              preload="metadata"
                              className="h-auto max-h-[480px] w-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className="flex aspect-video w-full flex-col items-center justify-center rounded-lg border border-[#1E3048] bg-[#0A0F1E] p-6 text-center text-[#5A7A9A]">
                            <Video className="mb-2 h-10 w-10 opacity-30" />
                            <p className="text-xs">
                              No media selected. Please go back and select a
                              video.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {activeStep === 'configure' && (
                      <div className="space-y-6">
                        {selectedAnalyses.objectCount && (
                          <div className="object-counting-config-wrapper space-y-4">
                            <div className="flex items-center justify-between rounded-xl border border-[#1E3048] bg-[#0D1628] p-4">
                              <h2 className="flex items-center gap-2 text-sm font-semibold text-[#E8EDF5]">
                                <BarChart2 className="h-4 w-4 text-[#1565C0]" />
                                Configure Object Count
                              </h2>
                              <button
                                onClick={() => setActiveStep('select')}
                                className="flex items-center gap-1 text-xs text-[#5A7A9A] hover:text-[#E8EDF5]"
                              >
                                <ArrowLeft className="h-3.5 w-3.5" /> Back
                              </button>
                            </div>
                            <ObjectCountConfigTab />
                          </div>
                        )}

                        {selectedAnalyses.personAnalysis && (
                          <div className="people-analytics-config-wrapper space-y-4">
                            <div className="flex items-center justify-between rounded-xl border border-[#1E3048] bg-[#0D1628] p-4">
                              <h2 className="flex items-center gap-2 text-sm font-semibold text-[#E8EDF5]">
                                <Eye className="h-4 w-4 text-[#1565C0]" />
                                Configure Person Analysis
                              </h2>
                              <button
                                onClick={() => setActiveStep('select')}
                                className="flex items-center gap-1 text-xs text-[#5A7A9A] hover:text-[#E8EDF5]"
                              >
                                <ArrowLeft className="h-3.5 w-3.5" /> Back
                              </button>
                            </div>
                            <PersonAnalysisConfigTab />
                          </div>
                        )}

                        {/* Unified Run Button */}
                        <div className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-5">
                          <button
                            disabled={running || isPersonAnalysisConfiguring}
                            onClick={runAnalyses}
                            className={cn(
                              'flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white shadow-md transition-all',
                              isPersonAnalysisConfiguring
                                ? 'cursor-not-allowed bg-[#1E3048] text-[#5A7A9A] opacity-60'
                                : 'bg-[#1565C0] shadow-[#1565C0]/20 hover:bg-[#1976D2]',
                            )}
                          >
                            {running ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Triggering Analyses...
                              </>
                            ) : isPersonAnalysisConfiguring ? (
                              'Complete Person Analysis Setup (in Configuration tab above)'
                            ) : (
                              <>
                                <Play className="h-4 w-4 fill-current" />
                                Run Selected Analyses
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function UnifiedAnalysisPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-48 w-full items-center justify-center text-sm text-[#5A7A9A]">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Loading...
        </div>
      }
    >
      <AnalysisPageContent />
    </Suspense>
  );
}
