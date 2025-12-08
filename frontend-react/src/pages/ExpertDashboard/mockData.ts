// Моковые данные для ExpertDashboard
import {
  FileDoneOutlined,
  CheckCircleOutlined,
  TrophyOutlined,
  CommentOutlined,
  QuestionCircleOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import type { Notification, ArbitrationCase, ChatMessage } from './types';

export const mockNotifications: Notification[] = [
  {
    id: 1,
    type: 'order',
    title: 'Новый заказ доступен',
    message: 'Появился новый заказ по математике. Срок выполнения: 3 дня. Бюджет: 5000₽',
    timestamp: '2 минуты назад',
    isRead: false,
    icon: <FileDoneOutlined style={{ color: '#3b82f6' }} />,
  },
  {
    id: 2,
    type: 'order',
    title: 'Заказ принят',
    message: 'Ваша ставка на заказ "Решение задач по физике" была принята заказчиком',
    timestamp: '1 час назад',
    isRead: false,
    icon: <CheckCircleOutlined style={{ color: '#10b981' }} />,
  },
  {
    id: 3,
    type: 'claim',
    title: 'Новая претензия',
    message: 'Заказчик открыл претензию по заказу #1234. Требуется ваш ответ',
    timestamp: '3 часа назад',
    isRead: true,
    icon: <TrophyOutlined style={{ color: '#f59e0b' }} />,
  },
];

export const mockArbitrationCases: ArbitrationCase[] = [
  {
    id: 1,
    orderId: 1234,
    orderTitle: 'Решение задач по высшей математике',
    clientName: 'Иван Петров',
    status: 'pending',
    reason: 'Несоответствие качества работы',
    description: 'Заказчик утверждает, что решения задач содержат ошибки',
    createdAt: '2 дня назад',
    updatedAt: '1 день назад',
    amount: 5000,
    documents: ['solution.pdf', 'requirements.docx'],
  },
];

export const mockMessages: ChatMessage[] = [
  {
    id: 1,
    chatId: 1,
    userName: 'Иван Петров',
    userAvatar: undefined,
    lastMessage: 'Здравствуйте! Когда будет готова работа?',
    timestamp: '2 мин назад',
    isRead: false,
    isOnline: true,
    unreadCount: 3,
    messages: [
      {
        id: 1,
        text: 'Здравствуйте! Я хотел бы заказать решение задач',
        timestamp: '10:30',
        isMine: false,
        isRead: true,
      },
      {
        id: 2,
        text: 'Здравствуйте! Конечно, пришлите задание',
        timestamp: '10:32',
        isMine: true,
        isRead: true,
      },
    ],
  },
];
