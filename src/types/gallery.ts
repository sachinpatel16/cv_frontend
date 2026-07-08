export interface GalleryMedia {
  id: string;
  tenant_id: string;
  filename: string;
  filepath: string;
  processed_filepath: string | null;
  media_type: 'photo' | 'video';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
}
