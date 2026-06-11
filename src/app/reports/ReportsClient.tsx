'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import type { Job } from '@/lib/mock/jobs';
import type { DetectedEvent } from '@/lib/mock/events';
import { StatusBadge } from '@/components/ui/StatusBadge';

const SEVERITY_CLS: Record<string, string> = {
  Breach: 'text-red-400 bg-red-400/10',
  Suspicious: 'text-[#F59E0B] bg-[#F59E0B]/10',
  Flagged: 'text-[#5A7A9A] bg-[#5A7A9A]/10',
};

type Tab = 'jobs' | 'events';

interface Props {
  jobs: Job[];
  events: DetectedEvent[];
}

export function ReportsClient({ jobs, events }: Props) {
  const [tab, setTab] = useState<Tab>('jobs');
  const [search, setSearch] = useState('');

  const filteredJobs = jobs.filter(
    (j) =>
      j.filename.toLowerCase().includes(search.toLowerCase()) ||
      j.serviceLabel.toLowerCase().includes(search.toLowerCase()),
  );
  const filteredEvents = events.filter(
    (e) =>
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      e.filename.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#E8EDF5]">Reports</h1>
        <p className="mt-1 text-sm text-[#5A7A9A]">
          Review all analysis jobs and detected events.
        </p>
      </div>

      {/* Tabs + search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex gap-1 rounded-lg border border-[#1E3048] bg-[#0D1628] p-1">
          {(['jobs', 'events'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                tab === t
                  ? 'bg-[#1565C0] text-white'
                  : 'text-[#5A7A9A] hover:text-[#E8EDF5]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#5A7A9A]" />
          <input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-md border border-[#1E3048] bg-[#0D1628] pr-3 pl-9 text-sm text-[#E8EDF5] placeholder-[#5A7A9A] focus:border-[#1565C0] focus:ring-2 focus:ring-[#1565C0]/30 focus:outline-none"
          />
        </div>
      </div>

      {tab === 'jobs' && (
        <div className="overflow-hidden rounded-xl border border-[#1E3048] bg-[#0D1628]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1E3048]">
                {['File', 'Service', 'Date', 'Duration', 'Size', 'Status'].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-xs font-semibold text-[#5A7A9A]"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E3048]">
              {filteredJobs.map((job) => (
                <tr
                  key={job.id}
                  className="transition-colors hover:bg-[#1E3048]/30"
                >
                  <td className="max-w-[200px] truncate px-5 py-3 text-[#E8EDF5]">
                    {job.filename}
                  </td>
                  <td className="px-5 py-3 text-[#5A7A9A]">
                    {job.serviceLabel}
                  </td>
                  <td className="px-5 py-3 text-[#5A7A9A]">{job.date}</td>
                  <td className="px-5 py-3 text-[#5A7A9A]">{job.duration}</td>
                  <td className="px-5 py-3 text-[#5A7A9A]">{job.size}</td>
                  <td className="px-5 py-3">
                    <StatusBadge
                      status={
                        job.status === 'done'
                          ? 'completed'
                          : job.status === 'processing'
                            ? 'processing'
                            : 'failed'
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredJobs.length === 0 && (
            <div className="flex h-24 items-center justify-center">
              <p className="text-sm text-[#5A7A9A]">
                No jobs match your search
              </p>
            </div>
          )}
        </div>
      )}

      {tab === 'events' && (
        <div className="overflow-hidden rounded-xl border border-[#1E3048] bg-[#0D1628]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1E3048]">
                {['Timestamp', 'Severity', 'Description', 'File'].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left text-xs font-semibold text-[#5A7A9A]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E3048]">
              {filteredEvents.map((evt) => (
                <tr
                  key={evt.id}
                  className="transition-colors hover:bg-[#1E3048]/30"
                >
                  <td className="px-5 py-3 whitespace-nowrap text-[#5A7A9A]">
                    {evt.timestamp}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${SEVERITY_CLS[evt.severity]}`}
                    >
                      {evt.severity}
                    </span>
                  </td>
                  <td className="max-w-[280px] px-5 py-3 text-[#E8EDF5]">
                    {evt.description}
                  </td>
                  <td className="max-w-[160px] truncate px-5 py-3 text-[#5A7A9A]">
                    {evt.filename}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredEvents.length === 0 && (
            <div className="flex h-24 items-center justify-center">
              <p className="text-sm text-[#5A7A9A]">
                No events match your search
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
