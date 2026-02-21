

export enum ClaimType {
  TECHNICAL = 'technical',
  FINANCIAL = 'financial',
  USER_COMPLAINT = 'user_complaint',
  ORDER_ISSUE = 'order_issue',
  GENERAL = 'general',
  OTHER = 'other',
}

export enum ClaimStatus {
  NEW = 'new',
  IN_PROGRESS = 'in_progress',
  PENDING_DIRECTOR = 'pending_director',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum ClaimPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum DirectorCommunicationStatus {
  OPEN = 'open',
  IN_DISCUSSION = 'in_discussion',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'client' | 'expert' | 'partner' | 'admin' | 'director';
}

export interface Order {
  id: number;
  title: string;
  status: string;
  client: User;
  expert?: User;
}

export interface Dispute {
  id: number;
  order: Order;
  reason: string;
  resolved: boolean;
}

export interface ClaimMessage {
  id: number;
  claimId: number;
  author: User;
  message: string;
  isInternal: boolean;
  createdAt: string;
}

export interface ClaimFile {
  id: number;
  claimId: number;
  fileName: string;
  fileUrl: string;
  uploadedBy: User;
  description?: string;
  createdAt: string;
}

export interface ClaimStatusHistory {
  id: number;
  claimId: number;
  oldStatus: ClaimStatus;
  newStatus: ClaimStatus;
  changedBy: User;
  comment?: string;
  createdAt: string;
}

export interface Claim {
  id: number;
  user: User;
  claimType: ClaimType;
  priority: ClaimPriority;
  status: ClaimStatus;
  subject: string;
  description: string;
  relatedOrder?: Order;
  relatedDispute?: Dispute;
  assignedAdmin?: User;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  resolvedAt?: string;
  resolution?: string;
  resolutionType?: string;
  messages: ClaimMessage[];
  files: ClaimFile[];
  statusHistory: ClaimStatusHistory[];
}

export interface DirectorMessage {
  id: number;
  communicationId: number;
  author: User;
  message: string;
  createdAt: string;
  isRead: boolean;
}

export interface DirectorCommunication {
  id: number;
  subject: string;
  priority: ClaimPriority;
  status: DirectorCommunicationStatus;
  createdBy: User;
  relatedClaim?: Claim;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  decision?: string;
  messages: DirectorMessage[];
  unreadCount: number;
}

export interface ResponseTemplate {
  id: number;
  name: string;
  claimType: ClaimType;
  subject: string;
  content: string;
  variables: string[];
  createdBy: User;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface ClaimsStatistics {
  total: number;
  new: number;
  inProgress: number;
  pendingDirector: number;
  resolved: number;
  closed: number;
  byType: Record<ClaimType, number>;
  byPriority: Record<ClaimPriority, number>;
  avgResolutionTime: number; 
  pendingOver24h: number;
  topReasons: Array<{ reason: string; count: number; percentage: number }>;
  trend: Array<{ date: string; created: number; resolved: number }>;
}


export const getClaimTypeLabel = (type: ClaimType): string => {
  const labels: Record<ClaimType, string> = {
    [ClaimType.TECHNICAL]: 'Техническая проблема',
    [ClaimType.FINANCIAL]: 'Финансовый вопрос',
    [ClaimType.USER_COMPLAINT]: 'Жалоба на пользователя',
    [ClaimType.ORDER_ISSUE]: 'Проблема с заказом',
    [ClaimType.GENERAL]: 'Общий вопрос',
    [ClaimType.OTHER]: 'Другое',
  };
  return labels[type];
};

export const getClaimStatusLabel = (status: ClaimStatus): string => {
  const labels: Record<ClaimStatus, string> = {
    [ClaimStatus.NEW]: 'Новое',
    [ClaimStatus.IN_PROGRESS]: 'В работе',
    [ClaimStatus.PENDING_DIRECTOR]: 'Ожидает решения дирекции',
    [ClaimStatus.RESOLVED]: 'Решено',
    [ClaimStatus.CLOSED]: 'Закрыто',
  };
  return labels[status];
};

export const getClaimPriorityLabel = (priority: ClaimPriority): string => {
  const labels: Record<ClaimPriority, string> = {
    [ClaimPriority.LOW]: 'Низкий',
    [ClaimPriority.MEDIUM]: 'Средний',
    [ClaimPriority.HIGH]: 'Высокий',
    [ClaimPriority.CRITICAL]: 'Критический',
  };
  return labels[priority];
};

export const getDirectorCommunicationStatusLabel = (status: DirectorCommunicationStatus): string => {
  const labels: Record<DirectorCommunicationStatus, string> = {
    [DirectorCommunicationStatus.OPEN]: 'Открыто',
    [DirectorCommunicationStatus.IN_DISCUSSION]: 'Обсуждается',
    [DirectorCommunicationStatus.RESOLVED]: 'Решено',
    [DirectorCommunicationStatus.CLOSED]: 'Закрыто',
  };
  return labels[status];
};

export const getClaimPriorityColor = (priority: ClaimPriority): string => {
  const colors: Record<ClaimPriority, string> = {
    [ClaimPriority.LOW]: 'default',
    [ClaimPriority.MEDIUM]: 'blue',
    [ClaimPriority.HIGH]: 'orange',
    [ClaimPriority.CRITICAL]: 'red',
  };
  return colors[priority];
};

export const getClaimStatusColor = (status: ClaimStatus): string => {
  const colors: Record<ClaimStatus, string> = {
    [ClaimStatus.NEW]: 'blue',
    [ClaimStatus.IN_PROGRESS]: 'processing',
    [ClaimStatus.PENDING_DIRECTOR]: 'warning',
    [ClaimStatus.RESOLVED]: 'success',
    [ClaimStatus.CLOSED]: 'default',
  };
  return colors[status];
};
