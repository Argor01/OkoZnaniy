// Цвета статусов заказов
export const ORDER_STATUS_COLORS: Record<string, string> = {
  'open': 'blue',
  'confirming': 'orange',
  'in_progress': 'cyan',
  'awaiting_payment': 'gold',
  'under_review': 'purple',
  'completed': 'green',
  'revision': 'red',
  'awaiting_download': 'lime',
  'closed': 'default',
};

// Текстовые названия статусов заказов
export const ORDER_STATUS_TEXTS: Record<string, string> = {
  'open': 'Открыт',
  'confirming': 'На подтверждении',
  'in_progress': 'На выполнении',
  'awaiting_payment': 'Ожидает оплаты',
  'under_review': 'На проверке',
  'completed': 'Выполнен',
  'revision': 'На доработке',
  'awaiting_download': 'Ожидает скачивания',
  'closed': 'Закрыт',
};
