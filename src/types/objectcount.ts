/** Metadata for uploaded/processed object count media */
export interface ObjectCountMedia {
  id: string;
  filename: string;
  filepath: string;
  processed_filepath: string | null;
  gallery_media_id?: string | null;
  media_type: 'photo' | 'video';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  classify_gender: boolean;
  classify_vehicle: boolean;
  classes_to_track: string[] | null;
  entry_exit_report?: boolean;
  line_coords?: number[][] | null;
  total_objects_count: number | null;
  peak_objects_count: number | null;
  average_objects_count: number | null;
  video_duration_seconds: number | null;
  report_summary: ObjectCountReportSummary | null;
  progress_percentage?: number | null;
  created_at: string;
}

/** Report summary containing metrics and class breakdowns */
export interface ObjectCountReportSummary {
  total_unique_objects: number;
  peak_objects_count: number;
  average_objects_count: number;
  unique_counts: Record<string, number>;
  gender_breakdown?: {
    male: number;
    female: number;
    unknown: number;
  };
  line_crossing_analytics?: {
    line_coords: number[][];
    total_entries: number;
    total_exits: number;
    class_breakdown: Record<string, { entry: number; exit: number }>;
  };
}

/** Individual tracking result for a detected object */
export interface ObjectTrackResult {
  id: string;
  media_id: string;
  track_id: number;
  class_name: string;
  gender: 'Male' | 'Female' | null;
  first_frame: number;
  last_frame: number;
  total_frames: number;
  start_time: number;
  end_time: number;
  created_at: string;
}

/** Complete detailed payload containing results */
export interface ObjectCountMediaDetails extends ObjectCountMedia {
  results: ObjectTrackResult[];
}
