export interface DashboardStats {
  videosAnalysed: number;
  eventsFlagged: number;
  hoursProcessed: number;
  successRate: number;
}

export interface ChartDataPoint {
  hour: string;
  count: number;
  isAlert: boolean;
}

export const mockStats: DashboardStats = {
  videosAnalysed: 47,
  eventsFlagged: 12,
  hoursProcessed: 283,
  successRate: 94,
};

export const mockObjectCountData: ChartDataPoint[] = [
  { hour: '00:00', count: 8, isAlert: false },
  { hour: '02:00', count: 3, isAlert: false },
  { hour: '04:00', count: 2, isAlert: false },
  { hour: '06:00', count: 12, isAlert: false },
  { hour: '08:00', count: 45, isAlert: false },
  { hour: '10:00', count: 78, isAlert: false },
  { hour: '12:00', count: 92, isAlert: false },
  { hour: '14:00', count: 87, isAlert: false },
  { hour: '16:00', count: 115, isAlert: true },
  { hour: '18:00', count: 134, isAlert: true },
  { hour: '20:00', count: 58, isAlert: false },
  { hour: '22:00', count: 21, isAlert: false },
];

export const mockObjectCountingResults = {
  totalCounted: 655,
  peakFrame: 134,
  entries: 382,
  exits: 273,
};

export const mockActivityResults = {
  totalEvents: 8,
  breaches: 3,
  suspicious: 3,
  flagged: 2,
};

export async function getStats(): Promise<DashboardStats> {
  return new Promise((resolve) => setTimeout(() => resolve(mockStats), 800));
}

export async function getChartData(): Promise<ChartDataPoint[]> {
  return new Promise((resolve) =>
    setTimeout(() => resolve(mockObjectCountData), 800),
  );
}
