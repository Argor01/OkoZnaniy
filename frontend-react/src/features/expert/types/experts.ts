import { Subject } from '@/features/common/types/catalog';

export interface ExpertStatistics {
  id: number;
  expert: number;
  total_orders: number;
  completed_orders: number;
  average_rating: number;
  success_rate: number;
  total_earnings: number | null;
  response_time_avg: number;
  last_updated: string;
  points?: number;
}

export interface Education {
  id?: number;
  university: string;
  start_year: number;
  end_year?: number | null;
  degree?: string;
}

export interface ExpertApplication {
  id: number;
  expert: number;
  full_name: string;
  work_experience_years: number;
  phone?: string;
  biography?: string;
  portfolio_url?: string;
  specializations: Array<{ id: number; name: string }>;
  educations: Education[];
  status: 'pending' | 'approved' | 'rejected' | 'needs_revision' | 'deactivated';
  status_display: string;
  rejection_reason?: string;
  comment?: string;
  reviewed_by?: number;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateExpertApplicationRequest {
  full_name: string;
  work_experience_years: number;
  phone?: string;
  biography?: string;
  portfolio_url?: string;
  specialization_ids: number[];
  educations: Education[];
  email?: string;
}

export interface Specialization {
  id: number;
  expert: number;
  subject: Pick<Subject, 'id' | 'name' | 'slug'>;
  subject_id?: number;
  experience_years: number;
  hourly_rate: number;
  description?: string;
  skills?: string;
  is_verified: boolean;
  custom_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateSpecializationRequest {
  subject_id?: number;
  custom_name?: string;
  experience_years: number;
  hourly_rate: number;
  description?: string;
  skills?: string;
}

export interface ExpertReview {
  id: number;
  expert?: number;
  client: {
    id: number;
    username?: string;
    first_name: string;
    last_name: string;
    avatar?: string;
  };
  order: {
    id: number;
    title: string;
  };
  rating: number;
  comment?: string;
  text?: string;
  created_at: string;
  reply_text?: string;
  reply_at?: string | null;
  is_appealed?: boolean;
  appeal_reason?: string;
  appeal_at?: string | null;
  appeal_resolved?: boolean;
  appeal_resolution?: string;
}

export interface CreateExpertRatingRequest {
  order: number;
  rating: number; 
  comment?: string;
}
