import { getStats } from '@/lib/mock/stats';
import { getJobs } from '@/lib/mock/jobs';
import { getEvents } from '@/lib/mock/events';
import { DashboardClient } from './DashboardClient';

export default async function DashboardPage() {
  const [stats, jobs, events] = await Promise.all([
    getStats(),
    getJobs(),
    getEvents(),
  ]);
  return (
    <DashboardClient
      stats={stats}
      recentJobs={jobs.slice(0, 4)}
      recentEvents={events.slice(0, 4)}
    />
  );
}
