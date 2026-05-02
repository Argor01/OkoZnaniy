
export * from '@/features/shop/types/shop';

export interface Filters {
  search?: string;
  category?: number;
  subject?: number;
  workType?: string;
  priceMin?: number;
  priceMax?: number;
  rating?: number;
  sortBy?: 'newness' | 'price-asc' | 'price-desc' | 'rating' | 'popular';
}

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  phone: string;
  avatar?: string;
}

export interface WorkFormData {
  title: string;
  description: string;
  price: number;
  subject: string;
  workType: string;
  preview?: File | null;
  files?: File[];
}

export interface WorkFormProps {
  onSave: (data: WorkFormData) => void;
  onCancel: () => void;
}

export interface PurchasedWork {
  id: number;
  workId: number;
  subjectId: number;
  workTypeId: number;
  title: string;
  description: string;
  price: number;
  purchaseDate: string; 
  isDownloaded: boolean; 
  category: string;
  subject: string;
  workType: string;
  rating: number;
  reviewsCount: number;
  viewsCount: number;
  purchasesCount: number;
  author: {
    id: number;
    name: string;
    avatar?: string;
    rating: number;
  };

  preview?: string;
  deliveredFileAvailable: boolean;
  deliveredFileName?: string;
  deliveredFileType?: string;
  deliveredFileSize?: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  isFavorite?: boolean;
}

export interface FiltersState {
  search?: string;
  subjectId?: number;
  workTypeId?: number;
  sortBy?: string;
}
