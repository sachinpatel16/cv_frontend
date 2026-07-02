/** A single detected smoking event within a session */
export interface SmokingEvent {
  id: string;
  session_id: string;
  timestamp: number;
  person_id: number;
  /** Detection classification for this moment */
  status: 'smoking_confirmed' | 'smoking_likely' | 'holding' | 'clean';
  /** Composite confidence score 0–100 */
  score: number;
  cig_detected: boolean;
  tip_detected: boolean;
  smoke_detected: boolean;
  tip_ratio: number;
  smoke_area: number;
  person_box: [number, number, number, number] | null;
  cig_box: [number, number, number, number] | null;
  /** Relative path to extracted frame, e.g. storage/smoking_frames/{session_id}/frame_0006.jpg */
  frame_path: string | null;
}

/** Full session response — returned by /upload, /status, and /events endpoints */
export interface SmokingSession {
  id: string;
  /** Mirrors id — convenience alias */
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  /** Highest-level classification across all events — only set when completed */
  overall_status:
    | 'smoking_confirmed'
    | 'smoking_likely'
    | 'holding'
    | 'clean'
    | null;
  /** Relative path to annotated output video */
  video_out_path: string | null;
  /** Frame sampling interval in seconds */
  interval: number;
  created_at: string;
  events: SmokingEvent[];
}

/** Slim user payload embedded inside session history rows */
export interface SmokingSessionUser {
  id: string;
  email: string;
  role: string;
}

/** Summary row returned by GET /smokingdetect/sessions/history */
export interface SmokingSessionHistoryItem {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  overall_status:
    | 'smoking_confirmed'
    | 'smoking_likely'
    | 'holding'
    | 'clean'
    | null;
  interval: number;
  created_at: string;
  total_events: number;
  user: SmokingSessionUser | null;
}
