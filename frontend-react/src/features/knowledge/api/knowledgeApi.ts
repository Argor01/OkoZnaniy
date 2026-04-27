import { apiClient } from '@/api/client';

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  order: number;
  subjects_count?: number;
  active_subjects_count?: number;
}

export interface Question {
  id: number;
  title: string;
  description: string;
  category: string;
  author: {
    id: number;
    name: string;
    username?: string;
    avatar?: string;
  };
  created_at: string;
  views_count: number;
  answers_count: number;
  status: 'open' | 'answered' | 'closed';
  tags: string[];
  answers?: Answer[];
}

export interface Answer {
  id: number;
  author: {
    id: number;
    name: string;
    username?: string;
    avatar?: string;
    role?: string;
  };
  content: string;
  created_at: string;
  likes_count: number;
  is_best_answer: boolean;
  is_liked?: boolean;
}

export interface ArticleFile {
  id: number;
  file_url: string;
  original_name: string;
  file_size: number;
  uploaded_at: string;
}

export interface ArticleAuthor {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  role: string;
}

export interface Article {
  id: number;
  title: string;
  description: string;
  work_type: string;
  subject: string;
  author: ArticleAuthor;
  views_count: number;
  files_count?: number;
  files?: ArticleFile[];
  created_at: string;
  updated_at?: string;
}

export const articlesApi = {
  getArticles: async (params?: {
    search?: string;
    work_type?: string;
    subject?: string;
  }): Promise<Article[]> => {
    const response = await apiClient.get('/knowledge/articles/', { params });
    return response.data.results || response.data;
  },

  getArticle: async (id: number): Promise<Article> => {
    const response = await apiClient.get(`/knowledge/articles/${id}/`);
    return response.data;
  },

  createArticle: async (formData: FormData): Promise<Article> => {
    const response = await apiClient.post('/knowledge/articles/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  deleteArticle: async (id: number): Promise<void> => {
    await apiClient.delete(`/knowledge/articles/${id}/`);
  },
};

export const knowledgeApi = {
  getCategories: async (): Promise<Category[]> => {
    const response = await apiClient.get('/catalog/categories/');
    return response.data;
  },

  getQuestions: async (params?: {
    category?: string;
    status?: string;
    search?: string;
  }): Promise<Question[]> => {
    const response = await apiClient.get('/knowledge/questions/', { params });
    return response.data;
  },

  getQuestion: async (id: number): Promise<Question> => {
    const response = await apiClient.get(`/knowledge/questions/${id}/`);
    return response.data;
  },

  createQuestion: async (data: {
    title: string;
    description: string;
    category: string;
    tags: string[];
  }): Promise<Question> => {
    const response = await apiClient.post('/knowledge/questions/', data);
    return response.data;
  },

  addAnswer: async (questionId: number, content: string): Promise<Answer> => {
    const response = await apiClient.post(
      `/knowledge/questions/${questionId}/add_answer/`,
      { content }
    );
    return response.data;
  },

  toggleLike: async (answerId: number): Promise<{ liked: boolean; likes_count: number }> => {
    const response = await apiClient.post(`/knowledge/answers/${answerId}/toggle_like/`);
    return response.data;
  },

  deleteAnswer: async (answerId: number): Promise<void> => {
    await apiClient.delete(`/knowledge/answers/${answerId}/`);
  },

  deleteQuestion: async (questionId: number): Promise<void> => {
    await apiClient.delete(`/knowledge/questions/${questionId}/`);
  },

  getUserKnowledgeStats: async (userId: number): Promise<{
    answers_count: number;
    questions_count: number;
    total_likes: number;
    best_answers: number;
  }> => {
    const response = await apiClient.get(`/knowledge/user-stats/${userId}/`);
    return response.data;
  },
};
