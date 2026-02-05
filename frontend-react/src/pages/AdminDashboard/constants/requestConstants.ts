/**
 * Константы для системы обработки запросов клиентов
 */

import type { RequestStatus, RequestPriority, RequestCategory } from '../types/requests.types';

// Статусы запросов
export const REQUEST_STATUSES: Record<RequestStatus, string> = {
  open: 'Открыт',
  in_progress: 'В работе',
  completed: 'Выполнен',
  closed: 'Закрыт',
};

// Приоритеты запросов
export const REQUEST_PRIORITIES: Record<RequestPriority, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  urgent: 'Срочный',
};

// Категории запросов
export const REQUEST_CATEGORIES: Record<RequestCategory, string> = {
  technical: 'Техническая поддержка',
  billing: 'Вопросы по оплате',
  account: 'Проблемы с аккаунтом',
  order: 'Вопросы по заказам',
  general: 'Общие вопросы',
};

// Цвета для статусов
export const REQUEST_STATUS_COLORS: Record<RequestStatus, string> = {
  open: '#1890ff',      // Синий
  in_progress: '#faad14', // Оранжевый
  completed: '#52c41a',   // Зеленый
  closed: '#8c8c8c',      // Серый
};

// Цвета для приоритетов
export const REQUEST_PRIORITY_COLORS: Record<RequestPriority, string> = {
  low: '#8c8c8c',       // Серый
  medium: '#1890ff',    // Синий
  high: '#faad14',      // Оранжевый
  urgent: '#ff4d4f',    // Красный
};

// Цвета для категорий
export const REQUEST_CATEGORY_COLORS: Record<RequestCategory, string> = {
  technical: '#722ed1',  // Фиолетовый
  billing: '#13c2c2',    // Бирюзовый
  account: '#52c41a',    // Зеленый
  order: '#faad14',      // Оранжевый
  general: '#1890ff',    // Синий
};

// Опции для фильтров
export const STATUS_FILTER_OPTIONS = Object.entries(REQUEST_STATUSES).map(([value, label]) => ({
  value,
  label,
}));

export const PRIORITY_FILTER_OPTIONS = Object.entries(REQUEST_PRIORITIES).map(([value, label]) => ({
  value,
  label,
}));

export const CATEGORY_FILTER_OPTIONS = Object.entries(REQUEST_CATEGORIES).map(([value, label]) => ({
  value,
  label,
}));

// Порядок приоритетов для сортировки
export const PRIORITY_ORDER: Record<RequestPriority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

// Настройки пагинации
export const REQUEST_PAGINATION_CONFIG = {
  defaultPageSize: 20,
  pageSizeOptions: ['10', '20', '50', '100'],
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number, range: [number, number]) => 
    `${range[0]}-${range[1]} из ${total} запросов`,
};

// Настройки автообновления
export const AUTO_REFRESH_INTERVALS = {
  requests: 30000,      // 30 секунд для списка запросов
  messages: 5000,       // 5 секунд для сообщений
  chats: 10000,         // 10 секунд для чатов
  stats: 60000,         // 1 минута для статистики
};

// Лимиты для файлов
export const FILE_UPLOAD_LIMITS = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ],
  maxFiles: 5,
};

// Сообщения для пользователя
export const REQUEST_MESSAGES = {
  takeSuccess: 'Запрос успешно взят в работу',
  takeError: 'Ошибка при взятии запроса в работу',
  completeSuccess: 'Запрос успешно завершен',
  completeError: 'Ошибка при завершении запроса',
  messageSuccess: 'Сообщение отправлено',
  messageError: 'Ошибка при отправке сообщения',
  fileUploadSuccess: 'Файл успешно загружен',
  fileUploadError: 'Ошибка при загрузке файла',
  fileSizeError: 'Размер файла превышает допустимый лимит',
  fileTypeError: 'Недопустимый тип файла',
};

// Шаблоны системных сообщений
export const SYSTEM_MESSAGE_TEMPLATES = {
  requestTaken: (adminName: string) => `Запрос взят в работу администратором ${adminName}`,
  requestCompleted: (adminName: string) => `Запрос завершен администратором ${adminName}`,
  requestAssigned: (adminName: string) => `Запрос назначен администратору ${adminName}`,
  priorityChanged: (oldPriority: string, newPriority: string) => 
    `Приоритет изменен с "${oldPriority}" на "${newPriority}"`,
  statusChanged: (oldStatus: string, newStatus: string) => 
    `Статус изменен с "${oldStatus}" на "${newStatus}"`,
};

// Настройки уведомлений
export const NOTIFICATION_SETTINGS = {
  duration: 4.5, // секунды
  placement: 'topRight' as const,
  maxCount: 3,
};