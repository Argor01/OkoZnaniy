import { User } from '../../../api/auth';



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
  | 'claims'
  | 'new_claims'
  | 'in_progress_claims'
  | 'completed_claims'
  | 'pending_approval'
  | 'internal_communication'       
  | 'support_open'                 
  | 'support_in_progress'          
  | 'support_completed'            
  | 'support_chats'                
  | 'tickets'                      
  | 'admin_chats'
  | 'admin_group_chats'            
  | 'request_processing'
  | 'request_processing_open'      
  | 'request_processing_progress'  
  | 'request_processing_completed' 
  | 'users_management'            
  | 'all_users'
  | 'blocked_users'
  | 'user_roles'
  | 'orders_management'           
  | 'all_orders'
  | 'problem_orders';


export interface TableColumn {
  title: string;
  dataIndex?: string | string[];
  key: string;
  width?: number | string;
  render?: (value: any, record: any, index: number) => React.ReactNode;
  ellipsis?: boolean | { tooltip?: boolean | string };
}


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


export type SupportStatus = 'open' | 'in_progress' | 'completed';

export interface SupportChat {
  id: number;
  user_id: number;
  user_name: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface SupportMessage {
  id: number;
  chat_id: number;
  content: string;
  is_from_admin: boolean;
  attachments?: SupportAttachment[];
  created_at: string;
}

export interface SupportAttachment {
  id: number;
  file_name: string;
  file_url: string;
  file_size: number;
}

export interface SupportRequest {
  id: number;
  user: User;
  subject: string;
  description: string;
  status: SupportStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_admin?: User;
  created_at: string;
  updated_at: string;
}
