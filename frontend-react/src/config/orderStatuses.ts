// Цвета статусов заказов
export const ORDER_STATUS_COLORS: Record<string, string> = {
  'new': 'green',
  'open': 'blue',
  'confirming': 'orange',
  'in_progress': 'cyan',
  'waiting_payment': 'gold',
  'awaiting_payment': 'gold',
  'review': 'purple',
  'under_review': 'purple',
  'completed': 'green',
  'revision': 'red',
  'awaiting_download': 'lime',
  'closed': 'default',
  'cancelled': 'red',
};

// Текстовые названия статусов заказов
export const ORDER_STATUS_TEXTS: Record<string, string> = {
  'new': 'NEW',
  'open': 'Открыт',
  'confirming': 'На подтверждении',
  'in_progress': 'На выполнении',
  'waiting_payment': 'Ожидает оплаты',
  'awaiting_payment': 'Ожидает оплаты',
  'review': 'На проверке',
  'under_review': 'На проверке',
  'completed': 'Выполнен',
  'revision': 'На доработке',
  'awaiting_download': 'Ожидает скачивания',
  'closed': 'Закрыт',
  'cancelled': 'Отменён',
};
