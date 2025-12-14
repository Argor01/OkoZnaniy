// Типы для ShopReadyWorks

export interface Work {
  id: number;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  discount?: number;
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
  files: WorkFile[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  isFavorite?: boolean;
}

export interface WorkFile {
  id: number;
  name: string;
  type: string;
  size: number;
  url: string;
}

export interface Filters {
  search?: string;
  category?: string;
  subject?: string;
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
