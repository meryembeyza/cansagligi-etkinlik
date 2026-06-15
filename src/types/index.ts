export type UserRole = 
  | 'unit_head' 
  | 'region_manager' 
  | 'general_admin' 
  | 'design_team' 
  | 'resource_manager' 
  | 'rep_head' 
  | 'rep_region_manager' 
  | 'rep_coordinator' 
  | 'representative' 
  | 'bursary_student';

export interface UserData {
  id?: string;
  role: UserRole;
  is_approved: boolean;
  region?: string;
  university?: string;
  unit_name?: string;
  full_name?: string;
  email?: string;
  phone_number?: string;
  created_at?: string;
}

export interface AppEvent {
  id: string;
  event_name: string;
  event_type: string;
  description?: string;
  event_date: string;
  location?: string;
  status: string;
  expected_participants?: number;
  created_at?: string;
  created_by?: string;
}
