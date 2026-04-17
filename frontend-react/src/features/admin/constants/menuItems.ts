import {
  TeamOutlined,
  DollarOutlined,
  FileTextOutlined,
  MessageOutlined,
  ShoppingOutlined,
  StopOutlined,
  AuditOutlined,
} from '@ant-design/icons';
import type { MenuKey } from '@/features/admin/types/admin.types';

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
    key: 'blocking',
    icon: StopOutlined,
    label: 'Блокировка',
  },
  {
    key: 'contact_bans',
    icon: StopOutlined,
    label: 'Баны за контакты',
  },
  {
    key: 'orders_management',
    icon: ShoppingOutlined,
    label: 'Управление заказами',
  },
  {
    key: 'tickets',
    icon: FileTextOutlined,
    label: 'Обращения',
  },
  {
    key: 'arbitration',
    icon: AuditOutlined,
    label: 'Арбитраж',
  },
  {
    key: 'communication',
    icon: MessageOutlined,
    label: 'Коммуникация',
  },
];

export const titleMap: Record<MenuKey, string> = {
  overview: 'Обзор',
  partners: 'Партнеры',
  earnings: 'Начисления',
  blocking: 'Блокировка',
  contact_bans: 'Баны за контакты',
  user_roles: 'Роли пользователей',
  orders_management: 'Управление заказами',
  support_open: 'Открытые запросы поддержки',
  support_in_progress: 'Запросы поддержки в работе',
  support_completed: 'Завершенные запросы поддержки',
  tickets: 'Обращения',
  arbitration: 'Арбитраж',
  communication: 'Коммуникация',
  internal_communication: 'Внутренняя коммуникация',
  admin_group_chats: 'Групповые чаты администраторов',
  admin_chats: 'Чаты админов',
  new_claims: 'Новые заявки',
  in_progress_claims: 'Заявки в работе',
  completed_claims: 'Завершенные заявки',
  pending_approval: 'Ожидают подтверждения',
  user_conversations: 'Диалоги пользователей',
};

export const getParentMenuKey = (_menuKey: MenuKey): MenuKey | null => {
  return null;
};

export const isSubmenuItem = (menuKey: MenuKey): boolean => {
  return getParentMenuKey(menuKey) !== null;
};
