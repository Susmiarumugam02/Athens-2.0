export interface QRSessionResponse {
  success: boolean;
  training_id: number;
  qr_code?: string;
  qr_image?: string;
  qr_token?: string;
  session_token?: string;
  qr_payload?: string;
  expires_at?: string;
  attendance_marked?: boolean;
  training_completed?: boolean;
  induction_completed?: boolean;
  attendance_verified?: boolean;
  modules_unlocked?: boolean;
  onboarding_completed?: boolean;
  access_status?: string;
  induction_status?: string;
  onboarding_status?: string;
  message?: string;
  active?: boolean;
  session_id?: number;
  valid_hours?: number;
}

export interface TrainingAttendance {
  employee_id: number;
  training_id: number;
  status: string;
  marked_at?: string;
}
