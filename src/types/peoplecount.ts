/** Metadata for uploaded/processed people count media */
export interface PeopleCountMedia {
  id: string;
  filename: string;
  filepath: string;
  processed_filepath: string | null;
  media_type: 'photo' | 'video';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_people_count: number | null;
  peak_people_count: number | null;
  average_people_count: number | null;
  video_duration_seconds: number | null;
  created_at: string;
}

/** Individual tracking result for a detected person */
export interface TrackResult {
  id: string;
  media_id: string;
  track_id: number;
  class_name: string;
  first_frame: number;
  last_frame: number;
  total_frames: number;
  start_time: number;
  end_time: number;
  created_at: string;
  name?: string;
}

/** Complete detailed payload containing results */
export interface PeopleCountMediaDetails extends PeopleCountMedia {
  results: TrackResult[];
}
