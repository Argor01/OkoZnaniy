import {
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
  UserOutlined,        // 🆕 Для обработки запросов
  ShoppingOutlined,    // Для управления заказами
  StopOutlined,        // Для заблокированных пользователей
  SafetyOutlined,      // Для ролей и прав
  UnorderedListOutlined, // Для списка заказов
  ExclamationCircleOutlined, // Для проблемных заказов
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
  // Управление пользователями
  {
    key: 'users_management' as MenuKey,
    icon: UserOutlined,
    label: 'Управление пользователями',
    children: [
      {
        key: 'all_users',
        icon: TeamOutlined,
        label: 'Все пользователи',
      },
      {
        key: 'blocked_users',
        icon: StopOutlined,
        label: 'Заблокированные',
      },
      {
        key: 'user_roles',
        icon: SafetyOutlined,
        label: 'Роли и права',
      },
    ],
  },
  // Управление заказами
  {
    key: 'orders_management' as MenuKey,
    icon: ShoppingOutlined,
    label: 'Управление заказами',
    children: [
      {
        key: 'all_orders',
        icon: UnorderedListOutlined,
        label: 'Все заказы',
      },
      {
        key: 'problem_orders',
        icon: ExclamationCircleOutlined,
        label: 'Проблемные заказы',
      },
    ],
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
    key: 'support_chats',
    icon: MessageOutlined,
    label: 'Чаты поддержки',
  },
  {
    key: 'admin_chats',
    icon: CommentOutlined,
    label: 'Внутренняя коммуникация',
  },
  // Новый раздел обработки запросов
  {
    key: 'request_processing' as MenuKey,
    icon: UserOutlined,
    label: 'Обработка запросов',
    children: [
      {
        key: 'request_processing_open',
        icon: InboxOutlined,
        label: 'Открытые запросы',
      },
      {
        key: 'request_processing_progress',
        icon: ClockCircleOutlined,
        label: 'В процессе решения',
      },
      {
        key: 'request_processing_completed',
        icon: CheckCircleOutlined,
        label: 'Выполненные',
      },
    ],
  },
];

export const titleMap: Record<MenuKey, string> = {
  overview: 'Обзор',
  partners: 'Партнеры',
  earnings: 'Начисления',
  disputes: 'Споры',
  // Обращения
  claims: 'Обращения',
  new_claims: 'Новые обращения',
  in_progress_claims: 'В работе',
  completed_claims: 'Завершённые',
  pending_approval: 'Ожидают решения',
  claims_processing: 'Обработка претензий',
  internal_communication: 'Внутренняя коммуникация',
  // Управление пользователями
  users_management: 'Управление пользователями',
  all_users: 'Все пользователи',
  blocked_users: 'Заблокированные пользователи',
  user_roles: 'Роли и права',
  // Управление заказами
  orders_management: 'Управление заказами',
  all_orders: 'Все заказы',
  problem_orders: 'Проблемные заказы',
  // Поддержка
  support_open: 'Открытые запросы поддержки',
  support_in_progress: 'Запросы поддержки в работе',
  support_completed: 'Завершенные запросы поддержки',
  support_chats: 'Чаты поддержки',
  admin_chats: 'Внутренняя коммуникация',
  admin_group_chats: 'Групповые чаты администраторов',
  // Обработка запросов
  request_processing: 'Обработка запросов',
  request_processing_open: 'Открытые запросы клиентов',
  request_processing_progress: 'Запросы в процессе решения',
  request_processing_completed: 'Выполненные запросы',
};

// Маппинг для определения родительского меню
export const getParentMenuKey = (menuKey: MenuKey): MenuKey | null => {
  const childToParent: Partial<Record<MenuKey, MenuKey>> = {
    // Управление пользователями
    all_users: 'users_management' as MenuKey,
    blocked_users: 'users_management' as MenuKey,
    user_roles: 'users_management' as MenuKey,
    // Управление заказами
    all_orders: 'orders_management' as MenuKey,
    problem_orders: 'orders_management' as MenuKey,

    // Обращения
    new_claims: 'claims' as MenuKey,
    in_progress_claims: 'claims' as MenuKey,
    completed_claims: 'claims' as MenuKey,
    pending_approval: 'claims' as MenuKey,
    // Новые дочерние пункты меню
    request_processing_open: 'request_processing' as MenuKey,
    request_processing_progress: 'request_processing' as MenuKey,
    request_processing_completed: 'request_processing' as MenuKey,
  };
  
  return childToParent[menuKey] || null;
};

// Проверка, является ли пункт меню подменю
export const isSubmenuItem = (menuKey: MenuKey): boolean => {
  return getParentMenuKey(menuKey) !== null;
};