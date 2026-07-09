'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  Video,
  Eye,
  BarChart2,
  History as HistoryIcon,
  Loader2,
  Trash2,
  Calendar,
  ChevronRight,
  ArrowLeft,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Object Count imports
import { deleteObjectCountMedia } from '@/lib/api/objectcount';
import { useObjectCountingStore } from '@/stores/objectCountingStore';
import { ResultsTab as ObjectCountResultsTab } from '@/app/services/object-counting/components/ResultsTab';

// Person Analysis imports
import {
  getAnalyticsSessionDetails,
  deleteAnalyticsSession,
} from '@/lib/api/peopleanalytics';
import { usePersonAnalysisStore } from '@/stores/personAnalysisStore';
import { useHistoryPageStore } from '@/stores/historyPageStore';
import { ResultsTab as PersonAnalysisResultsTab } from '@/app/services/people-analytics/components/ResultsTab';

type ViewMode = 'list' | 'results';
type ResultsTabName = 'object-count' | 'person-analysis';

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

function HistoryPageContent() {
  const {
    viewMode,
    setViewMode,
    activeResultsTab,
    setActiveResultsTab,
    loading,
    loadHistory,
    itemToDelete,
    setItemToDelete,
    deleteHistoryItem,
  } = useHistoryPageStore();

  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const sessionType = searchParams.get('type');

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
    fetchSessions: fetchPersonSessions,
  } = usePersonAnalysisStore();
  const personSessionId = personSession?.id;

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Parse and auto-load session details from query params (e.g. redirected from landing page)
  useEffect(() => {
    if (sessionId && sessionType) {
      const loadParamsSession = async () => {
        if (sessionType === 'object-count') {
          useObjectCountingStore.setState({
            selectedMediaId: sessionId,
          });
          try {
            await fetchObjectCountDetails(sessionId);
            setActiveResultsTab('object-count');
            setViewMode('results');
          } catch (err) {
            toast.error('Failed to load object counting run details.');
          }
        } else if (sessionType === 'person-analysis') {
          try {
            const res = await getAnalyticsSessionDetails(sessionId);
            if (res.data) {
              usePersonAnalysisStore.setState({
                selectedSession: res.data,
              });
              await usePersonAnalysisStore.getState().selectSession(res.data);
              setActiveResultsTab('person-analysis');
              setViewMode('results');
            }
          } catch (err) {
            toast.error('Failed to load people analytics session details.');
          }
        }
      };
      loadParamsSession();
    }
  }, [
    sessionId,
    sessionType,
    fetchObjectCountDetails,
    setActiveResultsTab,
    setViewMode,
  ]);

  // Polling for Object Count status if viewing details
  useEffect(() => {
    if (
      viewMode !== 'results' ||
      activeResultsTab !== 'object-count' ||
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
    viewMode,
    activeResultsTab,
    objectCountMediaId,
    objectCountDetails?.status,
    fetchObjectCountDetails,
  ]);

  // Polling for Person Analysis status if viewing details
  useEffect(() => {
    if (
      viewMode !== 'results' ||
      activeResultsTab !== 'person-analysis' ||
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
  }, [viewMode, activeResultsTab, personSessionId, personSession?.status]);

  const viewHistoryItem = async (item: {
    id: string;
    type: 'object-count' | 'person-analysis';
    originalData: any;
  }) => {
    if (item.type === 'object-count') {
      useObjectCountingStore.setState({
        selectedMediaId: item.id,
        details: item.originalData,
      });
      await fetchObjectCountDetails(item.id);
      setActiveResultsTab('object-count');
    } else {
      usePersonAnalysisStore.setState({
        selectedSession: item.originalData,
      });
      await usePersonAnalysisStore.getState().selectSession(item.originalData);
      setActiveResultsTab('person-analysis');
    }
    setViewMode('results');
  };

  const handleDeleteTrigger = (
    id: string,
    type: 'object-count' | 'person-analysis',
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    setItemToDelete({ id, type });
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
      filename: run.video_name || 'People Analytics Session',
      filepath: run.video_path,
      status: run.status,
      created_at: run.created_at,
      originalData: run,
    })),
  ].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return (
    <div className="max-w-6xl space-y-6">
      {/* CSS Override to hide original trigger buttons in ConfigTab */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .object-counting-config-wrapper button.bg-\\[\\#1565C0\\] {
          display: none !important;
        }
      `,
        }}
      />

      {/* Header Row */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {viewMode === 'results' && (
              <button
                onClick={() => setViewMode('list')}
                className="rounded-lg p-1 text-[#5A7A9A] transition-colors hover:bg-[#1E3048] hover:text-[#E8EDF5]"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <h1 className="text-xl font-bold text-[#E8EDF5]">
              {viewMode === 'results'
                ? 'Investigation Results'
                : 'Complete History'}
            </h1>
          </div>
          <p className="ml-1 text-sm text-[#5A7A9A]">
            {viewMode === 'results'
              ? 'Detailed breakdown of the selected computer vision analysis run.'
              : 'Comprehensive log of all previous video tracking and behavioral runs.'}
          </p>
        </div>
      </div>

      {/* ── RESULTS VIEW ── */}
      {viewMode === 'results' && (
        <div className="space-y-6">
          <div className="flex gap-2 border-b border-[#1E3048]">
            {activeResultsTab === 'object-count' ? (
              <button className="border-b-2 border-[#1565C0] px-4 py-2 text-sm font-semibold text-[#E8EDF5]">
                Object Count Results
              </button>
            ) : (
              <button className="border-b-2 border-[#1565C0] px-4 py-2 text-sm font-semibold text-[#E8EDF5]">
                People Analytics Results
              </button>
            )}
          </div>

          {activeResultsTab === 'object-count' && <ObjectCountResultsTab />}
          {activeResultsTab === 'person-analysis' && (
            <PersonAnalysisResultsTab />
          )}
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {viewMode === 'list' && (
        <div className="space-y-4 rounded-xl border border-[#1E3048] bg-[#0D1628] p-5">
          <div className="flex items-center gap-2 border-b border-[#1E3048] pb-3">
            <HistoryIcon className="h-4 w-4 text-[#1565C0]" />
            <h2 className="text-sm font-semibold text-[#E8EDF5]">
              All Logged Runs
            </h2>
          </div>

          {loading && combinedHistory.length === 0 ? (
            <div className="flex h-48 w-full items-center justify-center text-xs text-[#5A7A9A]">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading history
              logs...
            </div>
          ) : combinedHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center space-y-2 py-16 text-center text-[#5A7A9A]">
              <HistoryIcon className="h-8 w-8 opacity-30" />
              <p className="text-xs font-semibold text-[#E8EDF5]">
                No history logs found
              </p>
              <p className="text-[10px]">
                Your completed analysis tasks will be logged here.
              </p>
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
                  {combinedHistory.map((item) => (
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
                              handleDeleteTrigger(item.id, item.type, e)
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
            </div>
          )}
        </div>
      )}

      {/* ── CUSTOM DELETE CONFIRMATION MODAL ── */}
      {itemToDelete && (
        <div
          className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setItemToDelete(null)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl border border-red-500/20 bg-[#0D1628] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-1 w-full bg-gradient-to-r from-red-600 to-red-400" />
            <div className="space-y-5 p-6">
              <div className="flex items-start gap-4">
                <div className="shrink-0 rounded-xl border border-red-500/20 bg-red-500/10 p-3">
                  <AlertTriangle className="h-6 w-6 text-red-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#E8EDF5]">
                    Delete Run History?
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-[#5A7A9A]">
                    You are about to permanently delete this investigation run
                    from the database. This action{' '}
                    <span className="font-medium text-red-400">
                      cannot be undone
                    </span>
                    .
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setItemToDelete(null)}
                  className="flex-1 rounded-xl border border-[#1E3048] px-4 py-2.5 text-sm font-medium text-[#5A7A9A] hover:bg-[#1E3048] hover:text-[#E8EDF5]"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteHistoryItem}
                  className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-48 w-full items-center justify-center text-sm text-[#5A7A9A]">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Loading history
          page...
        </div>
      }
    >
      <HistoryPageContent />
    </Suspense>
  );
}
