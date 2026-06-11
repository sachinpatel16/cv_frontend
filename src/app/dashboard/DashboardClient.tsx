'use client';

import Link from 'next/link';
import {
  BarChart2,
  Activity,
  Search,
  ArrowRight,
  Video,
  AlertTriangle,
  Clock,
  CheckCircle,
} from 'lucide-react';
import type { DashboardStats } from '@/lib/mock/stats';
import type { Job } from '@/lib/mock/jobs';
import type { DetectedEvent } from '@/lib/mock/events';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SERVICES_REGISTRY } from '@/lib/services';

const SEVERITY_CLS: Record<string, string> = {
  Breach: 'text-red-400 bg-red-400/10',
  Suspicious: 'text-[#F59E0B] bg-[#F59E0B]/10',
  Flagged: 'text-[#5A7A9A] bg-[#5A7A9A]/10',
};

interface Props {
  stats: DashboardStats;
  recentJobs: Job[];
  recentEvents: DetectedEvent[];
}

export function DashboardClient({ stats, recentJobs, recentEvents }: Props) {
  const metricCards = [
    {
      label: 'Videos Analysed',
      value: stats.videosAnalysed,
      icon: Video,
      color: 'text-[#60A5FA]',
    },
    {
      label: 'Events Flagged',
      value: stats.eventsFlagged,
      icon: AlertTriangle,
      color: 'text-[#F59E0B]',
    },
    {
      label: 'Hours Processed',
      value: `${stats.hoursProcessed}h`,
      icon: Clock,
      color: 'text-emerald-400',
    },
    {
      label: 'Success Rate',
      value: `${stats.successRate}%`,
      icon: CheckCircle,
      color: 'text-emerald-400',
    },
  ];

  return (
    <div className="max-w-7xl space-y-6">
      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metricCards.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-5"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs text-[#5A7A9A]">{label}</p>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <p className="text-2xl font-bold text-[#E8EDF5]">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent jobs */}
        <div className="rounded-xl border border-[#1E3048] bg-[#0D1628] lg:col-span-2">
          <div className="flex items-center justify-between border-b border-[#1E3048] px-5 py-4">
            <h2 className="text-sm font-semibold text-[#E8EDF5]">
              Recent Jobs
            </h2>
            <Link
              href="/reports"
              className="flex items-center gap-1 text-xs text-[#1565C0] hover:underline"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-[#1E3048]">
            {recentJobs.map((job) => (
              <div key={job.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-[#E8EDF5]">
                    {job.filename}
                  </p>
                  <p className="mt-0.5 text-xs text-[#5A7A9A]">
                    {job.serviceLabel} · {job.date}
                  </p>
                </div>
                <StatusBadge
                  status={
                    job.status === 'done'
                      ? 'completed'
                      : job.status === 'processing'
                        ? 'processing'
                        : 'failed'
                  }
                />
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="rounded-xl border border-[#1E3048] bg-[#0D1628]">
          <div className="border-b border-[#1E3048] px-5 py-4">
            <h2 className="text-sm font-semibold text-[#E8EDF5]">
              Quick Start
            </h2>
          </div>
          <div className="space-y-1 p-3">
            {SERVICES_REGISTRY.filter((s) => !s.comingSoon).map((s) => (
              <Link
                key={s.id}
                href={s.href}
                className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-[#5A7A9A] transition-colors hover:bg-[#1E3048] hover:text-[#E8EDF5]"
              >
                <s.icon className="h-4 w-4 shrink-0 text-[#1565C0]" />
                {s.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent events */}
      <div className="rounded-xl border border-[#1E3048] bg-[#0D1628]">
        <div className="flex items-center justify-between border-b border-[#1E3048] px-5 py-4">
          <h2 className="text-sm font-semibold text-[#E8EDF5]">
            Recent Events
          </h2>
          <Link
            href="/reports"
            className="flex items-center gap-1 text-xs text-[#1565C0] hover:underline"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="divide-y divide-[#1E3048]">
          {recentEvents.map((evt) => (
            <div key={evt.id} className="flex items-start gap-4 px-5 py-3">
              <span
                className={`mt-0.5 inline-flex shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${SEVERITY_CLS[evt.severity]}`}
              >
                {evt.severity}
              </span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-sm text-[#E8EDF5]">
                  {evt.description}
                </p>
                <p className="mt-0.5 text-xs text-[#5A7A9A]">
                  {evt.timestamp} · {evt.filename}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
