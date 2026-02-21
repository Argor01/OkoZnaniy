


export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};


export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^(\+7|8)?[\s-]?\(?[0-9]{3}\)?[\s-]?[0-9]{3}[\s-]?[0-9]{2}[\s-]?[0-9]{2}$/;
  return phoneRegex.test(phone);
};


export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};


export const isValidPassword = (password: string): boolean => {
  return password.length >= 8 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
};


export const isEmpty = (value: string): boolean => {
  return !value || value.trim().length === 0;
};


export const isInRange = (value: number, min: number, max: number): boolean => {
  return value >= min && value <= max;
};


export const isMaxLength = (value: string, maxLength: number): boolean => {
  return value.length <= maxLength;
};


export const isMinLength = (value: string, minLength: number): boolean => {
  return value.length >= minLength;
};
