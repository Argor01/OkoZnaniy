/**
 * Утилиты для валидации данных в админ-панели
 */

/**
 * Валидация email
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Валидация телефона
 */
export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^(\+7|8)?[\s-]?\(?[489][0-9]{2}\)?[\s-]?[0-9]{3}[\s-]?[0-9]{2}[\s-]?[0-9]{2}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

/**
 * Валидация пароля
 */
export const validatePassword = (password: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Пароль должен содержать минимум 8 символов');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Пароль должен содержать заглавную букву');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Пароль должен содержать строчную букву');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Пароль должен содержать цифру');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Валидация суммы
 */
export const validateAmount = (amount: string | number): boolean => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return !isNaN(num) && num > 0;
};

/**
 * Валидация процента
 */
export const validatePercent = (percent: string | number): boolean => {
  const num = typeof percent === 'string' ? parseFloat(percent) : percent;
  return !isNaN(num) && num >= 0 && num <= 100;
};

/**
 * Валидация URL
 */
export const validateUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Валидация обязательного поля
 */
export const validateRequired = (value: any): boolean => {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return value !== null && value !== undefined;
};

/**
 * Валидация длины строки
 */
export const validateLength = (
  value: string, 
  min: number = 0, 
  max: number = Infinity
): boolean => {
  return value.length >= min && value.length <= max;
};

/**
 * Валидация формы пользователя
 */
export const validateUserForm = (data: {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  if (!validateRequired(data.email)) {
    errors.email = 'Email обязателен';
  } else if (!validateEmail(data.email)) {
    errors.email = 'Некорректный email';
  }
  
  if (!validateRequired(data.firstName)) {
    errors.firstName = 'Имя обязательно';
  } else if (!validateLength(data.firstName, 2, 50)) {
    errors.firstName = 'Имя должно быть от 2 до 50 символов';
  }
  
  if (!validateRequired(data.lastName)) {
    errors.lastName = 'Фамилия обязательна';
  } else if (!validateLength(data.lastName, 2, 50)) {
    errors.lastName = 'Фамилия должна быть от 2 до 50 символов';
  }
  
  if (data.phone && !validatePhone(data.phone)) {
    errors.phone = 'Некорректный номер телефона';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
