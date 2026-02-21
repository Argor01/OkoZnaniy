import { User } from '../../../api/auth';



export enum ClaimStatus {
  NEW = 'new',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  PENDING_DIRECTOR = 'pending_director',
  CLOSED = 'closed'
}

export enum ClaimType {
  TECHNICAL_SUPPORT = 'technical_support',
  BILLING_QUESTION = 'billing_question',
  USER_COMPLAINT = 'user_complaint',
  ORDER_ISSUE = 'order_issue',
  FEATURE_REQUEST = 'feature_request',
  OTHER = 'other'
}

export enum ClaimPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface Claim {
  id: number;
  user: User;
  claimType: ClaimType;
  priority: ClaimPriority;
  status: ClaimStatus;
  subject: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolution?: string;
  assignedAdmin?: User;
  startedAt?: string;
  relatedOrder?: {
    id: number;
    title: string;
    client: User;
    expert: User;
  };
  messages?: ClaimMessage[];
  statusHistory?: ClaimStatusHistory[];
}

export interface ClaimMessage {
  id: number;
  author: User;
  message: string;
  createdAt: string;
  isInternal: boolean;
}

export interface ClaimStatusHistory {
  id: number;
  status: ClaimStatus;
  changedBy: User;
  createdAt: string;
  comment?: string;
}

export interface DirectorCommunication {
  id: number;
  subject: string;
  priority: ClaimPriority;
  status: 'open' | 'in_discussion' | 'resolved' | 'closed';
  relatedClaim?: Claim;
  messages: DirectorMessage[];
  decision?: string;
  createdAt: string;
  updatedAt: string;
  unreadCount: number;
}

export interface DirectorMessage {
  id: number;
  author: User;
  message: string;
  createdAt: string;
}


export const getClaimTypeLabel = (type: ClaimType): string => {
  const labels: Record<ClaimType, string> = {
    [ClaimType.TECHNICAL_SUPPORT]: 'Техническая поддержка',
    [ClaimType.BILLING_QUESTION]: 'Вопрос по оплате',
    [ClaimType.USER_COMPLAINT]: 'Жалоба на пользователя',
    [ClaimType.ORDER_ISSUE]: 'Проблема с заказом',
    [ClaimType.FEATURE_REQUEST]: 'Запрос функции',
    [ClaimType.OTHER]: 'Другое'
  };
  return labels[type] || type;
};

export const getClaimStatusLabel = (status: ClaimStatus): string => {
  const labels: Record<ClaimStatus, string> = {
    [ClaimStatus.NEW]: 'Новое',
    [ClaimStatus.IN_PROGRESS]: 'В работе',
    [ClaimStatus.RESOLVED]: 'Решено',
    [ClaimStatus.PENDING_DIRECTOR]: 'Ожидает решения',
    [ClaimStatus.CLOSED]: 'Закрыто'
  };
  return labels[status] || status;
};

export const getClaimPriorityLabel = (priority: ClaimPriority): string => {
  const labels: Record<ClaimPriority, string> = {
    [ClaimPriority.LOW]: 'Низкий',
    [ClaimPriority.MEDIUM]: 'Средний',
    [ClaimPriority.HIGH]: 'Высокий',
    [ClaimPriority.URGENT]: 'Срочный'
  };
  return labels[priority] || priority;
};

export const getClaimStatusColor = (status: ClaimStatus): string => {
  const colors: Record<ClaimStatus, string> = {
    [ClaimStatus.NEW]: 'blue',
    [ClaimStatus.IN_PROGRESS]: 'processing',
    [ClaimStatus.RESOLVED]: 'success',
    [ClaimStatus.PENDING_DIRECTOR]: 'warning',
    [ClaimStatus.CLOSED]: 'default'
  };
  return colors[status] || 'default';
};

export const getClaimPriorityColor = (priority: ClaimPriority): string => {
  const colors: Record<ClaimPriority, string> = {
    [ClaimPriority.LOW]: 'green',
    [ClaimPriority.MEDIUM]: 'blue',
    [ClaimPriority.HIGH]: 'orange',
    [ClaimPriority.URGENT]: 'red'
  };
  return colors[priority] || 'default';
};

export const getDirectorCommunicationStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    'open': 'Открыто',
    'in_discussion': 'Обсуждается',
    'resolved': 'Решено',
    'closed': 'Закрыто'
  };
  return labels[status] || status;
};