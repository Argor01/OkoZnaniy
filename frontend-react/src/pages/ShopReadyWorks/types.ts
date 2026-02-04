// Типы для ShopReadyWorks

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
  subject_name?: string; // Название предмета из API
  workType: string;
  work_type_name?: string; // Название типа работы из API
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
  author_name?: string; // Имя автора из API
  preview?: string; // URL изображения превью
  files: WorkFile[];
  tags?: string[];
  createdAt: string;
  created_at?: string; // Дата создания из API
  updatedAt: string;
  updated_at?: string; // Дата обновления из API
  isFavorite?: boolean;
  is_active?: boolean;
}

export interface WorkFile {
  id: number;
  name: string;
  file?: string; // URL файла
  file_type?: string; // Тип файла из API
  file_size?: number; // Размер файла из API
  type?: string; // Для совместимости
  size?: number; // Для совместимости
  url?: string; // Для совместимости
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
