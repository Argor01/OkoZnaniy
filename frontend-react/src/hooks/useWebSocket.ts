/**
 * WebSocket hook для real-time обновлений.
 * 
 * Поддерживает:
 * - Подключение к WebSocket серверу с JWT аутентификацией
 * - Автоматическое переподключение с exponential backoff
 * - Подписку на события: чат, уведомления, заказы, арбитраж
 * - Типизированные обработчики событий
 */

import { useEffect, useRef, useCallback, useState } from 'react';

// Типы событий
export type WSEventType =
  | 'new_message'
  | 'typing'
  | 'new_notification'
  | 'notification_batch'
  | 'order_status_changed'
  | 'new_bid'
  | 'order_file_uploaded'
  | 'new_arbitration_message'
  | 'arbitration_status_changed'
  | 'arbitration_activity';

export interface WSEvent {
  type: WSEventType;
  data: any;
  user_id?: number;
  username?: string;
}

export type WSEventHandler = (event: WSEvent) => void;

export interface UseWebSocketOptions {
  enabled?: boolean;
  onMessage?: WSEventHandler;
  onNotification?: WSEventHandler;
  onOrderUpdate?: WSEventHandler;
  onArbitrationUpdate?: WSEventHandler;
  onTyping?: WSEventHandler;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

interface Subscription {
  type: 'chat' | 'order' | 'arbitration';
  id: number;
}

const WS_BASE_URL = (import.meta.env.VITE_API_URL || '').replace('http', 'ws').replace('https', 'wss');

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    enabled = true,
    onMessage,
    onNotification,
    onOrderUpdate,
    onArbitrationUpdate,
    onTyping,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const subscriptionsRef = useRef<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(false);
  const reconnectAttempts = useRef(0);

  const getWebSocketUrl = useCallback((path: string) => {
    const token = localStorage.getItem('access_token');
    const separator = path.includes('?') ? '&' : '?';
    const tokenParam = token ? `${separator}token=${token}` : '';
    const wsUrl = WS_BASE_URL || (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host;
    return `${wsUrl}${path}${tokenParam}`;
  }, []);

  const getReconnectDelay = useCallback((attempt: number) => {
    // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
    return Math.min(1000 * Math.pow(2, attempt), 30000);
  }, []);

  const handleEvent = useCallback((event: WSEvent) => {
    switch (event.type) {
      case 'new_message':
        onMessage?.(event);
        break;
      case 'typing':
        onTyping?.(event);
        break;
      case 'new_notification':
      case 'notification_batch':
        onNotification?.(event);
        break;
      case 'order_status_changed':
      case 'new_bid':
      case 'order_file_uploaded':
        onOrderUpdate?.(event);
        break;
      case 'new_arbitration_message':
      case 'arbitration_status_changed':
      case 'arbitration_activity':
        onArbitrationUpdate?.(event);
        break;
    }
  }, [onMessage, onNotification, onOrderUpdate, onArbitrationUpdate, onTyping]);

  const connect = useCallback(() => {
    if (!enabled) return;

    // Закрываем существующее соединение
    if (wsRef.current) {
      wsRef.current.close();
    }

    // Подключаемся к уведомлениям (всегда)
    const url = getWebSocketUrl('/ws/notifications/');
    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log('[WS] Connected');
      setIsConnected(true);
      reconnectAttempts.current = 0;
      onConnect?.();

      // Переподписываемся на все каналы
      subscriptionsRef.current.forEach((key) => {
        const [type, id] = key.split(':');
        subscribe(type as 'chat' | 'order' | 'arbitration', parseInt(id));
      });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleEvent(data);
      } catch (e) {
        console.error('[WS] Error parsing message:', e);
      }
    };

    ws.onclose = (event) => {
      console.log('[WS] Disconnected', event.code, event.reason);
      setIsConnected(false);
      onDisconnect?.();

      // Автоматическое переподключение
      if (event.code !== 4001) { // Не переподключаемся при ошибке аутентификации
        const delay = getReconnectDelay(reconnectAttempts.current);
        reconnectAttempts.current += 1;
        console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      }
    };

    ws.onerror = (error) => {
      console.error('[WS] Error:', error);
      onError?.(error);
    };

    wsRef.current = ws;
  }, [enabled, getWebSocketUrl, handleEvent, getReconnectDelay, onConnect, onDisconnect, onError]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const subscribe = useCallback((type: 'chat' | 'order' | 'arbitration', id: number) => {
    const key = `${type}:${id}`;
    subscriptionsRef.current.add(key);

    // Если соединение активно, переподключаемся для подписки
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      // Закрываем и переподключаемся с новыми подписками
      disconnect();
      setTimeout(() => connect(), 100);
    }
  }, [disconnect, connect]);

  const unsubscribe = useCallback((type: 'chat' | 'order' | 'arbitration', id: number) => {
    const key = `${type}:${id}`;
    subscriptionsRef.current.delete(key);
  }, []);

  const sendTyping = useCallback((chatId: number) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'typing',
        chat_id: chatId,
      }));
    }
  }, []);

  // Подключение при монтировании
  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    isConnected,
    subscribe,
    unsubscribe,
    sendTyping,
    connect,
    disconnect,
  };
}

export default useWebSocket;
