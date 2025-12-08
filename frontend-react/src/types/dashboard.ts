// Типы для системы дашбордов

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'client' | 'expert' | 'partner' | 'admin' | 'director';
  phone: string;
  avatar?: string;
  balance?: number;
  bio?: string;
  date_joined?: string;
}

export interface OrdersCount {
  all: number;
  new: number;
  confirming: number;
  in_progress: number;
  payment: number;
  review: number;
  completed: number;
  revision: number;
  download: number;
  closed: number;
}

export interface ChatMessage {
  id: number;
  text: string;
  timestamp: string;
  isMine: boolean;
  isRead: boolean;
}

export interface Chat {
  id: number;
  chatId: number;
  userName: string;
  userAvatar?: string;
  lastMessage: string;
  timestamp: string;
  isRead: boolean;
  isOnline: boolean;
  unreadCount: number;
  messages: ChatMessage[];
}

export type NotificationType = 'order' | 'claim' | 'message' | 'balance' | 'bid' | 'system';

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  icon?: React.ReactNode;
  actionUrl?: string;
}

export interface NotificationSettings {
  orderConfirmation: boolean;
  claims: boolean;
  messages: boolean;
  balanceTopUp: boolean;
  bids: boolean;
  systemUpdates: boolean;
}

export type OrderStatus =
  | 'new'
  | 'confirming'
  | 'in_progress'
  | 'payment'
  | 'review'
  | 'completed'
  | 'revision'
  | 'download'
  | 'closed'
  | 'cancelled';

export interface Order {
  id: number;
  title: string;
  description: string;
  budget: number;
  status: OrderStatus;
  deadline: string;
  created_at: string;
  client: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  };
  subject: {
    id: number;
    name: string;
  };
  work_type: {
    id: number;
    name: string;
  };
}
