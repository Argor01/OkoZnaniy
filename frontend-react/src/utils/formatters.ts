


export const formatCurrency = (amount: number | string, currency: string = '₽'): string => {
  const numeric = typeof amount === 'number' ? amount : Number(String(amount).replace(',', '.'));
  const safe = Number.isFinite(numeric) ? numeric : 0;
  const rounded = Math.round(safe);
  return `${rounded.toLocaleString('ru-RU')} ${currency}`;
};

export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const formatDateTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatRelativeTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'только что';
  if (diffMins < 60) return `${diffMins} мин назад`;
  if (diffHours < 24) return `${diffHours} ч назад`;
  if (diffDays < 7) return `${diffDays} дн назад`;
  return formatDate(d);
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const formatUserName = (user: {
  id?: number | string;
  first_name?: string;
  last_name?: string;
  username?: string;
  email?: string;
}): string => {
  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`;
  }
  if (user.first_name) return user.first_name;
  return getDisplayUsername(user);
};

export const isEmailLike = (value?: string | null): boolean => {
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
};

const getStableAnonymousNumber = (user: {
  id?: number | string;
  username?: string | null;
  email?: string | null;
}): number => {
  const seedSource = `${user.id ?? ''}|${user.username ?? ''}|${user.email ?? ''}` || 'user';
  let hash = 0;

  for (let i = 0; i < seedSource.length; i += 1) {
    hash = (hash * 31 + seedSource.charCodeAt(i)) >>> 0;
  }

  // 1000-9999: короткий номер без раскрытия реального ID.
  return 1000 + (hash % 9000);
};

export const getDisplayUsername = (user: {
  id?: number | string;
  username?: string | null;
  email?: string | null;
}): string => {
  const username = user.username?.trim();
  if (username && !isEmailLike(username)) {
    return username;
  }

  return `User${getStableAnonymousNumber(user)}`;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Б';
  const k = 1024;
  const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};
