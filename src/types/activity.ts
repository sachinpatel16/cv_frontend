/** Uploaded media record returned by POST/GET /activity/media */
export interface ActivityMedia {
  id: string;
  filename: string;
  filepath: string;
  media_type: 'photo' | 'video';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  config?: ActivityConfig | null;
}

/** Active configuration for a media file */
export interface ActivityConfig {
  id: string;
  activity_media_id: string;
  polygon_points: [number, number][] | null;
  detect_fall: boolean;
  detect_aggression: boolean;
  detect_intrusion: boolean;
  detect_loitering: boolean;
  loitering_threshold: number;
  detect_occupancy: boolean;
  occupancy_limit: number;
  detect_sleeping: boolean;
  detect_walking: boolean;
  selected_activities: string[] | null;
  created_at: string;
}

/** Response from GET /activity/media/{id}/process */
export interface ActivityProcessStatus {
  media_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  output_filepath: string | null;
  config: ActivityConfig | null;
}

/** A single detected alert record */
export interface ActivityAlert {
  id: string;
  activity_media_id: string;
  track_id: number | null;
  activity_type:
    | 'falling'
    | 'slipping'
    | 'loitering'
    | 'occupancy_overlimit'
    | 'sleeping'
    | 'walking'
    | 'aggression'
    | 'intrusion';
  timestamp: number;
  bbox: [number, number, number, number] | null;
  snapshot_path: string | null;
  severity: 'info' | 'warning' | 'critical';
  created_at: string;
}

/** Summary from GET /activity/report/summary */
export interface ActivityAlertSummary {
  total_alerts: number;
  by_type: Record<string, number>;
  by_severity: Record<string, number>;
}

/** Payload for POST /activity/process */
export interface ActivityProcessPayload {
  gallery_media_id?: string;
  interval: number;
  detect_fall: boolean;
  detect_aggression: boolean;
  detect_intrusion: boolean;
  detect_loitering: boolean;
  loitering_threshold: number;
  detect_occupancy: boolean;
  occupancy_limit: number;
  detect_sleeping: boolean;
  detect_walking: boolean;
  selected_activities: string[] | null;
  polygon_points: [number, number][] | null;
}

/**
 * Unified history row — merges smoking sessions and activity media into one
 * displayable list for the History tab. Tagged by `flavor` for dispatch.
 */
export interface UnifiedHistoryItem {
  id: string;
  /** Which backend this row came from */
  flavor: 'smoking' | 'activity';
  /** Actual filename for both flavors (file.name captured at upload time for smoking) */
  displayName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  // activity-only
  media_type?: 'photo' | 'video';
  config?: ActivityConfig | null;
  // smoking-only
  overall_status?:
    | 'smoking_confirmed'
    | 'smoking_likely'
    | 'holding'
    | 'clean'
    | null;
  total_events?: number;
  smoking_interval?: number;
}
