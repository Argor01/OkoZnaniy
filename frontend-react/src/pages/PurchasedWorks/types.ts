export interface PurchasedWork {
  id: number;
  title: string;
  type: string;
  subject: string;
  price: number;
  originalPrice?: number;
  purchaseDate: string;
  downloadUrl: string;
  isDownloaded: boolean;
  downloadCount: number;
  preview?: string;
  description: string;
  rating?: number;
  reviewsCount?: number;
}

export interface FiltersState {
  search?: string;
  type?: string;
  subject?: string;
  sortBy: 'date' | 'price-asc' | 'price-desc';
  status?: 'all' | 'downloaded' | 'not-downloaded';
}
