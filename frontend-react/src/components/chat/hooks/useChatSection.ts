import { useState, useEffect, useCallback, useMemo } from 'react';
import { message } from 'antd';
import type { ChatRoom, ChatMessage, ChatSectionApi, RoomType } from '../types';
import { logger } from '@/utils/logger';

export function useChatSection(api: ChatSectionApi) {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadRooms = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.loadRooms();
      setRooms(Array.isArray(data) ? data : []);
    } catch (error) {
      logger.error('Error loading chat rooms:', error);
      message.error('Ошибка загрузки чатов');
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  const loadMessages = useCallback(async (roomId: number) => {
    try {
      const msgs = await api.loadMessages(roomId);
      setMessages(Array.isArray(msgs) ? msgs : []);
    } catch (error) {
      logger.error('Error loading messages:', error);
      message.error('Ошибка загрузки сообщений');
      setMessages([]);
    }
  }, [api]);

  const sendMessage = useCallback(async () => {
    if (!messageText.trim() || !selectedRoom) return;
    try {
      await api.sendMessage(selectedRoom.id, messageText.trim());
      message.success('Сообщение отправлено');
      setMessageText('');
      await loadMessages(selectedRoom.id);
    } catch (error) {
      logger.error('Error sending message:', error);
      message.error('Ошибка отправки сообщения');
    }
  }, [messageText, selectedRoom, api, loadMessages]);

  const createRoom = useCallback(async (data: { name: string; description?: string; type: RoomType }) => {
    if (!api.createRoom) return;
    try {
      await api.createRoom(data);
      message.success('Чат создан');
      await loadRooms();
    } catch (error) {
      logger.error('Error creating room:', error);
      message.error('Ошибка создания чата');
    }
  }, [api, loadRooms]);

  const selectRoom = useCallback((room: ChatRoom) => {
    setSelectedRoom(room);
  }, []);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  useEffect(() => {
    if (selectedRoom) loadMessages(selectedRoom.id);
  }, [selectedRoom, loadMessages]);

  const filteredRooms = useMemo(() => {
    return rooms.filter(room =>
      (room.name || '').toLowerCase().includes(searchText.toLowerCase()) ||
      (room.description || '').toLowerCase().includes(searchText.toLowerCase())
    );
  }, [rooms, searchText]);

  return {
    rooms,
    filteredRooms,
    selectedRoom,
    messages,
    messageText,
    searchText,
    loading,
    isMobile,
    setMessageText,
    setSearchText,
    selectRoom,
    sendMessage,
    createRoom,
    loadRooms,
  };
}
