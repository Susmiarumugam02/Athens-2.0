export interface Employee {
  id: number
  employee_id: string
  first_name: string
  last_name: string
  full_name: string
  email: string
  phone: string
  date_of_birth?: string
  gender?: string
  department: number
  department_name: string
  designation: number
  designation_title: string
  employment_type: string
  work_mode: string
  date_of_joining: string
  date_of_leaving?: string
  status: string
  base_salary: number
  address_line1?: string
  address_line2?: string
  city?: string
  state?: string
  pincode?: string
  country?: string
  aadhar_number?: string
  pan_number?: string
  pf_number?: string
  uan_number?: string
  esi_number?: string
  bank_name?: string
  bank_account_number?: string
  bank_ifsc_code?: string
  bank_branch?: string
  emergency_contact_name?: string
  emergency_contact_relationship?: string
  emergency_contact_phone?: string
  emergency_contact_address?: string
  skills: string[]
  performance_score: number
  engagement_score: number
  retention_risk: string
  profile_picture?: string
  face_photo?: string
  mobile_app_enabled: boolean
  created_at: string
  updated_at: string
}

export interface Department {
  id: number
  name: string
  code: string
  description?: string
  is_active: boolean
}

export interface Designation {
  id: number
  title: string
  code: string
  department: number
  level: string
  min_salary: number
  max_salary: number
  is_active: boolean
}

export interface EmployeeFormData {
  first_name: string
  last_name: string
  email: string
  phone: string
  date_of_birth?: string
  gender?: string
  department: number
  designation: number
  employment_type: string
  work_mode: string
  date_of_joining: string
  base_salary: number
  address_line1?: string
  address_line2?: string
  city?: string
  state?: string
  pincode?: string
  country?: string
  aadhar_number?: string
  pan_number?: string
  pf_number?: string
  uan_number?: string
  esi_number?: string
  bank_name?: string
  bank_account_number?: string
  bank_ifsc_code?: string
  bank_branch?: string
  emergency_contact_name?: string
  emergency_contact_relationship?: string
  emergency_contact_phone?: string
  emergency_contact_address?: string
  skills: string[]
  profile_picture?: File
  face_photo?: File
  capture_face_photo?: boolean
}

export interface EmployeeFilters {
  search?: string
  department?: number
  status?: string
}