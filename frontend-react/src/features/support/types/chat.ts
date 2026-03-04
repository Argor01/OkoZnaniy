import { UserSummary } from '@/features/user/types/users';

export interface Message {
  id: number;
  sender: UserSummary;
  sender_id: number;
  text: string;
  file?: string | null;
  file_name?: string | null;
  file_url?: string | null;
  is_read: boolean;
  is_mine: boolean;
  created_at: string;
  message_type?: 'text' | 'offer' | 'work_offer' | 'work_delivery' | 'system';
  offer_data?: {
    description?: string;
    work_type?: string;
    subject?: string;
    cost?: number;
    deadline?: string;
    status?: 'new' | 'accepted' | 'rejected';
    order_id?: number;
    title?: string;
    delivery_status?: 'pending' | 'awaiting_upload' | 'delivered' | 'accepted' | 'rejected';
    delivered_message_id?: number;
  } | null;
}

export interface ChatListItem {
  id: number;
  order: number;
  order_id?: number;
  order_title?: string | null;
  context_title?: string | null;
  client?: UserSummary | null;
  expert?: UserSummary | null;
  participants: UserSummary[];
  other_user: UserSummary;
  last_message: {
    text: string;
    sender_id: number;
    created_at: string;
    file_name?: string | null;
    file_url?: string | null;
  } | null;
  last_message_time: string;
  unread_count: number;
  is_frozen?: boolean;
  frozen_reason?: string;
}

export interface ChatDetail {
  id: number;
  order: number;
  order_id: number;
  order_title?: string | null;
  context_title?: string | null;
  client?: UserSummary | null;
  expert?: UserSummary | null;
  participants: UserSummary[];
  other_user: UserSummary;
  messages: Message[];
  unread_count: number;
  is_frozen?: boolean;
  frozen_reason?: string;
}
