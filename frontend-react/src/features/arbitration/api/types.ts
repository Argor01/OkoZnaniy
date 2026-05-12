


export interface Attachment {
  id: number;
  name: string;
  url: string;
  size: number;
  file_type: string;
  uploaded_at: string;
}


export interface Message {
  id: number;
  sender: {
    id: number;
    username: string;
    role: string;
  };
  text: string;
  created_at: string;
  attachments?: Attachment[];
}


export interface Decision {
  id: number;
  claim_id: number;
  decision_type: 'full_refund' | 'partial_refund' | 'no_refund' | 'revision' | 'other';
  refund_amount?: number;
  reasoning: string;
  client_comment?: string;
  expert_comment?: string;
  created_at: string;
  arbitrator: {
    id: number;
    username: string;
  };
  requires_approval: boolean;
  approval_status?: 'pending' | 'approved' | 'rejected';
  approval_comment?: string;
}


export interface Claim {
  id: number;
  type: 'refund' | 'dispute' | 'conflict';
  status: 'new' | 'in_progress' | 'completed' | 'pending_approval';
  priority: 'low' | 'medium' | 'high';
  order: {
    id: number;
    title: string;
    description: string;
    amount: number;
    created_at: string;
    deadline: string;
    status: string;
  };
  client: {
    id: number;
    username: string;
    email: string;
    phone?: string;
  };
  expert: {
    id: number;
    username: string;
    email: string;
    rating?: number;
  };
  created_at: string;
  updated_at: string;
  taken_at?: string;
  completed_at?: string;
  arbitrator?: {
    id: number;
    username: string;
  };
  decision?: Decision;
  messages: Message[];
  attachments: Attachment[];
}


export interface RefundRequest extends Claim {
  type: 'refund';
  requested_amount: number;
  reason: string;
  client_comments: string;
  expert_response?: string;
}


export interface Dispute extends Claim {
  type: 'dispute' | 'conflict';
  conflict_type: 'quality' | 'deadline' | 'other';
  cancellation_reason: string;
  client_complaint: string;
  expert_complaint?: string;
}


export interface InternalMessage {
  id: number;
  sender: {
    id: number;
    username: string;
    role: string;
  };
  recipient: {
    id: number;
    username: string;
    role: string;
  };
  text: string;
  claim_id?: number;
  priority: 'low' | 'medium' | 'high';
  attachments: Attachment[];
  created_at: string;
  read_at?: string;
  status: 'sent' | 'read' | 'replied';
}


export interface DecisionRequest {
  decision_type: 'full_refund' | 'partial_refund' | 'no_refund' | 'revision' | 'other';
  reasoning: string;
  client_comment?: string;
  expert_comment?: string;
  require_approval: boolean;
  refund_amount?: number;
}


export interface RequestInfoRequest {
  message: string;
  recipient: 'client' | 'expert' | 'both';
}


export interface SendForApprovalRequest {
  message: string;
}


export interface SendMessageRequest {
  text: string;
  claim_id?: number;
  priority?: 'low' | 'medium' | 'high';
  attachments?: File[];
}


export interface GetClaimsParams {
  status?: 'new' | 'in_progress' | 'completed' | 'pending_approval';
  type?: 'refund' | 'dispute' | 'conflict';
  page?: number;
  page_size?: number;
  search?: string;
  date_from?: string;
  date_to?: string;
}


export interface GetMessagesParams {
  page?: number;
  page_size?: number;
  claim_id?: number;
  unread_only?: boolean;
}


export interface GetStatisticsParams {
  date_from?: string;
  date_to?: string;
}


export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}


export interface Statistics {
  total_claims: number;
  claims_by_status: {
    new: number;
    in_progress: number;
    completed: number;
    pending_approval: number;
  };
  average_processing_time: number;
  decisions_by_type: {
    full_refund: number;
    partial_refund: number;
    no_refund: number;
    revision: number;
    other: number;
  };
  period: {
    start: string;
    end: string;
  };
}
