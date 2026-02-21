


export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};


export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^(\+7|8)?[\s-]?\(?[489][0-9]{2}\)?[\s-]?[0-9]{3}[\s-]?[0-9]{2}[\s-]?[0-9]{2}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};


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


export const validateAmount = (amount: string | number): boolean => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return !isNaN(num) && num > 0;
};


export const validatePercent = (percent: string | number): boolean => {
  const num = typeof percent === 'string' ? parseFloat(percent) : percent;
  return !isNaN(num) && num >= 0 && num <= 100;
};


export const validateUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};


export const validateRequired = (value: any): boolean => {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return value !== null && value !== undefined;
};


export const validateLength = (
  value: string, 
  min: number = 0, 
  max: number = Infinity
): boolean => {
  return value.length >= min && value.length <= max;
};


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
