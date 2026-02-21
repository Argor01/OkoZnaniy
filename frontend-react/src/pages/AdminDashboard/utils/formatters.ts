


export const formatDate = (date: string | Date): string => {
  const d = new Date(date);
  return d.toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};


export const formatDateShort = (date: string | Date): string => {
  const d = new Date(date);
  return d.toLocaleDateString('ru-RU');
};


export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
};


export const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};


export const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};


export const formatFileSize = (bytes: number): string => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};


export const formatRelativeTime = (date: string | Date): string => {
  const now = new Date();
  const target = new Date(date);
  const diffMs = now.getTime() - target.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'только что';
  if (diffMins < 60) return `${diffMins} мин назад`;
  if (diffHours < 24) return `${diffHours} ч назад`;
  if (diffDays < 7) return `${diffDays} дн назад`;
  
  return formatDateShort(date);
};


export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};




export const getPriorityColor = (priority: string): string => {
  const colors = {
    urgent: 'red',
    high: 'orange', 
    medium: 'blue',
    low: 'default'
  };
  return colors[priority as keyof typeof colors] || 'default';
};


export const getStatusColor = (status: string): string => {
  const colors = {
    open: 'blue',
    in_progress: 'orange',
    completed: 'green',
    closed: 'default'
  };
  return colors[status as keyof typeof colors] || 'default';
};


export const getCategoryColor = (category: string): string => {
  const colors = {
    technical: 'purple',
    billing: 'cyan',
    account: 'green',
    order: 'orange',
    general: 'blue'
  };
  return colors[category as keyof typeof colors] || 'blue';
};


export const getCategoryLabel = (category: string): string => {
  const labels = {
    technical: 'Техническая',
    billing: 'Биллинг',
    account: 'Аккаунт',
    order: 'Заказ',
    general: 'Общая'
  };
  return labels[category as keyof typeof labels] || category;
};


export const getStatusLabel = (status: string): string => {
  const labels = {
    open: 'Открыт',
    in_progress: 'В работе',
    completed: 'Выполнен',
    closed: 'Закрыт'
  };
  return labels[status as keyof typeof labels] || status;
};


export const getPriorityLabel = (priority: string): string => {
  const labels = {
    low: 'Низкий',
    medium: 'Средний',
    high: 'Высокий',
    urgent: 'Срочный'
  };
  return labels[priority as keyof typeof labels] || priority;
};


export const formatResponseTime = (minutes: number): string => {
  if (minutes < 60) {
    return `${Math.round(minutes)} мин`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);
  
  if (hours < 24) {
    return remainingMinutes > 0 ? `${hours}ч ${remainingMinutes}м` : `${hours}ч`;
  }
  
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  
  return remainingHours > 0 ? `${days}д ${remainingHours}ч` : `${days}д`;
};


export const formatRequestTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return 'Только что';
  if (diffInHours < 24) return `${diffInHours} ч. назад`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays} дн. назад`;
  
  return date.toLocaleDateString('ru-RU');
};


export const getMessageTypeIcon = (type: string): string => {
  const icons = {
    text: '💬',
    image: '🖼️',
    file: '📎',
    system: '⚙️'
  };
  return icons[type as keyof typeof icons] || '💬';
};


export const formatTags = (tags: string[]): string => {
  if (!tags || tags.length === 0) return 'Без тегов';
  if (tags.length <= 3) return tags.join(', ');
  return `${tags.slice(0, 3).join(', ')} +${tags.length - 3}`;
};

export const getProgressColor = (percent: number): string => {
  if (percent >= 80) return '#52c41a';
  if (percent >= 60) return '#faad14';
  if (percent >= 40) return '#1890ff';
  return '#ff4d4f';
};

export const formatRequestStats = (stats: {
  total: number;
  completed: number;
  inProgress: number;
  open: number;
}): string => {
  const { total, completed, inProgress, open } = stats;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  return `Всего: ${total}, Выполнено: ${completed} (${completionRate}%), В работе: ${inProgress}, Открыто: ${open}`;
};

export const getUserActivityStatus = (lastSeen?: string): {
  status: 'online' | 'away' | 'offline';
  label: string;
  color: string;
} => {
  if (!lastSeen) {
    return { status: 'offline', label: 'Не в сети', color: '#8c8c8c' };
  }
  
  const now = new Date();
  const lastSeenDate = new Date(lastSeen);
  const diffMinutes = Math.floor((now.getTime() - lastSeenDate.getTime()) / 60000);
  
  if (diffMinutes < 5) {
    return { status: 'online', label: 'В сети', color: '#52c41a' };
  }
  
  if (diffMinutes < 30) {
    return { status: 'away', label: 'Отошел', color: '#faad14' };
  }
  
  return { 
    status: 'offline', 
    label: `Был в сети ${formatRelativeTime(lastSeen)}`, 
    color: '#8c8c8c' 
  };
};

export const formatChatName = (chat: {
  name: string;
  type: string;
  participants: any[];
}): string => {
  if (chat.type === 'private' && chat.participants.length === 2) {

    const otherParticipant = chat.participants.find(p => p.id !== getCurrentUserId());
    return otherParticipant?.name || chat.name;
  }
  
  return chat.name;
};

const getCurrentUserId = (): number => {


  return 1;
};
