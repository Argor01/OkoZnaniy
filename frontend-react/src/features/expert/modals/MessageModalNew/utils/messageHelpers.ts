import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

export const normalizeMessageText = (value: string): string => value.normalize('NFC');

export const hasVisibleMessageContent = (value: string): boolean => {
  const normalized = normalizeMessageText(value);
  const stripped = normalized
    .replace(/\s+/gu, '')
    .replace(/\u200B|\u200C|\u200D/gu, '')
    .replace(/\uFE0E/gu, '')
    .replace(/\uFE0F/gu, '')
    .replace(/\p{Emoji_Modifier}/gu, '')
    .replace(/\u20E3/gu, '');
  return stripped.length > 0;
};

export const getErrorDetail = (error: unknown): string | undefined => {
  if (typeof error !== 'object' || error === null) return undefined;
  if (!('response' in error)) return undefined;
  const resp = (error as { response?: { data?: { detail?: string } } }).response;
  return resp?.data?.detail;
};

export const parseContextTitle = (raw?: string | null): { title: string; workId?: number } => {
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (!value) return { title: '' };
  const match = value.match(/work:(\d+)/);
  const workIdRaw = match?.[1] ? Number(match[1]) : NaN;
  const workId = Number.isFinite(workIdRaw) && workIdRaw > 0 ? workIdRaw : undefined;
  const title = value.replace(/\s*\|\s*work:\d+\s*$/, '').trim();
  return { title, workId };
};

export const formatRemaining = (deadline?: string, status?: string, isFrozen?: boolean | null) => {
  if (isFrozen) return 'Срок заморожен';
  if (status === 'review') return 'На проверке';
  if (!deadline) return '';
  const baseEnd = new Date(deadline).getTime();
  const end = baseEnd;
  if (Number.isNaN(end)) return '';
  
  const diff = end - Date.now();
  if (diff <= 0) return 'Срок истёк';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  const dd = String(days).padStart(2, '0');
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  
  if (days > 0) {
    return `Осталось: ${dd} д. ${hh}:${mm}:${ss}`;
  }
  return `Осталось: ${hh}:${mm}:${ss}`;
};

export const isDeadlineExpired = (deadline?: string | null, isFrozen?: boolean | null) => {
  if (isFrozen) return false;
  if (!deadline) return false;
  const end = new Date(deadline).getTime();
  if (Number.isNaN(end)) return false;
  return end <= Date.now();
};

export const formatOrderStatus = (status?: string) => {
  if (!status) return '';
  const map: Record<string, string> = {
    new: 'Новый',
    waiting_payment: 'Ожидает оплаты',
    in_progress: 'В работе',
    review: 'На проверке',
    revision: 'На доработке',
    completed: 'Выполнен',
    cancelled: 'Отменён',
  };
  return map[status] || status;
};

export const formatTimestamp = (dateString: string) => {
  try {
    const result = formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: ru });
    return result
      .replace(/меньше минуты/gi, '1 м')
      .replace(/(\d+)\s+минут(?:а|ы|у)?/gi, '$1 м');
  } catch {
    return dateString;
  }
};

export const formatMessageTime = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateString;
  }
};
