/**
 * Экспорт всех типов AdminDashboard
 * Централизованный импорт для удобства
 */

// Основные типы админки
export type {
  Partner,
  PartnerEarning,
  Dispute,
  Arbitrator,
  UpdatePartnerRequest,
  AdminStats,
  MenuKey,
  TableColumn,
  ModalProps,
  PartnerModalProps,
  DisputeModalProps,
} from './admin.types';

// Типы для обращений
export type {
  Claim,
  ClaimMessage,
  ClaimStatusHistory,
  DirectorCommunication,
  DirectorMessage,
} from './claims.types';

// Типы для поддержки
export type {
  SupportRequest,
  SupportMessage,
  AdminChat,
  ChatMessage,
  SupportStats,
  SupportStatus,
  SupportPriority,
  SupportCategory,
} from './support.types';

// 🆕 Типы для обработки запросов клиентов
export type {
  CustomerRequest,
  RequestMessage,
  RequestAttachment,
  MessageAttachment,
  InternalCommunication,
  AdminUser,
  AdminChatGroup,
  RequestStats,
  RequestStatus,
  RequestPriority,
  RequestCategory,
  CreateRequestForm,
  UpdateRequestForm,
  SendMessageForm,
  RequestsApiResponse,
  MessagesApiResponse,
} from './requests.types';

export {
  ClaimStatus,
  ClaimType,
  ClaimPriority,
  getClaimTypeLabel,
  getClaimStatusLabel,
  getClaimPriorityLabel,
  getClaimStatusColor,
  getClaimPriorityColor,
  getDirectorCommunicationStatusLabel,
} from './claims.types';