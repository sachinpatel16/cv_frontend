/** A raw uploaded video file (not yet processed) */
export interface UploadedVideo {
  id: string;
  tenant_id: string;
  original_name: string;
  saved_path: string;
  created_at: string;
}

/** A single occupancy sample in the timeline */
export interface OccupancyPoint {
  time_sec: number;
  occupancy: number;
}

/** A full analytics session (pending → processing → completed/failed) */
export interface AnalyticsSession {
  id: string;
  tenant_id: string;
  video_name: string;
  video_path: string;
  output_video_path: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  line_start: [number, number] | null;
  line_end: [number, number] | null;
  similarity_threshold: number;
  confidence_threshold: number;
  unique_person_count: number | null;
  total_person_count: number | null;
  first_time_visitor_count: number | null;
  peak_occupancy: number | null;
  average_occupancy: number | null;
  entry_count: number | null;
  exit_count: number | null;
  occupancy_timeline: OccupancyPoint[] | null;
  created_at: string;
  completed_at: string | null;
}

/** A detected person within a session */
export interface DetectedPerson {
  identity_id: string;
  type: 'visitor' | 'employee';
  name: string;
  photo_path: string | null;
  first_seen: number;
  last_seen: number;
  dwell_time: number;
}

/** Cross-video aggregated visitor analytics */
export interface VisitorAnalytics {
  total_unique_people: number;
  repeat_visitors_count: number;
  repeat_visitor_rate: number;
  new_visitors_this_month: number;
}

/** Payload sent to POST /peopleanalytics/process */
export interface ProcessSessionPayload {
  videos: {
    gallery_media_id?: string;
    video_path?: string;
    line_start?: [number, number];
    line_end?: [number, number];
    similarity_threshold?: number;
    confidence_threshold?: number;
  }[];
  line_start?: [number, number];
  line_end?: [number, number];
  similarity_threshold?: number;
  confidence_threshold?: number;
}
