/**
 * Hook для real-time обновлений чата через WebSocket.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { API_BASE_URL } from '@/config/api';

export interface WSMessage {
  id: number;
  chat: number;
  sender: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  };
  text: string;
  message_type: string;
  created_at: string;
  is_read: boolean;
}

export function useChatWebSocket(chatId: number | null, onNewMessage?: (message: WSMessage) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectAttempts = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (!chatId) return;

    if (wsRef.current) {
      wsRef.current.close();
    }

    const token = localStorage.getItem('access_token');
    const wsUrl = API_BASE_URL.replace('http', 'ws').replace('https', 'wss');
    const url = `${wsUrl}/ws/chat/${chatId}/?token=${token}`;

    const ws = new WebSocket(url);

    ws.onopen = () => {
      setIsConnected(true);
      reconnectAttempts.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'new_message' && data.data) {
          onNewMessage?.(data.data);
        }
      } catch (e) {
        console.error('[ChatWS] Error parsing message:', e);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      
      if (reconnectAttempts.current < 5) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
        reconnectAttempts.current += 1;
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      }
    };

    ws.onerror = (error) => {
      console.error('[ChatWS] Error:', error);
    };

    wsRef.current = ws;
  }, [chatId, onNewMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const sendTyping = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'typing' }));
    }
  }, []);

  useEffect(() => {
    if (chatId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [chatId, connect, disconnect]);

  return {
    isConnected,
    sendTyping,
  };
}

export default useChatWebSocket;
