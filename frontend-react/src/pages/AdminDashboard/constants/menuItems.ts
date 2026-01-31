import {
  BarChartOutlined,
  TeamOutlined,
  DollarOutlined,
  FileTextOutlined,
  BellOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  HourglassOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import type { MenuKey } from '../types/admin.types';

/**
 * Конфигурация меню админской панели
 * Вынесена из монолитного AdminDashboard.tsx
 */

export interface MenuItem {
  key: MenuKey;
  icon: any;
  label: string;
  children?: MenuItem[];
}

export const menuItems: MenuItem[] = [
  {
    key: 'overview',
    icon: BarChartOutlined,
    label: 'Обзор',
  },
  {
    key: 'partners',
    icon: TeamOutlined,
    label: 'Партнеры',
  },
  {
    key: 'earnings',
    icon: DollarOutlined,
    label: 'Начисления',
  },
  {
    key: 'disputes',
    icon: FileTextOutlined,
    label: 'Споры',
  },
  {
    key: 'claims' as MenuKey,
    icon: FileTextOutlined,
    label: 'Обращения',
    children: [
      {
        key: 'new_claims',
        icon: BellOutlined,
        label: 'Новые обращения',
      },
      {
        key: 'in_progress_claims',
        icon: ClockCircleOutlined,
        label: 'В работе',
      },
      {
        key: 'completed_claims',
        icon: CheckCircleOutlined,
        label: 'Завершённые',
      },
      {
        key: 'pending_approval',
        icon: HourglassOutlined,
        label: 'Ожидают решения',
      },
    ],
  },
  {
    key: 'claims_processing',
    icon: FileTextOutlined,
    label: 'Обработка претензий',
  },
  {
    key: 'communication',
    icon: MessageOutlined,
    label: 'Коммуникация с дирекцией',
  },
];

export const titleMap: Record<MenuKey, string> = {
  overview: 'Обзор',
  partners: 'Партнеры',
  earnings: 'Начисления',
  disputes: 'Споры',
  new_claims: 'Новые обращения',
  in_progress_claims: 'В работе',
  completed_claims: 'Завершённые',
  pending_approval: 'Ожидают решения',
  claims_processing: 'Обработка претензий',
  communication: 'Коммуникация с дирекцией',
};

// Маппинг для определения родительского меню
export const getParentMenuKey = (menuKey: MenuKey): MenuKey | null => {
  const childToParent: Record<MenuKey, MenuKey> = {
    new_claims: 'claims' as MenuKey,
    in_progress_claims: 'claims' as MenuKey,
    completed_claims: 'claims' as MenuKey,
    pending_approval: 'claims' as MenuKey,
  };
  
  return childToParent[menuKey] || null;
};

// Проверка, является ли пункт меню подменю
export const isSubmenuItem = (menuKey: MenuKey): boolean => {
  return getParentMenuKey(menuKey) !== null;
};