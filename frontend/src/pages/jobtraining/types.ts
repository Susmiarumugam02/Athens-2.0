export interface JobTrainingData {
  id: number;
  key: string;
  title: string;
  description: string;
  date: string;
  location: string;
  conducted_by: string;
  status: 'planned' | 'completed' | 'cancelled';
  join_code?: string;
  qr_token?: string;
  qr_expires_at?: string;
  created_by?: number;
  created_by_username?: string;
  created_at: string;
  updated_at: string;
}

export interface JobTrainingAttendanceData {
  id: number;
  key: string;
  job_training_id: number;
  worker_id: number;
  worker_name: string;
  worker_photo: string;
  attendance_photo: string;
  status: 'present' | 'absent';
  timestamp: string;
  match_score?: number; // For photo matching confidence
}
