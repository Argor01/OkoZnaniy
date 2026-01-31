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
  InboxOutlined,
  CustomerServiceOutlined,
  CommentOutlined,
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
  // Новый раздел поддержки
  {
    key: 'support' as MenuKey,
    icon: CustomerServiceOutlined,
    label: 'Поддержка клиентов',
    children: [
      {
        key: 'support_open',
        icon: InboxOutlined,
        label: 'Открытые запросы',
      },
      {
        key: 'support_in_progress',
        icon: ClockCircleOutlined,
        label: 'В процессе решения',
      },
      {
        key: 'support_completed',
        icon: CheckCircleOutlined,
        label: 'Выполненные',
      },
    ],
  },
  {
    key: 'admin_chats',
    icon: CommentOutlined,
    label: 'Чаты администраторов',
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
  support_open: 'Открытые запросы',
  support_in_progress: 'В процессе решения',
  support_completed: 'Выполненные',
  admin_chats: 'Чаты администраторов',
};

// Маппинг для определения родительского меню
export const getParentMenuKey = (menuKey: MenuKey): MenuKey | null => {
  const childToParent: Record<MenuKey, MenuKey> = {
    new_claims: 'claims' as MenuKey,
    in_progress_claims: 'claims' as MenuKey,
    completed_claims: 'claims' as MenuKey,
    pending_approval: 'claims' as MenuKey,
    support_open: 'support' as MenuKey,
    support_in_progress: 'support' as MenuKey,
    support_completed: 'support' as MenuKey,
  };
  
  return childToParent[menuKey] || null;
};

// Проверка, является ли пункт меню подменю
export const isSubmenuItem = (menuKey: MenuKey): boolean => {
  return getParentMenuKey(menuKey) !== null;
};