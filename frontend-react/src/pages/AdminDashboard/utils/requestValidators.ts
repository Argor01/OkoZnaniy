

import type { 
  CreateRequestForm, 
  UpdateRequestForm, 
  SendMessageForm 
} from '../types/requests.types';


export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}


export const validateCreateRequest = (data: Partial<CreateRequestForm>): ValidationResult => {
  const errors: Record<string, string> = {};

  
  if (!data.title || data.title.trim().length === 0) {
    errors.title = 'Заголовок обязателен для заполнения';
  } else if (data.title.trim().length < 5) {
    errors.title = 'Заголовок должен содержать минимум 5 символов';
  } else if (data.title.trim().length > 200) {
    errors.title = 'Заголовок не должен превышать 200 символов';
  }

  
  if (!data.description || data.description.trim().length === 0) {
    errors.description = 'Описание обязательно для заполнения';
  } else if (data.description.trim().length < 10) {
    errors.description = 'Описание должно содержать минимум 10 символов';
  } else if (data.description.trim().length > 5000) {
    errors.description = 'Описание не должно превышать 5000 символов';
  }

  
  if (!data.category) {
    errors.category = 'Категория обязательна для выбора';
  } else if (!['technical', 'billing', 'account', 'order', 'general'].includes(data.category)) {
    errors.category = 'Недопустимая категория';
  }

  
  if (!data.priority) {
    errors.priority = 'Приоритет обязателен для выбора';
  } else if (!['low', 'medium', 'high', 'urgent'].includes(data.priority)) {
    errors.priority = 'Недопустимый приоритет';
  }

  
  if (!data.customerId || data.customerId <= 0) {
    errors.customerId = 'Необходимо выбрать клиента';
  }

  
  if (data.tags && data.tags.length > 10) {
    errors.tags = 'Максимальное количество тегов: 10';
  }

  if (data.tags) {
    for (const tag of data.tags) {
      if (tag.length > 50) {
        errors.tags = 'Длина тега не должна превышать 50 символов';
        break;
      }
      if (!/^[a-zA-Zа-яА-Я0-9\s\-_]+$/.test(tag)) {
        errors.tags = 'Теги могут содержать только буквы, цифры, пробелы, дефисы и подчеркивания';
        break;
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};


export const validateUpdateRequest = (data: Partial<UpdateRequestForm>): ValidationResult => {
  const errors: Record<string, string> = {};

  
  if (data.title !== undefined) {
    if (data.title.trim().length === 0) {
      errors.title = 'Заголовок не может быть пустым';
    } else if (data.title.trim().length < 5) {
      errors.title = 'Заголовок должен содержать минимум 5 символов';
    } else if (data.title.trim().length > 200) {
      errors.title = 'Заголовок не должен превышать 200 символов';
    }
  }

  
  if (data.description !== undefined) {
    if (data.description.trim().length === 0) {
      errors.description = 'Описание не может быть пустым';
    } else if (data.description.trim().length < 10) {
      errors.description = 'Описание должно содержать минимум 10 символов';
    } else if (data.description.trim().length > 5000) {
      errors.description = 'Описание не должно превышать 5000 символов';
    }
  }

  
  if (data.status !== undefined) {
    if (!['open', 'in_progress', 'completed', 'closed'].includes(data.status)) {
      errors.status = 'Недопустимый статус';
    }
  }

  
  if (data.priority !== undefined) {
    if (!['low', 'medium', 'high', 'urgent'].includes(data.priority)) {
      errors.priority = 'Недопустимый приоритет';
    }
  }

  
  if (data.category !== undefined) {
    if (!['technical', 'billing', 'account', 'order', 'general'].includes(data.category)) {
      errors.category = 'Недопустимая категория';
    }
  }

  
  if (data.assignedAdminId !== undefined && data.assignedAdminId <= 0) {
    errors.assignedAdminId = 'Недопустимый ID администратора';
  }

  
  if (data.tags !== undefined) {
    if (data.tags.length > 10) {
      errors.tags = 'Максимальное количество тегов: 10';
    }

    for (const tag of data.tags) {
      if (tag.length > 50) {
        errors.tags = 'Длина тега не должна превышать 50 символов';
        break;
      }
      if (!/^[a-zA-Zа-яА-Я0-9\s\-_]+$/.test(tag)) {
        errors.tags = 'Теги могут содержать только буквы, цифры, пробелы, дефисы и подчеркивания';
        break;
      }
    }
  }

  
  if (data.estimatedResolutionTime !== undefined) {
    const resolutionDate = new Date(data.estimatedResolutionTime);
    const now = new Date();
    
    if (isNaN(resolutionDate.getTime())) {
      errors.estimatedResolutionTime = 'Недопустимый формат даты';
    } else if (resolutionDate <= now) {
      errors.estimatedResolutionTime = 'Время решения должно быть в будущем';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};


export const validateSendMessage = (data: Partial<SendMessageForm>): ValidationResult => {
  const errors: Record<string, string> = {};

  
  if (!data.content || data.content.trim().length === 0) {
    errors.content = 'Сообщение не может быть пустым';
  } else if (data.content.trim().length > 10000) {
    errors.content = 'Сообщение не должно превышать 10000 символов';
  }

  
  if (data.isInternal !== undefined && typeof data.isInternal !== 'boolean') {
    errors.isInternal = 'Недопустимое значение для внутреннего сообщения';
  }

  
  if (data.attachments && data.attachments.length > 5) {
    errors.attachments = 'Максимальное количество файлов: 5';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};


export const validateFile = (file: File): FileValidationResult => {
  
  const maxSize = 10 * 1024 * 1024;
  
  
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    'application/zip',
    'application/x-rar-compressed',
  ];

  
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `Размер файла превышает допустимый лимит (${Math.round(maxSize / 1024 / 1024)}MB)`
    };
  }

  
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Недопустимый тип файла'
    };
  }

  
  if (file.name.length > 255) {
    return {
      isValid: false,
      error: 'Имя файла слишком длинное (максимум 255 символов)'
    };
  }

  
  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com'];
  const fileName = file.name.toLowerCase();
  
  for (const ext of dangerousExtensions) {
    if (fileName.endsWith(ext)) {
      return {
        isValid: false,
        error: 'Недопустимое расширение файла'
      };
    }
  }

  return { isValid: true };
};


export const validateFiles = (files: File[]): ValidationResult => {
  const errors: Record<string, string> = {};

  if (files.length === 0) {
    return { isValid: true, errors };
  }

  if (files.length > 5) {
    errors.files = 'Максимальное количество файлов: 5';
    return { isValid: false, errors };
  }

  
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const maxTotalSize = 50 * 1024 * 1024; 

  if (totalSize > maxTotalSize) {
    errors.files = `Общий размер файлов превышает допустимый лимит (${Math.round(maxTotalSize / 1024 / 1024)}MB)`;
    return { isValid: false, errors };
  }

  
  for (let i = 0; i < files.length; i++) {
    const fileValidation = validateFile(files[i]);
    if (!fileValidation.isValid) {
      errors.files = `Файл "${files[i].name}": ${fileValidation.error}`;
      return { isValid: false, errors };
    }
  }

  return { isValid: true, errors };
};


export const validateSearchQuery = (query: string): ValidationResult => {
  const errors: Record<string, string> = {};

  if (query.trim().length === 0) {
    errors.query = 'Поисковый запрос не может быть пустым';
  } else if (query.trim().length < 2) {
    errors.query = 'Поисковый запрос должен содержать минимум 2 символа';
  } else if (query.trim().length > 100) {
    errors.query = 'Поисковый запрос не должен превышать 100 символов';
  }

  
  if (/[<>"'%;()&+]/.test(query)) {
    errors.query = 'Поисковый запрос содержит недопустимые символы';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};


export const validateCreateChat = (data: {
  name?: string;
  type?: string;
  participantIds?: number[];
  description?: string;
}): ValidationResult => {
  const errors: Record<string, string> = {};

  
  if (!data.name || data.name.trim().length === 0) {
    errors.name = 'Название чата обязательно для заполнения';
  } else if (data.name.trim().length < 3) {
    errors.name = 'Название чата должно содержать минимум 3 символа';
  } else if (data.name.trim().length > 100) {
    errors.name = 'Название чата не должно превышать 100 символов';
  }

  
  if (!data.type) {
    errors.type = 'Тип чата обязателен для выбора';
  } else if (!['general', 'department', 'private'].includes(data.type)) {
    errors.type = 'Недопустимый тип чата';
  }

  
  if (!data.participantIds || data.participantIds.length === 0) {
    errors.participantIds = 'Необходимо выбрать хотя бы одного участника';
  } else if (data.participantIds.length > 50) {
    errors.participantIds = 'Максимальное количество участников: 50';
  }

  
  if (data.description && data.description.length > 500) {
    errors.description = 'Описание не должно превышать 500 символов';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};


export const validateDateRange = (dateFrom?: string, dateTo?: string): ValidationResult => {
  const errors: Record<string, string> = {};

  if (dateFrom && dateTo) {
    const from = new Date(dateFrom);
    const to = new Date(dateTo);

    if (isNaN(from.getTime())) {
      errors.dateFrom = 'Недопустимый формат даты начала';
    }

    if (isNaN(to.getTime())) {
      errors.dateTo = 'Недопустимый формат даты окончания';
    }

    if (!errors.dateFrom && !errors.dateTo && from >= to) {
      errors.dateRange = 'Дата начала должна быть раньше даты окончания';
    }

    
    if (!errors.dateFrom && !errors.dateTo && !errors.dateRange) {
      const diffMs = to.getTime() - from.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      
      if (diffDays > 365) {
        errors.dateRange = 'Диапазон дат не должен превышать один год';
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
