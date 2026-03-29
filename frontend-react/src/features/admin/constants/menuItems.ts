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
  UserOutlined,        
  ShoppingOutlined,    
  StopOutlined,        
  SafetyOutlined,      
  UnorderedListOutlined, 
  ExclamationCircleOutlined,
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
    key: 'tariffs_settings',
    icon: DollarOutlined,
    label: 'Тарифы и комиссии',
  },
  
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

    ],
  },
  
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
    key: 'tickets',
    icon: FileTextOutlined,
    label: 'Обращения',
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
  tariffs_settings: 'Тарифы и комиссии',
  
  users_management: 'Управление пользователями',
  all_users: 'Все пользователи',
  blocked_users: 'Заблокированные пользователи',

  
  orders_management: 'Управление заказами',
  all_orders: 'Все заказы',
  problem_orders: 'Проблемные заказы',
  
  support_open: 'Открытые запросы поддержки',
  support_in_progress: 'Запросы поддержки в работе',
  support_completed: 'Завершенные запросы поддержки',

  tickets: 'Обращения',
  communication: 'Коммуникация',
  internal_communication: 'Внутренняя коммуникация',
  admin_group_chats: 'Групповые чаты администраторов',
  

};


export const getParentMenuKey = (menuKey: MenuKey): MenuKey | null => {
  const childToParent: Partial<Record<MenuKey, MenuKey>> = {
    
    all_users: 'users_management' as MenuKey,
    blocked_users: 'users_management' as MenuKey,

    
    all_orders: 'orders_management' as MenuKey,
    problem_orders: 'orders_management' as MenuKey,

  };
  
  return childToParent[menuKey] || null;
};


export const isSubmenuItem = (menuKey: MenuKey): boolean => {
  return getParentMenuKey(menuKey) !== null;
};