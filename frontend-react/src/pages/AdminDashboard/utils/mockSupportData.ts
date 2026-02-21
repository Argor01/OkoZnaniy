

import { SupportRequest, SupportMessage, AdminChat, ChatMessage, SupportStats } from '../types/support.types';

export const mockSupportRequests: SupportRequest[] = [
  {
    id: 1,
    title: 'Проблема с оплатой заказа',
    description: 'Не могу оплатить заказ через банковскую карту. Выдает ошибку "Транзакция отклонена". Пробовал разные карты, но результат тот же. Очень срочно нужно оплатить!',
    status: 'open',
    priority: 'high',
    category: 'billing',
    customer: {
      id: 101,
      name: 'Анна Петрова',
      email: 'anna.petrova@email.com',
      avatar: 'https://randomuser.me/api/portraits/women/1.jpg'
    },
    createdAt: '2026-01-31T10:30:00Z',
    updatedAt: '2026-01-31T10:30:00Z',
    messagesCount: 1,
    tags: ['payment', 'urgent', 'card']
  },
  {
    id: 2,
    title: 'Не приходят уведомления на email',
    description: 'Уже неделю не получаю уведомления о новых заказах на почту. Проверил спам - там тоже нет. Настройки уведомлений включены.',
    status: 'in_progress',
    priority: 'medium',
    category: 'technical',
    customer: {
      id: 102,
      name: 'Михаил Сидоров',
      email: 'mikhail.sidorov@email.com',
      avatar: 'https://randomuser.me/api/portraits/men/2.jpg'
    },
    assignedAdmin: {
      id: 1,
      name: 'Елена Админова',
      avatar: 'https://randomuser.me/api/portraits/women/10.jpg'
    },
    createdAt: '2026-01-30T14:15:00Z',
    updatedAt: '2026-01-31T09:20:00Z',
    lastMessageAt: '2026-01-31T09:20:00Z',
    messagesCount: 5,
    tags: ['email', 'notifications', 'settings']
  },
  {
    id: 3,
    title: 'Заблокирован аккаунт без причины',
    description: 'Вчера зашел в личный кабинет, а сегодня пишет что аккаунт заблокирован. Никаких нарушений не было, все заказы выполнял качественно.',
    status: 'open',
    priority: 'urgent',
    category: 'account',
    customer: {
      id: 103,
      name: 'Дмитрий Козлов',
      email: 'dmitry.kozlov@email.com',
      avatar: 'https://randomuser.me/api/portraits/men/3.jpg'
    },
    createdAt: '2026-01-31T08:45:00Z',
    updatedAt: '2026-01-31T08:45:00Z',
    messagesCount: 1,
    tags: ['account', 'blocked', 'urgent']
  },
  {
    id: 4,
    title: 'Как изменить специализацию эксперта?',
    description: 'Хочу добавить еще одну специализацию к своему профилю эксперта. Не могу найти эту опцию в настройках. Подскажите, пожалуйста, как это сделать.',
    status: 'completed',
    priority: 'low',
    category: 'general',
    customer: {
      id: 104,
      name: 'Ольга Иванова',
      email: 'olga.ivanova@email.com',
      avatar: 'https://randomuser.me/api/portraits/women/4.jpg'
    },
    assignedAdmin: {
      id: 2,
      name: 'Алексей Модератор',
      avatar: 'https://randomuser.me/api/portraits/men/11.jpg'
    },
    createdAt: '2026-01-29T16:20:00Z',
    updatedAt: '2026-01-30T11:30:00Z',
    lastMessageAt: '2026-01-30T11:30:00Z',
    messagesCount: 3,
    tags: ['expert', 'profile', 'help']
  },
  {
    id: 5,
    title: 'Ошибка при загрузке файлов',
    description: 'При попытке загрузить файлы к заказу появляется ошибка 500. Файлы небольшие, формат PDF и DOCX. Пробовал с разных браузеров.',
    status: 'in_progress',
    priority: 'medium',
    category: 'technical',
    customer: {
      id: 105,
      name: 'Сергей Волков',
      email: 'sergey.volkov@email.com',
      avatar: 'https://randomuser.me/api/portraits/men/5.jpg'
    },
    assignedAdmin: {
      id: 1,
      name: 'Елена Админова',
      avatar: 'https://randomuser.me/api/portraits/women/10.jpg'
    },
    createdAt: '2026-01-31T12:10:00Z',
    updatedAt: '2026-01-31T13:45:00Z',
    lastMessageAt: '2026-01-31T13:45:00Z',
    messagesCount: 4,
    tags: ['upload', 'files', 'error', '500']
  },
  {
    id: 6,
    title: 'Вопрос по возврату средств',
    description: 'Эксперт не выполнил заказ в срок, хочу вернуть деньги. Как это сделать? В правилах написано что-то про 14 дней, но не очень понятно.',
    status: 'open',
    priority: 'medium',
    category: 'billing',
    customer: {
      id: 106,
      name: 'Мария Кузнецова',
      email: 'maria.kuznetsova@email.com',
      avatar: 'https://randomuser.me/api/portraits/women/6.jpg'
    },
    createdAt: '2026-01-31T15:20:00Z',
    updatedAt: '2026-01-31T15:20:00Z',
    messagesCount: 1,
    tags: ['refund', 'billing', 'deadline']
  },
  {
    id: 7,
    title: 'Проблема с чатом в заказе',
    description: 'В чате с экспертом не отправляются сообщения. Пишу, а они не доходят. Эксперт жалуется что не получает мои сообщения.',
    status: 'completed',
    priority: 'high',
    category: 'technical',
    customer: {
      id: 107,
      name: 'Владимир Смирнов',
      email: 'vladimir.smirnov@email.com',
      avatar: 'https://randomuser.me/api/portraits/men/7.jpg'
    },
    assignedAdmin: {
      id: 3,
      name: 'Мария Поддержка',
      avatar: 'https://randomuser.me/api/portraits/women/12.jpg'
    },
    createdAt: '2026-01-30T09:30:00Z',
    updatedAt: '2026-01-31T14:15:00Z',
    lastMessageAt: '2026-01-31T14:15:00Z',
    messagesCount: 6,
    tags: ['chat', 'messages', 'communication']
  },
  {
    id: 8,
    title: 'Не могу войти в аккаунт',
    description: 'Забыл пароль, пытаюсь восстановить через email, но письмо не приходит. Проверил спам, все папки - ничего нет.',
    status: 'open',
    priority: 'high',
    category: 'account',
    customer: {
      id: 108,
      name: 'Татьяна Морозова',
      email: 'tatiana.morozova@email.com',
      avatar: 'https://randomuser.me/api/portraits/women/8.jpg'
    },
    createdAt: '2026-01-31T16:45:00Z',
    updatedAt: '2026-01-31T16:45:00Z',
    messagesCount: 1,
    tags: ['password', 'recovery', 'email']
  }
];

export const mockSupportMessages: SupportMessage[] = [
  {
    id: 1,
    requestId: 2,
    senderId: 102,
    senderType: 'customer',
    senderName: 'Михаил Сидоров',
    senderAvatar: 'https://randomuser.me/api/portraits/men/2.jpg',
    content: 'Уже неделю не получаю уведомления о новых заказах на почту.',
    type: 'text',
    createdAt: '2026-01-30T14:15:00Z',
    isRead: true
  },
  {
    id: 2,
    requestId: 2,
    senderId: 1,
    senderType: 'admin',
    senderName: 'Елена Админова',
    senderAvatar: 'https://randomuser.me/api/portraits/women/10.jpg',
    content: 'Здравствуйте! Проверим настройки уведомлений в вашем аккаунте.',
    type: 'text',
    createdAt: '2026-01-30T14:30:00Z',
    isRead: true
  },
  {
    id: 3,
    requestId: 2,
    senderId: 102,
    senderType: 'customer',
    senderName: 'Михаил Сидоров',
    senderAvatar: 'https://randomuser.me/api/portraits/men/2.jpg',
    content: 'Настройки включены, проверил несколько раз.',
    type: 'text',
    createdAt: '2026-01-30T15:00:00Z',
    isRead: true
  },
  {
    id: 4,
    requestId: 2,
    senderId: 1,
    senderType: 'admin',
    senderName: 'Елена Админова',
    senderAvatar: 'https://randomuser.me/api/portraits/women/10.jpg',
    content: 'Проверили на сервере - есть проблема с отправкой писем. Исправляем.',
    type: 'text',
    createdAt: '2026-01-31T09:00:00Z',
    isRead: true
  },
  {
    id: 5,
    requestId: 2,
    senderId: 1,
    senderType: 'admin',
    senderName: 'Елена Админова',
    senderAvatar: 'https://randomuser.me/api/portraits/women/10.jpg',
    content: 'Проблема решена! Уведомления должны приходить в течение часа.',
    type: 'text',
    createdAt: '2026-01-31T09:20:00Z',
    isRead: false
  }
];

export const mockAdminChats: AdminChat[] = [
  {
    id: 1,
    type: 'general',
    name: 'Общий чат администраторов',
    participants: [
      {
        id: 1,
        name: 'Елена Админова',
        avatar: 'https://randomuser.me/api/portraits/women/10.jpg',
        role: 'Старший администратор',
        isOnline: true
      },
      {
        id: 2,
        name: 'Алексей Модератор',
        avatar: 'https://randomuser.me/api/portraits/men/11.jpg',
        role: 'Модератор',
        isOnline: true
      },
      {
        id: 3,
        name: 'Мария Поддержка',
        avatar: 'https://randomuser.me/api/portraits/women/12.jpg',
        role: 'Специалист поддержки',
        isOnline: false
      },
      {
        id: 4,
        name: 'Игорь Техподдержка',
        avatar: 'https://randomuser.me/api/portraits/men/13.jpg',
        role: 'Технический специалист',
        isOnline: true
      }
    ],
    lastMessage: {
      content: 'Добавил новые правила модерации в документацию',
      senderName: 'Алексей Модератор',
      createdAt: '2026-01-31T14:20:00Z'
    },
    unreadCount: 2,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 2,
    type: 'private',
    name: 'Елена Админова',
    participants: [
      {
        id: 1,
        name: 'Елена Админова',
        avatar: 'https://randomuser.me/api/portraits/women/10.jpg',
        role: 'Старший администратор',
        isOnline: true
      }
    ],
    lastMessage: {
      content: 'Можешь помочь с проблемным заказом #1234?',
      senderName: 'Елена Админова',
      createdAt: '2026-01-31T13:15:00Z'
    },
    unreadCount: 1,
    createdAt: '2026-01-25T10:30:00Z'
  },
  {
    id: 3,
    type: 'private',
    name: 'Мария Поддержка',
    participants: [
      {
        id: 3,
        name: 'Мария Поддержка',
        avatar: 'https://randomuser.me/api/portraits/women/12.jpg',
        role: 'Специалист поддержки',
        isOnline: false
      }
    ],
    lastMessage: {
      content: 'Спасибо за помощь с клиентом!',
      senderName: 'Мария Поддержка',
      createdAt: '2026-01-31T11:45:00Z'
    },
    unreadCount: 0,
    createdAt: '2026-01-28T16:20:00Z'
  }
];

export const mockChatMessages: ChatMessage[] = [
  {
    id: 1,
    chatId: 1,
    senderId: 2,
    senderName: 'Алексей Модератор',
    senderAvatar: 'https://randomuser.me/api/portraits/men/11.jpg',
    content: 'Всем привет! Обновил правила модерации контента.',
    type: 'text',
    createdAt: '2026-01-31T10:00:00Z',
    isRead: true
  },
  {
    id: 2,
    chatId: 1,
    senderId: 1,
    senderName: 'Елена Админова',
    senderAvatar: 'https://randomuser.me/api/portraits/women/10.jpg',
    content: 'Отлично! Где можно посмотреть изменения?',
    type: 'text',
    createdAt: '2026-01-31T10:15:00Z',
    isRead: true
  },
  {
    id: 3,
    chatId: 1,
    senderId: 2,
    senderName: 'Алексей Модератор',
    senderAvatar: 'https://randomuser.me/api/portraits/men/11.jpg',
    content: 'В разделе документации, добавил ссылку в общий канал.',
    type: 'text',
    createdAt: '2026-01-31T10:30:00Z',
    isRead: true
  },
  {
    id: 4,
    chatId: 1,
    senderId: 4,
    senderName: 'Игорь Техподдержка',
    senderAvatar: 'https://randomuser.me/api/portraits/men/13.jpg',
    content: 'Кстати, исправил баг с уведомлениями по email.',
    type: 'text',
    createdAt: '2026-01-31T12:00:00Z',
    isRead: true
  },
  {
    id: 5,
    chatId: 1,
    senderId: 2,
    senderName: 'Алексей Модератор',
    senderAvatar: 'https://randomuser.me/api/portraits/men/11.jpg',
    content: 'Добавил новые правила модерации в документацию',
    type: 'text',
    createdAt: '2026-01-31T14:20:00Z',
    isRead: false
  }
];

export const mockSupportStats: SupportStats = {
  openRequests: 4,
  inProgressRequests: 2,
  completedToday: 3,
  averageResponseTime: 45, 
  customerSatisfaction: 94.5 
};


export const getSupportRequestsByStatus = (status: 'open' | 'in_progress' | 'completed'): SupportRequest[] => {
  return mockSupportRequests.filter(request => request.status === status);
};

export const getSupportRequestById = (id: number): SupportRequest | undefined => {
  return mockSupportRequests.find(request => request.id === id);
};

export const getMessagesByRequestId = (requestId: number): SupportMessage[] => {
  return mockSupportMessages.filter(message => message.requestId === requestId);
};

export const getChatById = (id: number): AdminChat | undefined => {
  return mockAdminChats.find(chat => chat.id === id);
};

export const getMessagesByChatId = (chatId: number): ChatMessage[] => {
  return mockChatMessages.filter(message => message.chatId === chatId);
};