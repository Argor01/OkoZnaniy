import React from 'react';
import {
  FileDoneOutlined,
  CheckCircleOutlined,
  TrophyOutlined,
  CommentOutlined,
  QuestionCircleOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { Notification, ArbitrationCase, ChatMessage } from './types';

export const mockNotifications: Notification[] = [
  {
    id: 1,
    type: 'order',
    title: 'Новый заказ доступен',
    message: 'Появился новый заказ по математике. Срок выполнения: 3 дня. Бюджет: 5000₽',
    timestamp: '2 минуты назад',
    isRead: false,
    icon: <FileDoneOutlined style={{ color: '#3b82f6' }} />
  },
  {
    id: 2,
    type: 'order',
    title: 'Заказ принят',
    message: 'Ваша ставка на заказ "Решение задач по физике" была принята заказчиком',
    timestamp: '1 час назад',
    isRead: false,
    icon: <CheckCircleOutlined style={{ color: '#10b981' }} />
  },
  {
    id: 3,
    type: 'claim',
    title: 'Новая претензия',
    message: 'Заказчик открыл претензию по заказу #1234. Требуется ваш ответ',
    timestamp: '3 часа назад',
    isRead: true,
    icon: <TrophyOutlined style={{ color: '#f59e0b' }} />
  },
  {
    id: 4,
    type: 'forum',
    title: 'Новый комментарий',
    message: 'Пользователь Иван ответил на ваш вопрос в форуме "Методы решения интегралов"',
    timestamp: '5 часов назад',
    isRead: true,
    icon: <CommentOutlined style={{ color: '#8b5cf6' }} />
  },
  {
    id: 5,
    type: 'question',
    title: 'Вопрос от заказчика',
    message: 'Заказчик задал вопрос по заказу "Курсовая работа по экономике"',
    timestamp: '1 день назад',
    isRead: true,
    icon: <QuestionCircleOutlined style={{ color: '#06b6d4' }} />
  },
  {
    id: 6,
    type: 'system',
    title: 'Обновление профиля',
    message: 'Ваш профиль успешно верифицирован. Теперь вы можете принимать больше заказов',
    timestamp: '2 дня назад',
    isRead: true,
    icon: <CheckCircleOutlined style={{ color: '#10b981' }} />
  },
  {
    id: 7,
    type: 'order',
    title: 'Заказ завершен',
    message: 'Заказ "Лабораторная работа по химии" успешно завершен. Средства зачислены на ваш счет',
    timestamp: '3 дня назад',
    isRead: true,
    icon: <DollarOutlined style={{ color: '#10b981' }} />
  },
  {
    id: 8,
    type: 'forum',
    title: 'Новая тема в форуме',
    message: 'Создана новая тема "Лучшие практики оформления дипломных работ"',
    timestamp: '4 дня назад',
    isRead: true,
    icon: <CommentOutlined style={{ color: '#8b5cf6' }} />
  }
];

export const mockArbitrationCases: ArbitrationCase[] = [
  {
    id: 1,
    orderId: 1234,
    orderTitle: 'Решение задач по высшей математике',
    clientName: 'Иван Петров',
    status: 'pending',
    reason: 'Несоответствие качества работы',
    description: 'Заказчик утверждает, что решения задач содержат ошибки и не соответствуют требованиям задания. Требует полного возврата средств.',
    createdAt: '2 дня назад',
    updatedAt: '1 день назад',
    amount: 5000,
    documents: ['solution.pdf', 'requirements.docx']
  },
  {
    id: 2,
    orderId: 1189,
    orderTitle: 'Курсовая работа по экономике',
    clientName: 'Мария Сидорова',
    status: 'in_review',
    reason: 'Нарушение сроков выполнения',
    description: 'Работа была сдана с опозданием на 3 дня. Заказчик требует компенсацию за нарушение сроков.',
    createdAt: '5 дней назад',
    updatedAt: '2 часа назад',
    amount: 8000,
    documents: ['coursework.pdf', 'chat_history.txt']
  },
  {
    id: 3,
    orderId: 1056,
    orderTitle: 'Лабораторная работа по физике',
    clientName: 'Алексей Смирнов',
    status: 'resolved',
    reason: 'Плагиат',
    description: 'Заказчик обнаружил, что часть работы была скопирована из интернета без указания источников.',
    createdAt: '10 дней назад',
    updatedAt: '3 дня назад',
    amount: 3500,
    decision: 'Арбитраж решен в пользу заказчика. Произведен частичный возврат средств (50%).',
    documents: ['lab_work.pdf', 'plagiarism_report.pdf']
  },
  {
    id: 4,
    orderId: 987,
    orderTitle: 'Дипломная работа по программированию',
    clientName: 'Елена Козлова',
    status: 'rejected',
    reason: 'Необоснованная претензия',
    description: 'Заказчик требовал дополнительные правки, не предусмотренные первоначальным заданием.',
    createdAt: '15 дней назад',
    updatedAt: '7 дней назад',
    amount: 15000,
    decision: 'Претензия отклонена. Работа выполнена в полном соответствии с техническим заданием.',
    documents: ['diploma.pdf', 'technical_requirements.docx', 'correspondence.txt']
  }
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
      { id: 1, text: 'Здравствуйте! Я хотел бы заказать решение задач по математике', timestamp: '10:30', isMine: false, isRead: true },
      { id: 2, text: 'Здравствуйте! Конечно, пришлите задание', timestamp: '10:32', isMine: true, isRead: true },
      { id: 3, text: 'Вот файл с заданием', timestamp: '10:35', isMine: false, isRead: true },
      { id: 4, text: 'Принял в работу. Срок выполнения - 2 дня', timestamp: '10:40', isMine: true, isRead: true },
      { id: 5, text: 'Отлично, спасибо!', timestamp: '10:42', isMine: false, isRead: true },
      { id: 6, text: 'Здравствуйте! Когда будет готова работа?', timestamp: '14:25', isMine: false, isRead: false }
    ]
  },
  {
    id: 2,
    chatId: 2,
    userName: 'Мария Сидорова',
    userAvatar: undefined,
    lastMessage: 'Спасибо за помощь! Все отлично',
    timestamp: '1 час назад',
    isRead: true,
    isOnline: false,
    unreadCount: 0,
    messages: [
      { id: 1, text: 'Добрый день! Нужна помощь с курсовой по экономике', timestamp: 'Вчера 15:20', isMine: false, isRead: true },
      { id: 2, text: 'Здравствуйте! Какая тема курсовой?', timestamp: 'Вчера 15:25', isMine: true, isRead: true },
      { id: 3, text: 'Макроэкономический анализ', timestamp: 'Вчера 15:30', isMine: false, isRead: true },
      { id: 4, text: 'Хорошо, могу помочь. Срок - неделя', timestamp: 'Вчера 15:35', isMine: true, isRead: true },
      { id: 5, text: 'Спасибо за помощь! Все отлично', timestamp: '1 час назад', isMine: false, isRead: true }
    ]
  },
  {
    id: 3,
    chatId: 3,
    userName: 'Алексей Смирнов',
    userAvatar: undefined,
    lastMessage: 'Можете взять еще один заказ?',
    timestamp: '3 часа назад',
    isRead: false,
    isOnline: true,
    unreadCount: 1,
    messages: [
      { id: 1, text: 'Здравствуйте! Вы делаете лабораторные по физике?', timestamp: 'Вчера 12:00', isMine: false, isRead: true },
      { id: 2, text: 'Да, конечно. Какая тема?', timestamp: 'Вчера 12:15', isMine: true, isRead: true },
      { id: 3, text: 'Механика, колебания', timestamp: 'Вчера 12:20', isMine: false, isRead: true },
      { id: 4, text: 'Хорошо, пришлите задание', timestamp: 'Вчера 12:25', isMine: true, isRead: true },
      { id: 5, text: 'Можете взять еще один заказ?', timestamp: '3 часа назад', isMine: false, isRead: false }
    ]
  },
  {
    id: 4,
    chatId: 4,
    userName: 'Елена Козлова',
    userAvatar: undefined,
    lastMessage: 'Хорошо, жду результат',
    timestamp: '5 часов назад',
    isRead: true,
    isOnline: false,
    unreadCount: 0,
    messages: [
      { id: 1, text: 'Добрый вечер! Нужна дипломная работа', timestamp: '2 дня назад', isMine: false, isRead: true },
      { id: 2, text: 'Здравствуйте! Какая специальность?', timestamp: '2 дня назад', isMine: true, isRead: true },
      { id: 3, text: 'Программирование, веб-разработка', timestamp: '2 дня назад', isMine: false, isRead: true },
      { id: 4, text: 'Хорошо, жду результат', timestamp: '5 часов назад', isMine: false, isRead: true }
    ]
  },
  {
    id: 5,
    chatId: 5,
    userName: 'Дмитрий Новиков',
    userAvatar: undefined,
    lastMessage: 'Отлично, договорились!',
    timestamp: '1 день назад',
    isRead: true,
    isOnline: false,
    unreadCount: 0,
    messages: [
      { id: 1, text: 'Здравствуйте! Нужна помощь с рефератом по истории', timestamp: '3 дня назад', isMine: false, isRead: true },
      { id: 2, text: 'Добрый день! Какая тема?', timestamp: '3 дня назад', isMine: true, isRead: true },
      { id: 3, text: 'Реформы Петра I', timestamp: '3 дня назад', isMine: false, isRead: true },
      { id: 4, text: 'Отлично, договорились!', timestamp: '1 день назад', isMine: false, isRead: true }
    ]
  }
];
