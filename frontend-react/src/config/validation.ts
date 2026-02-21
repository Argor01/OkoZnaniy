


export const VALIDATION_LIMITS = {
  order: {
    titleMinLength: 5,
    titleMaxLength: 200,
    descriptionMinLength: 20,
    descriptionMaxLength: 5000,
    budgetMin: 1,
    budgetMax: 1000000,
    budgetStep: 100,
  },
  user: {
    usernameMinLength: 3,
    usernameMaxLength: 30,
    passwordMinLength: 8,
    passwordMaxLength: 128,
    firstNameMaxLength: 50,
    lastNameMaxLength: 50,
    bioMaxLength: 1000,
  },
  review: {
    commentMinLength: 10,
    commentMaxLength: 1000,
    ratingMin: 1,
    ratingMax: 5,
  },
  message: {
    textMinLength: 1,
    textMaxLength: 2000,
  },
} as const;


export const REGEX_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^(\+7|8)?[\s-]?\(?[0-9]{3}\)?[\s-]?[0-9]{3}[\s-]?[0-9]{2}[\s-]?[0-9]{2}$/,
  username: /^[a-zA-Z0-9_-]+$/,
  url: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/,
} as const;


export const VALIDATION_MESSAGES = {
  required: 'Это поле обязательно для заполнения',
  email: 'Введите корректный email адрес',
  phone: 'Введите корректный номер телефона',
  username: 'Имя пользователя может содержать только буквы, цифры, дефис и подчеркивание',
  url: 'Введите корректный URL адрес',
  minLength: (min: number) => `Минимальная длина: ${min} символов`,
  maxLength: (max: number) => `Максимальная длина: ${max} символов`,
  minValue: (min: number) => `Минимальное значение: ${min}`,
  maxValue: (max: number) => `Максимальное значение: ${max}`,
  passwordMismatch: 'Пароли не совпадают',
  fileSize: (maxSize: number) => `Размер файла не должен превышать ${maxSize} МБ`,
  fileType: 'Неподдерживаемый тип файла',
} as const;
