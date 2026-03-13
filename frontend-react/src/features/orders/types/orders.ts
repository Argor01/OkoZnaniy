import { OrderSubject, OrderTopic, OrderWorkType, OrderComplexity } from '@/features/common/types/catalog';

export type { OrderSubject, OrderTopic, OrderWorkType, OrderComplexity };

export interface OrderFile {
  id: number;
  file_url: string | null;
  view_url?: string | null;
  download_url?: string | null;
  filename: string;
  file_type: string;
  file_type_display: string;
  uploaded_by: { id: number; username: string };
  description?: string | null;
  created_at: string;
  file_size?: string;
}

export interface OrderClient {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  avatar?: string;
  email?: string;
  phone?: string;
}

export interface OrderExpert {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  avatar?: string;
  bio?: string;
  phone?: string;
  email?: string;
}

// OrderSubject, OrderTopic, OrderWorkType, OrderComplexity are imported from ./catalog

export interface Bid {
  id: number;
  order: number;
  expert: OrderExpert;
  amount: string;
  prepayment_percent: number;
  comment?: string;
  created_at: string;
  status: 'active' | 'rejected' | 'cancelled';
  expert_rating: number;
}

export interface Order {
  id: number;
  title: string;
  description: string;
  budget: string;
  deadline: string;
  status: string;
  is_overdue?: boolean;
  is_frozen?: boolean;
  frozen_reason?: string;
  frozen_at?: string;
  client?: OrderClient;
  client_id?: number;
  client_name?: string;
  subject: OrderSubject;
  topic: OrderTopic;
  work_type: OrderWorkType;
  complexity: OrderComplexity;
  expert?: OrderExpert;
  created_at: string;
  updated_at: string;
  files?: OrderFile[];
  bids?: Bid[];
  expert_rating?: {
    id: number;
    rating: number;
    comment?: string;
    created_at: string;
  };
  dispute?: {
    id: number;
    resolved: boolean;
  };
}

export interface CreateOrderRequest {
  title: string;
  description: string;
  deadline: string;
  subject_id: number;
  custom_topic: string;
  work_type_id: number;
  budget: number;
  additional_requirements?: any;
}

export interface OrderComment {
  id: number;
  text: string;
  created_at: string;
  author: { id: number; username: string };
}

type NamedEntity = { name: string };

export interface AdminOrder {
  id: number;
  title: string;
  description: string;
  subject: string | NamedEntity | null;
  work_type: string | NamedEntity | null;
  status: string;
  priority: string;
  budget: number;
  deadline: string;
  created_at: string;
  updated_at: string;
  client: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  expert?: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  files_count: number;
  messages_count: number;
  is_urgent: boolean;
  completion_percentage: number;
  price?: number;
}

export interface ProblemOrder {
  id: number;
  title: string;
  description: string;
  subject: string | NamedEntity | null;
  work_type: string | NamedEntity | null;
  status: string;
  problem_type: string;
  problem_severity: string;
  problem_description: string;
  budget: number;
  deadline: string;
  created_at: string;
  problem_detected_at: string;
  days_overdue: number;
  client: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
  };
  expert?: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
  };
  files_count: number;
  messages_count: number;
  last_activity: string;
  completion_percentage: number;
  admin_notes?: string;
  resolution_attempts: number;
}
