'use client';

import { useEffect } from 'react';
import { History, Video, SlidersHorizontal, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { usePersonAnalysisStore } from '@/stores/personAnalysisStore';
import {
  getSessionDetectedPeople,
  getVisitorAnalytics,
} from '@/lib/api/peopleanalytics';
import type { AnalyticsSession } from '@/types/peopleanalytics';

// Import modular components
import { UploadsTab } from './components/UploadsTab';
import { ConfigureTab } from './components/ConfigureTab';
import { ResultsTab } from './components/ResultsTab';
import { HistoryDrawer } from './components/HistoryDrawer';

type Tab = 'uploads' | 'configure' | 'results';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'uploads', label: 'Uploads', icon: Video },
  { id: 'configure', label: 'Configure', icon: SlidersHorizontal },
  { id: 'results', label: 'Results', icon: BarChart3 },
];

export default function PeopleAnalyticsPage() {
  const {
    activeTab: tab,
    setActiveTab: setTab,
    sessions,
    sessionsLoading,
    historyOpen,
    setHistoryOpen,
    selectedSession,
    fetchSessions,
    selectSession,
  } = usePersonAnalysisStore();

  useEffect(() => {
    fetchSessions();
    getVisitorAnalytics()
      .then((r: any) =>
        usePersonAnalysisStore.setState({ visitorStats: r.data }),
      )
      .catch(() => {});
  }, [fetchSessions]);

  // Auto-poll if any session is pending/processing
  useEffect(() => {
    const hasPending = sessions.some(
      (s) => s.status === 'pending' || s.status === 'processing',
    );
    if (!hasPending) return;
    const timer = setInterval(() => fetchSessions(), 5000);
    return () => clearInterval(timer);
  }, [sessions, fetchSessions]);

  // Update selected session from polled data
  useEffect(() => {
    if (!selectedSession) return;
    const updated = sessions.find((s) => s.id === selectedSession.id);
    if (updated && updated.status !== selectedSession.status) {
      usePersonAnalysisStore.setState({ selectedSession: updated });
      if (updated.status === 'completed') {
        toast.success(`Session "${updated.video_name}" completed!`);
        usePersonAnalysisStore.setState({ loadingPeople: true });
        getSessionDetectedPeople(updated.id)
          .then((res: any) =>
            usePersonAnalysisStore.setState({ detectedPeople: res.data }),
          )
          .catch(() => usePersonAnalysisStore.setState({ detectedPeople: [] }))
          .finally(() =>
            usePersonAnalysisStore.setState({ loadingPeople: false }),
          );
        // Refresh global visitors stats when a job finishes
        getVisitorAnalytics()
          .then((r: any) =>
            usePersonAnalysisStore.setState({ visitorStats: r.data }),
          )
          .catch(() => {});
      }
    }
  }, [sessions, selectedSession]);

  const handleSelectSession = async (s: AnalyticsSession) => {
    await selectSession(s);
  };

  return (
    <div className="max-w-6xl space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-[#5A7A9A]">
          CCTV video counting, interactive entry/exit crossing gate, and
          occupancy analytics.
        </p>
        <button
          onClick={() => {
            setHistoryOpen(true);
            fetchSessions();
          }}
          className="relative flex shrink-0 items-center gap-2 rounded-lg border border-[#1E3048] bg-[#0D1628] px-3 py-1.5 text-xs font-medium text-[#5A7A9A] transition-colors hover:border-[#1565C0]/50 hover:bg-[#1E3048] hover:text-[#E8EDF5]"
        >
          <History className="h-3.5 w-3.5" />
          History
          {sessions.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#1565C0] text-[9px] font-bold text-white">
              {sessions.length > 99 ? '99+' : sessions.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 rounded-lg border border-[#1E3048] bg-[#0A0F1E] p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
              tab === id
                ? 'bg-[#1565C0] text-white'
                : 'text-[#5A7A9A] hover:bg-[#1E3048] hover:text-[#E8EDF5]',
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'uploads' && <UploadsTab />}
      {tab === 'configure' && <ConfigureTab />}
      {tab === 'results' && <ResultsTab />}

      {/* History Drawer */}
      <HistoryDrawer
        open={historyOpen}
        sessions={sessions}
        loading={sessionsLoading}
        onClose={() => setHistoryOpen(false)}
        onRefresh={fetchSessions}
        onSelectSession={handleSelectSession}
        title="Analytics Sessions"
      />
    </div>
  );
}
