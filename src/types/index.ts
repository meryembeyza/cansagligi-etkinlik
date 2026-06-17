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
  student_id?: string;
  department?: string;
  grade?: string;
  club_duty?: string;
  nsosyal_account?: string;
  kvkk_approved?: boolean;
  created_at?: string;
}

export type EventStatus = 'Taslak' | 'Onay Bekliyor' | 'Onaylandı' | 'Reddedildi' | 'Yeniden Onay Bekliyor' | 'Revizyon Bekleniyor' | 'Ertelendi' | 'İptal Edildi' | 'Gerçekleşti';

export interface AppEvent {
  id: string;
  created_by?: string;
  unit_name: string;
  university: string;
  region: string;
  event_name: string;
  event_type: string;
  target_audience?: string[];
  event_purpose?: string;
  program_flow?: { time: string; desc: string }[] | Record<string, unknown>[];
  location?: string;
  event_date: string;
  expected_participants?: number;
  budget_request?: string;
  prereg_required?: boolean;
  admin_notes?: string;
  status: EventStatus | string;
  created_at?: string;
  updated_at?: string;
  // Relationships
  poster_requests?: PosterRequest[];
  post_event_reports?: PostEventReport[];
  event_speakers?: EventSpeaker[];
  resource_reservations?: ResourceReservation[];
}

export interface EventRevision {
  id: string;
  event_id: string;
  revision_data: AppEvent;
  requested_by: string;
  revision_notes?: string;
  created_at: string;
}

export interface Speaker {
  id: string;
  full_name: string;
  title: string;
  cv_file_url?: string;
  linkedin_url?: string;
  about?: string;
  social_links?: string[];
  created_at?: string;
}

export interface EventSpeaker {
  id: string;
  event_id: string;
  speaker_id: string;
  select_reason?: string;
  contact_method?: string;
  status: string;
  is_cancelled: boolean;
  cancel_reason?: string;
  created_at?: string;
  // Relationships
  speakers?: Speaker;
}

export interface Resource {
  id: string;
  name: string;
  type: 'Maket' | 'Projeksiyon' | 'Araç' | 'Eşantiyon' | 'Serbest';
  manager_id?: string;
  total_count: number;
  is_consumable: boolean;
  is_available: boolean;
  created_at?: string;
}

export interface ResourceReservation {
  id: string;
  resource_id: string;
  event_id: string;
  request_date: string;
  end_date?: string;
  status: 'Talep Edildi' | 'Onaylandı' | 'Reddedildi';
  alternative_date?: string;
  notes?: string;
  created_at?: string;
  // Relationships
  resources?: Resource;
  events?: AppEvent;
}

export interface PosterRequest {
  id: string;
  event_id: string;
  status: 'Bekliyor' | 'Hazırlanıyor' | 'Tamamlandı' | 'Revizyon Gerekli';
  required_logos?: string;
  special_instructions?: string;
  designer_notes?: string;
  file_url?: string;
  created_at?: string;
  updated_at?: string;
  // Relationships
  events?: AppEvent;
}

export interface PostEventReport {
  id: string;
  event_id: string;
  actual_participants: number;
  drive_link: string;
  social_link?: string;
  feedback: string;
  resource_issues?: string;
  created_at?: string;
  // Relationships
  events?: AppEvent;
}

export interface Notification {
  id: string;
  user_id: string;
  event_id?: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at?: string;
}

export interface RepresentativeProfile {
  user_id: string;
  status: 'Aktif' | 'Pasif' | 'Mezun';
  start_date: string;
  end_date?: string;
  last_contact_date?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  // Relationships
  users?: UserData;
}

export interface RepCommunication {
  id: string;
  representative_id: string;
  sender_id: string;
  channel: string;
  message: string;
  created_at?: string;
}

export interface RepresentativeRecommendation {
  id: string;
  recommended_by: string;
  candidate_name: string;
  candidate_phone: string;
  candidate_email?: string;
  candidate_university?: string;
  candidate_department?: string;
  candidate_grade?: string;
  reason?: string;
  created_at?: string;
}

export interface InventoryRequest {
  id: string;
  representative_id: string;
  talep_tarihi: string;
  gerekli_tarih: string;
  status: string;
  bez_canta: number;
  rozet: number;
  etiket: number;
  defter: number;
  kalem: number;
  notes?: string;
  created_at?: string;
  // Relationships
  users?: UserData;
}

// Bursary interfaces (based on app usage)
export interface Candidate {
  id: string;
  full_name: string;
  university?: string;
  department?: string;
  grade?: string;
  status: string;
  rsvp_status?: 'attending' | 'not_attending' | 'pending';
  bursary_events?: BursaryEvent[];
  [key: string]: unknown;
}

export interface BursaryEvent {
  id: string;
  display_title: string;
  event_date: string;
  city: string;
  venue?: string;
  participant_type: string;
  requires_registration: boolean;
  registration_deadline?: string;
  description?: string;
  poster_url?: string;
  status?: string;
  // Relationships
  event_speakers?: EventSpeaker[];
}
