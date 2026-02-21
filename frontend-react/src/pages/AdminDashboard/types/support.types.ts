

export interface SupportRequest {
  id: number;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'completed' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'technical' | 'billing' | 'account' | 'general';
  customer: {
    id: number;
    name: string;
    email: string;
    avatar?: string;
  };
  assignedAdmin?: {
    id: number;
    name: string;
    avatar?: string;
  };
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
  messagesCount: number;
  tags: string[];
}

export interface SupportMessage {
  id: number;
  requestId: number;
  senderId: number;
  senderType: 'customer' | 'admin';
  senderName: string;
  senderAvatar?: string;
  content: string;
  type: 'text' | 'image' | 'file';
  attachments?: {
    id: number;
    name: string;
    url: string;
    size: number;
    type: string;
  }[];
  createdAt: string;
  isRead: boolean;
}

export interface AdminChat {
  id: number;
  type: 'general' | 'private';
  name: string;
  participants: {
    id: number;
    name: string;
    avatar?: string;
    role: string;
    isOnline: boolean;
  }[];
  lastMessage?: {
    content: string;
    senderName: string;
    createdAt: string;
  };
  unreadCount: number;
  createdAt: string;
}

export interface ChatMessage {
  id: number;
  chatId: number;
  senderId: number;
  senderName: string;
  senderAvatar?: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  attachments?: {
    id: number;
    name: string;
    url: string;
    size: number;
    type: string;
  }[];
  createdAt: string;
  isRead: boolean;
  replyTo?: {
    id: number;
    content: string;
    senderName: string;
  };
}

export interface SupportStats {
  openRequests: number;
  inProgressRequests: number;
  completedToday: number;
  averageResponseTime: number; 
  customerSatisfaction: number; 
}

export type SupportStatus = 'open' | 'in_progress' | 'completed';
export type SupportPriority = 'low' | 'medium' | 'high' | 'urgent';
export type SupportCategory = 'technical' | 'billing' | 'account' | 'general';