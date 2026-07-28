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
import { logger } from '@/utils/logger';

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

  const onMessageRef = useRef(onMessage);
  const onNotificationRef = useRef(onNotification);
  const onOrderUpdateRef = useRef(onOrderUpdate);
  const onArbitrationUpdateRef = useRef(onArbitrationUpdate);
  const onTypingRef = useRef(onTyping);
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);
  const onErrorRef = useRef(onError);

  onMessageRef.current = onMessage;
  onNotificationRef.current = onNotification;
  onOrderUpdateRef.current = onOrderUpdate;
  onArbitrationUpdateRef.current = onArbitrationUpdate;
  onTypingRef.current = onTyping;
  onConnectRef.current = onConnect;
  onDisconnectRef.current = onDisconnect;
  onErrorRef.current = onError;

  const getWebSocketUrl = useCallback((path: string) => {
    const token = localStorage.getItem('access_token');
    const separator = path.includes('?') ? '&' : '?';
    const hasJwtToken = !!token && token !== 'cookie-session' && token.split('.').length === 3;
    const tokenParam = hasJwtToken ? `${separator}token=${token}` : '';
    const wsUrl = WS_BASE_URL || (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host;
    return `${wsUrl}${path}${tokenParam}`;
  }, []);

  const getReconnectDelay = useCallback((attempt: number) => {
    return Math.min(1000 * Math.pow(2, attempt), 30000);
  }, []);

  const handleEvent = useCallback((event: WSEvent) => {
    switch (event.type) {
      case 'new_message':
        onMessageRef.current?.(event);
        break;
      case 'typing':
        onTypingRef.current?.(event);
        break;
      case 'new_notification':
      case 'notification_batch':
        onNotificationRef.current?.(event);
        break;
      case 'order_status_changed':
      case 'new_bid':
      case 'order_file_uploaded':
        onOrderUpdateRef.current?.(event);
        break;
      case 'new_arbitration_message':
      case 'arbitration_status_changed':
      case 'arbitration_activity':
        onArbitrationUpdateRef.current?.(event);
        break;
    }
  }, []);

  const connect = useCallback(() => {
    if (!enabled) return;
    const token = localStorage.getItem('access_token');
    const hasJwtToken = !!token && token !== 'cookie-session' && token.split('.').length === 3;
    if (!hasJwtToken) {
      logger.log('[WS] Skipped: JWT token is not available for WebSocket auth');
      setIsConnected(false);
      return;
    }

    if (wsRef.current) {
      wsRef.current.close();
    }

    const url = getWebSocketUrl('/ws/notifications/');
    const ws = new WebSocket(url);

    ws.onopen = () => {
      logger.log('[WS] Connected');
      setIsConnected(true);
      reconnectAttempts.current = 0;
      onConnectRef.current?.();

      subscriptionsRef.current.forEach((key) => {
        const [type, id] = key.split(':');
        sendSubscribe(type as 'chat' | 'order' | 'arbitration', parseInt(id));
      });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleEvent(data);
      } catch (e) {
        logger.error('[WS] Error parsing message:', e);
      }
    };

    ws.onclose = (event) => {
      logger.log('[WS] Disconnected', event.code, event.reason);
      setIsConnected(false);
      onDisconnectRef.current?.();

      if (event.code !== 4001) {
        const delay = getReconnectDelay(reconnectAttempts.current);
        reconnectAttempts.current += 1;
        logger.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      }
    };

    ws.onerror = (error) => {
      logger.error('[WS] Error:', error);
      onErrorRef.current?.(error);
    };

    wsRef.current = ws;
  }, [enabled, getWebSocketUrl, handleEvent, getReconnectDelay]);

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

  const sendSubscribe = useCallback((type: 'chat' | 'order' | 'arbitration', id: number) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'subscribe', type, id }));
    }
  }, []);

  const subscribe = useCallback((type: 'chat' | 'order' | 'arbitration', id: number) => {
    const key = `${type}:${id}`;
    subscriptionsRef.current.add(key);
    sendSubscribe(type, id);
  }, [sendSubscribe]);

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
