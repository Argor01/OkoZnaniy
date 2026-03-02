import { User } from '@/features/auth/api/auth';

export interface ShopAuthor {
  id: number;
  name: string;
  username?: string;
  avatar?: string;
  rating: number;
}

export interface WorkFile {
  id: number;
  name: string;
  file?: string;
  file_type?: string;
  file_size?: number;
  type?: string;
  size?: number;
  url?: string;
}

export interface Work {
  id: number;
  title: string;
  description: string;
  price: number;
  category?: string;
  subject: number;
  work_type: number;
  subject_name?: string;
  work_type_name?: string;
  rating: number;
  reviewsCount: number;
  viewsCount: number;
  purchasesCount: number;
  author: ShopAuthor;
  author_name?: string;
  author_avatar?: string;
  preview?: string;
  files: WorkFile[];
  tags?: string[];
  created_at?: string;
  updated_at?: string;
  is_favorite?: boolean;
  is_active?: boolean;
  isLocal?: boolean;
}

export interface CreateWorkPayload {
  title: string;
  description: string;
  price: number;
  subject: string;
  work_type: string;
  preview?: File | null;
  files?: File[];
}

export interface Purchase {
  id: number;
  work: number;
  work_title?: string;
  work_detail?: Work;
  price_paid: string | number;
  rating?: number | null;
  rated_at?: string | null;
  delivered_file_available?: boolean;
  delivered_file_name?: string;
  delivered_file_type?: string;
  delivered_file_size?: number;
  created_at: string;
}
