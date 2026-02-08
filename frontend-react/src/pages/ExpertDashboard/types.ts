export interface UserProfile {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  phone: string;
  avatar?: string;
  bio?: string;
  experience_years?: number;
  hourly_rate?: number;
  education?: string;
  skills?: string;
  portfolio_url?: string;
  is_verified?: boolean;
  date_joined?: string;
  balance?: string;
  frozen_balance?: string;
}

export interface Notification {
  id: number;
  type: 'order' | 'claim' | 'forum' | 'question' | 'system';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  icon?: React.ReactNode;
  actionUrl?: string;
}

export interface ArbitrationCase {
  id: number;
  orderId: number;
  orderTitle: string;
  clientName: string;
  status: 'pending' | 'in_review' | 'resolved' | 'rejected';
  reason: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  amount: number;
  decision?: string;
  documents?: string[];
}

export interface ChatMessage {
  id: number;
  chatId: number;
  userName: string;
  userAvatar?: string;
  lastMessage: string;
  timestamp: string;
  isRead: boolean;
  isOnline: boolean;
  unreadCount: number;
  messages: {
    id: number;
    text: string;
    timestamp: string;
    isMine: boolean;
    isRead: boolean;
  }[];
}
