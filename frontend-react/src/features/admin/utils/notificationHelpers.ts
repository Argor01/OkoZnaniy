

import { notification } from 'antd';
import type { NotificationPlacement } from 'antd/es/notification/interface';


const NOTIFICATION_CONFIG = {
  duration: 4.5,
  placement: 'topRight' as NotificationPlacement,
  maxCount: 3,
};


export const showSuccessNotification = (
  message: string, 
  description?: string,
  duration?: number
) => {
  notification.success({
    message,
    description,
    duration: duration ?? NOTIFICATION_CONFIG.duration,
    placement: NOTIFICATION_CONFIG.placement,
  });
};


export const showErrorNotification = (
  message: string, 
  description?: string,
  duration?: number
) => {
  notification.error({
    message,
    description,
    duration: duration ?? NOTIFICATION_CONFIG.duration,
    placement: NOTIFICATION_CONFIG.placement,
  });
};


export const showInfoNotification = (
  message: string, 
  description?: string,
  duration?: number
) => {
  notification.info({
    message,
    description,
    duration: duration ?? NOTIFICATION_CONFIG.duration,
    placement: NOTIFICATION_CONFIG.placement,
  });
};


export const showWarningNotification = (
  message: string, 
  description?: string,
  duration?: number
) => {
  notification.warning({
    message,
    description,
    duration: duration ?? NOTIFICATION_CONFIG.duration,
    placement: NOTIFICATION_CONFIG.placement,
  });
};


export const requestNotifications = {
  takeSuccess: () => showSuccessNotification(
    'Запрос взят в работу',
    'Вы успешно взяли запрос в работу'
  ),
  
  takeError: (error?: string) => showErrorNotification(
    'Ошибка при взятии запроса',
    error || 'Не удалось взять запрос в работу'
  ),
  
  completeSuccess: () => showSuccessNotification(
    'Запрос завершен',
    'Запрос успешно завершен'
  ),
  
  completeError: (error?: string) => showErrorNotification(
    'Ошибка при завершении запроса',
    error || 'Не удалось завершить запрос'
  ),
  
  messageSuccess: () => showSuccessNotification(
    'Сообщение отправлено',
    'Ваше сообщение успешно отправлено'
  ),
  
  messageError: (error?: string) => showErrorNotification(
    'Ошибка при отправке сообщения',
    error || 'Не удалось отправить сообщение'
  ),
  
  updateSuccess: () => showSuccessNotification(
    'Запрос обновлен',
    'Информация о запросе успешно обновлена'
  ),
  
  updateError: (error?: string) => showErrorNotification(
    'Ошибка при обновлении запроса',
    error || 'Не удалось обновить запрос'
  ),
  
  assignSuccess: (adminName: string) => showSuccessNotification(
    'Запрос назначен',
    `Запрос успешно назначен администратору ${adminName}`
  ),
  
  assignError: (error?: string) => showErrorNotification(
    'Ошибка при назначении запроса',
    error || 'Не удалось назначить запрос'
  ),
  
  fileUploadSuccess: (fileName: string) => showSuccessNotification(
    'Файл загружен',
    `Файл "${fileName}" успешно загружен`
  ),
  
  fileUploadError: (fileName: string, error?: string) => showErrorNotification(
    'Ошибка при загрузке файла',
    `Не удалось загрузить файл "${fileName}": ${error || 'неизвестная ошибка'}`
  ),
  
  newRequest: (requestTitle: string) => showInfoNotification(
    'Новый запрос',
    `Поступил новый запрос: "${requestTitle}"`,
    6
  ),
  
  requestAssigned: (requestTitle: string) => showInfoNotification(
    'Запрос назначен вам',
    `Вам назначен запрос: "${requestTitle}"`,
    6
  ),
  
  priorityChanged: (requestTitle: string, newPriority: string) => showWarningNotification(
    'Изменен приоритет запроса',
    `Приоритет запроса "${requestTitle}" изменен на "${newPriority}"`
  ),
};

export const chatNotifications = {
  messageSuccess: () => showSuccessNotification(
    'Сообщение отправлено',
    'Ваше сообщение успешно отправлено в чат'
  ),
  
  messageError: (error?: string) => showErrorNotification(
    'Ошибка при отправке сообщения',
    error || 'Не удалось отправить сообщение в чат'
  ),
  
  chatCreated: (chatName: string) => showSuccessNotification(
    'Чат создан',
    `Чат "${chatName}" успешно создан`
  ),
  
  chatCreateError: (error?: string) => showErrorNotification(
    'Ошибка при создании чата',
    error || 'Не удалось создать чат'
  ),
  
  joinedChat: (chatName: string) => showSuccessNotification(
    'Присоединились к чату',
    `Вы присоединились к чату "${chatName}"`
  ),
  
  leftChat: (chatName: string) => showInfoNotification(
    'Покинули чат',
    `Вы покинули чат "${chatName}"`
  ),
  
  newMessage: (senderName: string, chatName: string) => showInfoNotification(
    'Новое сообщение',
    `${senderName} написал в чате "${chatName}"`,
    3
  ),
  
  userJoined: (userName: string, chatName: string) => showInfoNotification(
    'Новый участник',
    `${userName} присоединился к чату "${chatName}"`,
    3
  ),
  
  userLeft: (userName: string, chatName: string) => showInfoNotification(
    'Участник покинул чат',
    `${userName} покинул чат "${chatName}"`,
    3
  ),
};

export const systemNotifications = {
  connectionLost: () => showWarningNotification(
    'Соединение потеряно',
    'Проверьте подключение к интернету. Попытка переподключения...',
    0
  ),
  
  connectionRestored: () => showSuccessNotification(
    'Соединение восстановлено',
    'Подключение к серверу восстановлено'
  ),
  
  sessionExpired: () => showErrorNotification(
    'Сессия истекла',
    'Ваша сессия истекла. Необходимо войти в систему заново',
    0
  ),
  
  maintenanceMode: () => showWarningNotification(
    'Техническое обслуживание',
    'Система находится в режиме технического обслуживания',
    0
  ),
  
  updateAvailable: () => showInfoNotification(
    'Доступно обновление',
    'Доступна новая версия системы. Обновите страницу для применения изменений',
    10
  ),
};

export const fileNotifications = {
  uploadStart: (fileName: string) => showInfoNotification(
    'Загрузка файла',
    `Начата загрузка файла "${fileName}"`,
    2
  ),
  
  uploadProgress: (fileName: string, progress: number) => {


    console.log(`Upload progress for ${fileName}: ${progress}%`);
  },
  
  uploadSuccess: (fileName: string) => showSuccessNotification(
    'Файл загружен',
    `Файл "${fileName}" успешно загружен`
  ),
  
  uploadError: (fileName: string, error?: string) => showErrorNotification(
    'Ошибка загрузки',
    `Не удалось загрузить файл "${fileName}": ${error || 'неизвестная ошибка'}`
  ),
  
  downloadStart: (fileName: string) => showInfoNotification(
    'Скачивание файла',
    `Начато скачивание файла "${fileName}"`,
    2
  ),
  
  downloadError: (fileName: string) => showErrorNotification(
    'Ошибка скачивания',
    `Не удалось скачать файл "${fileName}"`
  ),
  
  fileTooLarge: (fileName: string, maxSize: string) => showErrorNotification(
    'Файл слишком большой',
    `Файл "${fileName}" превышает максимальный размер ${maxSize}`
  ),
  
  invalidFileType: (fileName: string) => showErrorNotification(
    'Недопустимый тип файла',
    `Файл "${fileName}" имеет недопустимый тип`
  ),
};

export const closeAllNotifications = () => {
  notification.destroy();
};

export const configureNotifications = (config: {
  duration?: number;
  placement?: NotificationPlacement;
  maxCount?: number;
}) => {
  notification.config({
    duration: config.duration ?? NOTIFICATION_CONFIG.duration,
    placement: config.placement ?? NOTIFICATION_CONFIG.placement,
    maxCount: config.maxCount ?? NOTIFICATION_CONFIG.maxCount,
  });
};
