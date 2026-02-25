export interface SupportUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role?: string;
  is_admin?: boolean;
}

export interface SupportAdmin {
  id: number;
  first_name: string;
  last_name: string;
  role: string;
}

export type SupportStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | 'pending_approval';
export type SupportPriority = 'low' | 'medium' | 'high' | 'urgent';
export type MessageType = 'text' | 'file' | 'system';

export interface SupportChat {
  id: number;
  client: SupportUser;
  admin?: SupportAdmin;
  status: SupportStatus;
  priority: SupportPriority;
  subject: string;
  last_message?: {
    text: string;
    created_at: string;
  };
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface SupportMessage {
  id: number;
  text: string;
  sender: SupportUser;
  message_type: MessageType;
  file?: string;
  is_read: boolean;
  created_at: string;
  is_mine: boolean;
}

export interface CreateSupportChatRequest {
  subject: string;
  message: string;
  priority?: string;
}

export interface SupportRequest {
  id: number;
  subject: string;
  message: string;
  status: SupportStatus;
  created_at: string;
  user: {
    id: number;
    username: string;
    email: string;
  };
}

export interface ApprovalRequest {
  id: number;
  type: 'escalation' | 'refund' | 'dispute_resolution' | 'account_action' | 'policy_exception';
  requested_by: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  };
  requested_at: string;
  reason: string;
  proposed_action: string;
  estimated_impact: 'low' | 'medium' | 'high' | 'critical';
  requires_director_approval: boolean;
}

export interface ClaimResolution {
  text?: string;
  user_satisfaction_rating?: number;
  resolution_time_hours?: number;
  user_feedback?: string;
}

export interface Claim {
  id: number;
  subject: string;
  title?: string;
  message: string;
  description?: string;
  status: SupportStatus;
  created_at: string;
  updated_at?: string;
  completed_at?: string;
  user: {
    id: number;
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
    avatar?: string;
  };
  category?: 'technical' | 'billing' | 'order' | 'account' | 'other';
  priority?: SupportPriority;
  taken_at?: string;
  attachments?: string[];
  messages_count?: number;
  assigned_admin?: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar?: string;
  };
  approval_request?: ApprovalRequest;
  waiting_time_hours?: number;
  escalation_level?: number;
  
  order_id?: number; 
  resolution?: ClaimResolution;
}
