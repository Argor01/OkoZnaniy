export interface InternalMessage {
  id: number;
  sender: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    role: string;
  };
  recipient: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    role: string;
  };
  subject: string;
  message: string;
  message_type: 'question' | 'report' | 'request' | 'notification';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  is_read: boolean;
  is_archived: boolean;
  created_at: string;
  read_at?: string;
  parent_message_id?: number;
}

export interface MeetingRequest {
  id: number;
  requester: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  };
  director: {
    id: number;
    first_name: string;
    last_name: string;
  };
  subject: string;
  description: string;
  proposed_date: string;
  approved_date?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  rejection_reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}
