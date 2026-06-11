export type EventSeverity = 'Suspicious' | 'Breach' | 'Flagged';

export interface DetectedEvent {
  id: string;
  timestamp: string;
  description: string;
  severity: EventSeverity;
  jobId: string;
  filename: string;
  frameTime: string;
}

export const mockEvents: DetectedEvent[] = [
  {
    id: 'e1',
    timestamp: '2024-01-15 02:34:18',
    description: 'Individual loitering near exit for 4 min 22 sec',
    severity: 'Suspicious',
    jobId: 'j1',
    filename: 'parking_lot_cam1_2024-01-15.mp4',
    frameTime: '02:34:18',
  },
  {
    id: 'e2',
    timestamp: '2024-01-14 23:11:05',
    description: 'Perimeter breach detected — restricted zone B',
    severity: 'Breach',
    jobId: 'j2',
    filename: 'entrance_lobby_jan14.mov',
    frameTime: '23:11:05',
  },
  {
    id: 'e3',
    timestamp: '2024-01-14 18:47:33',
    description: 'Abandoned bag near Gate 3 for 8 min',
    severity: 'Flagged',
    jobId: 'j2',
    filename: 'entrance_lobby_jan14.mov',
    frameTime: '18:47:33',
  },
  {
    id: 'e4',
    timestamp: '2024-01-14 14:22:10',
    description: 'Crowd formation — 7 persons in restricted corridor',
    severity: 'Suspicious',
    jobId: 'j2',
    filename: 'entrance_lobby_jan14.mov',
    frameTime: '14:22:10',
  },
  {
    id: 'e5',
    timestamp: '2024-01-12 09:15:44',
    description: 'Physical altercation detected — north aisle',
    severity: 'Breach',
    jobId: 'j5',
    filename: 'retail_floor_cam3.mp4',
    frameTime: '09:15:44',
  },
  {
    id: 'e6',
    timestamp: '2024-01-12 11:38:02',
    description: 'Person loitering at cash register area for 6 min',
    severity: 'Suspicious',
    jobId: 'j5',
    filename: 'retail_floor_cam3.mp4',
    frameTime: '11:38:02',
  },
  {
    id: 'e7',
    timestamp: '2024-01-12 15:50:19',
    description: 'Unauthorized access attempt — staff-only room',
    severity: 'Breach',
    jobId: 'j5',
    filename: 'retail_floor_cam3.mp4',
    frameTime: '15:50:19',
  },
  {
    id: 'e8',
    timestamp: '2024-01-12 20:03:56',
    description: 'Crowd of 9 persons blocking emergency exit',
    severity: 'Flagged',
    jobId: 'j5',
    filename: 'retail_floor_cam3.mp4',
    frameTime: '20:03:56',
  },
];

export async function getEvents(): Promise<DetectedEvent[]> {
  return new Promise((resolve) => setTimeout(() => resolve(mockEvents), 800));
}
