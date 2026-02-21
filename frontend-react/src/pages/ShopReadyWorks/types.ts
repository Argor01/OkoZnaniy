

export interface Work {
  id: number;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  category?: string;
  subject: number;
  work_type: number;
  subjectId?: number;
  workTypeId?: number;
  subject_name?: string; 
  workType: string;
  work_type_name?: string; 
  rating: number;
  reviewsCount: number;
  viewsCount: number;
  purchasesCount: number;
  author: {
    id: number;
    name: string;
    username?: string;
    avatar?: string;
    rating: number;
  };
  author_name?: string; 
  preview?: string; 
  files: WorkFile[];
  tags?: string[];
  createdAt: string;
  created_at?: string; 
  updatedAt: string;
  updated_at?: string; 
  isFavorite?: boolean;
  is_active?: boolean;
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
