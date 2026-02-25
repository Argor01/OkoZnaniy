export interface Subject {
  id: number;
  name: string;
  slug: string;
  description: string;
  category: number;
  category_name: string;
  icon: string;
  is_active: boolean;
  min_price: string;
  topics_count: number;
  active_topics_count: number;
  experts_count: number;
  verified_experts_count: number;
  orders_count: number;
  completed_orders_count: number;
}

export interface Topic {
  id: number;
  name: string;
  slug: string;
  description: string;
  subject: number;
  subject_name: string;
  is_active: boolean;
}

export interface WorkType {
  id: number;
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
}

export interface Complexity {
  id: number;
  name: string;
  slug: string;
  description: string;
  multiplier: number;
  is_active: boolean;
}

export interface Skill {
  id: number;
  name: string;
}

// Subsets for orders
export type OrderSubject = Pick<Subject, 'id' | 'name'>;
export type OrderTopic = Pick<Topic, 'id' | 'name'>;
export type OrderWorkType = Pick<WorkType, 'id' | 'name'>;
export type OrderComplexity = Pick<Complexity, 'id' | 'name'>;
