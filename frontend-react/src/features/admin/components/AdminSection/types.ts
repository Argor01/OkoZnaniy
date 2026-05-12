import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';

export type FilterType = 'search' | 'select' | 'dateRange' | 'toggle';

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterConfig {
  key: string;
  type: FilterType;
  label: string;
  placeholder?: string;
  options?: FilterOption[];
  defaultValue?: string | boolean;
}

export interface StatConfig {
  key: string;
  title: string;
  getValue: (data: any[]) => number | string;
  suffix?: string;
  precision?: number;
  color?: string;
}

export interface ActionConfig<T = any> {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onClick: (record: T) => void;
  danger?: boolean;
  hidden?: (record: T) => boolean;
  loading?: (record: T) => boolean;
}

export interface AdminSectionProps<T extends Record<string, any> = any> {
  title: string;
  data: T[];
  loading?: boolean;
  columns: ColumnsType<T>;
  filters?: FilterConfig[];
  stats?: StatConfig[];
  actions?: ActionConfig<T>[];
  rowKey?: string | ((record: T) => string);
  searchFields?: (keyof T)[];
  pagination?: boolean;
  pageSize?: number;
  className?: string;
  extra?: React.ReactNode;
}

export interface FilterState {
  searchText: string;
  filters: Record<string, string | boolean>;
  dateRange: [Dayjs, Dayjs] | null;
}
