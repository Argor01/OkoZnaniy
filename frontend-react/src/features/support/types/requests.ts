export type SupportConversationType = 'support_request' | 'claim' | 'arbitration_case';
export type SupportConversationStatus =
  | 'open'
  | 'in_progress'
  | 'completed'
  | 'new'
  | 'pending_approval'
  | 'submitted'
  | 'under_review'
  | 'awaiting_response'
  | 'in_arbitration'
  | 'decision_made'
  | 'closed'
  | 'rejected';
export type SupportConversationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface SupportConversation {
  id: number;
  ticket_number: string;
  type: SupportConversationType;
  subject: string;
  description: string;
  status: SupportConversationStatus;
  priority: SupportConversationPriority;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  order?: {
    id: number;
    title?: string;
  } | null;
}

export interface SupportFeedItem {
  kind: 'message' | 'activity';
  id: string;
  created_at: string;
  text?: string;
  is_admin?: boolean;
  source?: 'ticket' | 'chat';
  activity_type?: string;
  meta?: Record<string, unknown>;
  sender?: {
    id: number;
    first_name: string;
    last_name: string;
    role?: string;
  } | null;
  actor?: {
    id: number | null;
    first_name: string;
    last_name: string;
  } | null;
}

export interface SupportActivityResponse {
  messages: SupportFeedItem[];
  activities: SupportFeedItem[];
  feed: SupportFeedItem[];
}

export interface CreateSupportRequestPayload {
  subject: string;
  description: string;
  priority?: SupportConversationPriority;
}

export interface CreateClaimPayload {
  claim_type?: string;
  subject: string;
  description: string;
  reason?: string;
  refund_type?: 'full' | 'partial' | 'none';
  refund_percentage?: number;
  order_id?: number;
}
