/** A photo or video uploaded to the media library */
export interface MediaSource {
  id: string;
  filename: string;
  media_type: 'photo' | 'video';
  filepath: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
}

/** A single face match within a search session */
export interface SearchMatch {
  id: string;
  session_id: string;
  similarity: number;
  bbox: [number, number, number, number];
  timestamp: number | null;
  is_confirmed: boolean | null;
  media_source: MediaSource;
}

/** A search session with its results */
export interface SearchSession {
  id: string;
  selfie_path: string;
  threshold: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  results: SearchMatch[];
}
