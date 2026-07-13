import type { ChatListItem, ChatDetail, Message } from '@/features/support/api/chat';
import type { OrderAvailableActions } from '@/features/orders/types/orders';
import type { Dayjs } from 'dayjs';

export interface MessageModalProps {
  visible: boolean;
  onClose: () => void;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  selectedUserId?: number;
  selectedOrderId?: number;
  chatContextTitle?: string;
  supportUserId?: number;
  userProfile?: { role?: string };
  renderAsPage?: boolean;
}

export type OfferData = {
  description?: string;
  work_type?: string;
  subject?: string;
  cost?: number;
  prepayment_percent?: number;
  deadline?: string | null;
  status?: 'new' | 'accepted' | 'rejected';
  order_id?: number;
} & Record<string, unknown>;

export type WorkOfferData = {
  title?: string;
  description?: string;
  cost?: number;
  status?: 'new' | 'accepted' | 'rejected';
  delivery_status?: 'pending' | 'awaiting_upload' | 'delivered' | 'accepted' | 'rejected';
  delivered_message_id?: number;
} & Record<string, unknown>;

export type OrderForChat = {
  id: number;
  title?: string | null;
  description?: string | null;
  budget?: string | number | null;
  deadline?: string | null;
  status?: string | null;
  is_overdue?: boolean | null;
  is_frozen?: boolean | null;
  frozen_reason?: string | null;
  frozen_at?: string | null;
  client?: { id?: number | null } | null;
  client_id?: number | null;
  expert?: { id?: number | null } | null;
  expert_id?: number | null;
  subject?: { name?: string | null } | null;
  work_type?: { name?: string | null } | null;
  custom_subject?: string | null;
  custom_work_type?: string | null;
  available_actions?: OrderAvailableActions;
  files?: Array<{ id: number; file_name: string; file_url: string; file_type?: string }>;
};

export type DeviceEmojiFamily = 'ios' | 'android' | 'windows' | 'mac' | 'linux' | 'other';
export type EmojiVersionLevel = '12.0' | '13.0' | '14.0' | '15.0';

export type GroupedMessage = Message & { attached_files?: { name: string; url: string }[] };

export type ContextChat = { userId: number; title: string } | null;

export { type ChatListItem, type ChatDetail, type Message };
