import { getJobs } from '@/lib/mock/jobs';
import { getEvents } from '@/lib/mock/events';
import { ReportsClient } from './ReportsClient';

export default async function ReportsPage() {
  const [jobs, events] = await Promise.all([getJobs(), getEvents()]);
  return <ReportsClient jobs={jobs} events={events} />;
}
