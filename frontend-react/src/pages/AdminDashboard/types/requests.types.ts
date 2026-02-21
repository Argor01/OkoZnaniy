

export interface CustomerRequest {
  id: number;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'completed' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'technical' | 'billing' | 'account' | 'order' | 'general';
  customer: {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    phone?: string;
  };
  assignedAdmin?: {
    id: number;
    name: string;
    avatar?: string;
    department: string;
  };
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
  messagesCount: number;
  estimatedResolutionTime?: string;
  tags: string[];
  attachments: RequestAttachment[];
}

export interface RequestMessage {
  id: number;
  requestId: number;
  senderId: number;
  senderType: 'customer' | 'admin';
  senderName: string;
  senderAvatar?: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  attachments?: MessageAttachment[];
  createdAt: string;
  isRead: boolean;
  isInternal: boolean; 
}

export interface RequestAttachment {
  id: number;
  name: string;
  url: string;
  size: number;
  type: string;
}

export interface MessageAttachment {
  id: number;
  name: string;
  url: string;
  size: number;
  type: string;
}

export interface InternalCommunication {
  id: number;
  requestId?: number; 
  fromDepartment: string;
  toDepartment: string;
  subject: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'read' | 'replied';
  createdAt: string;
  participants: AdminUser[];
}

export interface AdminUser {
  id: number;
  name: string;
  avatar?: string;
  department: string;
  role: string;
  isOnline: boolean;
}

export interface AdminChatGroup {
  id: number;
  name: string;
  type: 'general' | 'department' | 'private';
  participants: AdminUser[];
  lastMessage?: ChatMessage;
  unreadCount: number;
  createdAt: string;
  isActive: boolean;
}

export interface ChatMessage {
  id: number;
  chatId: number;
  senderId: number;
  senderName: string;
  senderAvatar?: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  attachments?: MessageAttachment[];
  createdAt: string;
  isRead: boolean;
  replyTo?: {
    id: number;
    content: string;
    senderName: string;
  };
}

export interface RequestStats {
  openRequests: number;
  inProgressRequests: number;
  completedToday: number;
  averageResponseTime: number; 
  customerSatisfaction: number; 
  totalRequests: number;
  completionRate: number;
}


export type RequestStatus = 'open' | 'in_progress' | 'completed' | 'closed';
export type RequestPriority = 'low' | 'medium' | 'high' | 'urgent';
export type RequestCategory = 'technical' | 'billing' | 'account' | 'order' | 'general';


export interface CreateRequestForm {
  title: string;
  description: string;
  category: RequestCategory;
  priority: RequestPriority;
  customerId: number;
  tags: string[];
}

export interface UpdateRequestForm {
  title?: string;
  description?: string;
  status?: RequestStatus;
  priority?: RequestPriority;
  category?: RequestCategory;
  assignedAdminId?: number;
  tags?: string[];
  estimatedResolutionTime?: string;
}

export interface SendMessageForm {
  content: string;
  isInternal: boolean;
  attachments?: File[];
}


export interface RequestsApiResponse {
  results: CustomerRequest[];
  count: number;
  next?: string;
  previous?: string;
}

export interface MessagesApiResponse {
  results: RequestMessage[];
  count: number;
  next?: string;
  previous?: string;
}