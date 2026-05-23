export interface ToolboxTalkData {
  id: number;
  key: string;
  title: string;
  description: string;
  date: string;
  location: string;
  conducted_by: string;
  status: 'planned' | 'completed' | 'cancelled';
  created_by?: number;
  created_by_username?: string;
  created_at: string;
  updated_at: string;
}

export interface ToolboxTalkAttendanceData {
  id: number;
  key: string;
  toolbox_talk_id: number;
  worker_id: number;
  worker_name: string;
  worker_photo: string;
  attendance_photo: string;
  status: 'present' | 'absent';
  timestamp: string;
  match_score?: number; // For photo matching confidence
}