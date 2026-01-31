import { User } from '../../../api/auth';

/**
 * Типы для админской панели
 * Вынесены из монолитного AdminDashboard.tsx
 */

export interface Partner {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  referral_code: string;
  partner_commission_rate: number;
  total_referrals: number;
  active_referrals: number;
  total_earnings: number;
  is_verified: boolean;
  date_joined: string;
}

export interface PartnerEarning {
  id: number;
  partner: string;
  referral: string;
  amount: number;
  earning_type: 'order' | 'registration' | 'bonus';
  is_paid: boolean;
  created_at: string;
}

export interface Dispute {
  id: number;
  order: {
    id: number;
    title: string;
    client: User;
    expert: User | null;
  };
  reason: string;
  arbitrator: User | null;
  resolved: boolean;
  result?: string;
  created_at: string;
}

export interface Arbitrator {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
}

export interface UpdatePartnerRequest {
  partner_commission_rate?: number;
  is_verified?: boolean;
}

export interface AdminStats {
  totalPartners: number;
  totalReferrals: number;
  totalEarnings: number;
  unpaidEarnings: number;
  totalDisputes: number;
  resolvedDisputes: number;
  pendingDisputes: number;
}

export type MenuKey = 
  | 'overview'
  | 'partners' 
  | 'earnings'
  | 'disputes'
  | 'new_claims'
  | 'in_progress_claims'
  | 'completed_claims'
  | 'pending_approval'
  | 'claims_processing'
  | 'communication';

// Типы для таблиц
export interface TableColumn {
  title: string;
  dataIndex?: string | string[];
  key: string;
  width?: number | string;
  render?: (value: any, record: any, index: number) => React.ReactNode;
  ellipsis?: boolean | { tooltip?: boolean | string };
}

// Типы для модальных окон
export interface ModalProps {
  visible: boolean;
  onCancel: () => void;
  onOk?: () => void;
}

export interface PartnerModalProps extends ModalProps {
  partner: Partner | null;
  onUpdate: (partnerId: number, data: UpdatePartnerRequest) => void;
}

export interface DisputeModalProps extends ModalProps {
  dispute: Dispute | null;
  arbitrators: Arbitrator[];
  onAssignArbitrator: (disputeId: number, arbitratorId: number) => void;
}