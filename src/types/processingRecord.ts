
export interface ProcessingRecord {
  id: string;
  user_id: string;
  status: string;
  text: string;
  sermon_id: string;
  error_message?: string;
  file_name: string;
  file_size: number;
  file_type: string;
}