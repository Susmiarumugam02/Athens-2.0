export interface WorkerData {
  key: string;
  id: number;
  name: string;
  worker_id: string;
  designation: string;
  department: string;
  phone_number: string;
  email: string;
  address: string;
  joining_date: string;
  status: string;
  
  // Additional fields from WorkerCreation form
  photo?: string;
  surname?: string;
  father_or_spouse_name?: string;
  date_of_birth?: string;
  gender?: string;
  nationality?: string;
  education_level?: string;
  education_other?: string;
  category?: string;
  employment_type?: string;
  employment_status?: string;
  uan?: string;
  pan?: string;
  aadhaar?: string;
  esic_ip?: string;
  lwf?: string;
  present_address?: string;
  permanent_address?: string;
  mark_of_identification?: string;
  
  // Fields for date handling
  date_of_joining?: string; // Alternative name for joining_date used in some components
}
