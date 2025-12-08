// Вспомогательные функции для ExpertDashboard

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'new':
      return 'blue';
    case 'in_progress':
      return 'orange';
    case 'review':
      return 'purple';
    case 'revision':
      return 'magenta';
    case 'completed':
      return 'green';
    case 'cancelled':
      return 'red';
    default:
      return 'default';
  }
};

export const getStatusText = (status: string) => {
  switch (status) {
    case 'new':
      return 'Создан';
    case 'in_progress':
      return 'В работе';
    case 'review':
      return 'На проверке';
    case 'revision':
      return 'На доработке';
    case 'completed':
      return 'Завершен';
    case 'cancelled':
      return 'Отменен';
    default:
      return status;
  }
};

export const translateError = (error: string): string => {
  return String(error)
    .replace('This field is required', 'Это поле обязательно для заполнения')
    .replace('This field may not be blank', 'Это поле не может быть пустым')
    .replace('A valid integer is required', 'Введите корректное целое число')
    .replace('Ensure this value is greater than or equal to 0', 'Значение должно быть больше или равно 0')
    .replace('Ensure this value is less than or equal to 2100', 'Значение должно быть меньше или равно 2100')
    .replace('Not a valid string', 'Некорректная строка')
    .replace('This list may not be empty', 'Список не может быть пустым')
    .replace('Invalid input.', 'Некорректные данные')
    .replace('Expected a list of items but got type', 'Ожидается список элементов')
    .replace('Enter a valid URL.', 'Введите корректную ссылку')
    .replace('Enter a valid email address.', 'Введите корректный email')
    .replace('You do not have permission to perform this action.', 'Недостаточно прав для выполнения действия')
    .replace('Internal Server Error', 'Внутренняя ошибка сервера')
    .replace('Network Error', 'Ошибка сети')
    .replace(/Request failed with status code (\d+)/, (_match, p1) => `Ошибка сервера (${p1}). Попробуйте позже`);
};
