export type JobStatus = 'done' | 'processing' | 'failed';
export type JobService =
  | 'object-counting'
  | 'activity-detection'
  | 'person-search';

export interface Job {
  id: string;
  filename: string;
  service: JobService;
  serviceLabel: string;
  date: string;
  status: JobStatus;
  duration: string;
  size: string;
}

export const mockJobs: Job[] = [
  {
    id: 'j1',
    filename: 'parking_lot_cam1_2024-01-15.mp4',
    service: 'object-counting',
    serviceLabel: 'Object Counting',
    date: '2024-01-15',
    status: 'done',
    duration: '4h 22m',
    size: '2.1 GB',
  },
  {
    id: 'j2',
    filename: 'entrance_lobby_jan14.mov',
    service: 'activity-detection',
    serviceLabel: 'Activity Detection',
    date: '2024-01-14',
    status: 'done',
    duration: '8h 07m',
    size: '3.8 GB',
  },
  {
    id: 'j3',
    filename: 'warehouse_zone_b.mp4',
    service: 'person-search',
    serviceLabel: 'Person Search',
    date: '2024-01-14',
    status: 'failed',
    duration: '—',
    size: '1.2 GB',
  },
  {
    id: 'j4',
    filename: 'street_cam_4K_jan13.avi',
    service: 'object-counting',
    serviceLabel: 'Object Counting',
    date: '2024-01-13',
    status: 'processing',
    duration: 'In progress',
    size: '5.6 GB',
  },
  {
    id: 'j5',
    filename: 'retail_floor_cam3.mp4',
    service: 'activity-detection',
    serviceLabel: 'Activity Detection',
    date: '2024-01-12',
    status: 'done',
    duration: '6h 45m',
    size: '2.9 GB',
  },
];

export async function getJobs(): Promise<Job[]> {
  return new Promise((resolve) => setTimeout(() => resolve(mockJobs), 800));
}
