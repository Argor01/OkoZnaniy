import { useState, useCallback, useRef } from 'react';
import { message as antMessage } from 'antd';
import type { ChatDetail } from '../types';

interface UseFileUploadParams {
  selectedChat: ChatDetail | null;
  isFrozen: boolean;
  sending: boolean;
  orderIsFrozen?: boolean | null;
}

export function useFileUpload({ selectedChat, isFrozen, sending, orderIsFrozen }: UseFileUploadParams) {
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isDragOverChat, setIsDragOverChat] = useState(false);
  const dragDepthRef = useRef(0);

  const addAttachedFiles = useCallback((files: File[]) => {
    if (!Array.isArray(files) || files.length === 0) return;
    const maxSize = 50 * 1024 * 1024;
    const existing = new Set(attachedFiles.map((f) => `${f.name}_${f.size}`));
    const next: File[] = [];

    for (const file of files) {
      if (!file) continue;
      if (typeof file.size === 'number' && file.size <= 0) {
        antMessage.error(`Файл "${file.name}" пустой и не будет добавлен`);
        continue;
      }
      if (file.size > maxSize) {
        antMessage.error(`Файл "${file.name}" больше 10 МБ и не будет добавлен`);
        continue;
      }
      const key = `${file.name}_${file.size}`;
      if (existing.has(key) || next.some((f) => f.name === file.name && f.size === file.size)) {
        antMessage.warning(`Файл "${file.name}" уже прикреплен`);
        continue;
      }
      next.push(file);
    }

    if (next.length > 0) {
      setAttachedFiles((prev) => [...prev, ...next]);
      antMessage.success(
        next.length === 1
          ? `Файл "${next[0].name}" прикреплен`
          : `Прикреплено файлов: ${next.length}`
      );
    }
  }, [attachedFiles]);

  const handleFileSelect = (file: File) => {
    addAttachedFiles([file]);
    return false;
  };

  const removeAttachedFile = (fileToRemove: File) => {
    setAttachedFiles(prev => prev.filter(file => file !== fileToRemove));
    antMessage.info('Файл удален');
  };

  const handleChatDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!selectedChat || isFrozen || orderIsFrozen || sending) return;
    if (!Array.from(e.dataTransfer.types || []).includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current += 1;
    setIsDragOverChat(true);
  }, [selectedChat, isFrozen, orderIsFrozen, sending]);

  const handleChatDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!selectedChat || isFrozen || orderIsFrozen || sending) return;
    if (!Array.from(e.dataTransfer.types || []).includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    if (!isDragOverChat) setIsDragOverChat(true);
  }, [selectedChat, isFrozen, orderIsFrozen, sending, isDragOverChat]);

  const handleChatDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!selectedChat || isFrozen || orderIsFrozen || sending) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDragOverChat(false);
    }
  }, [selectedChat, isFrozen, orderIsFrozen, sending]);

  const handleChatDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setIsDragOverChat(false);
    if (!selectedChat || isFrozen || orderIsFrozen || sending) return;
    const dropped = Array.from(e.dataTransfer.files || []);
    if (dropped.length === 0) return;
    addAttachedFiles(dropped);
  }, [selectedChat, isFrozen, orderIsFrozen, sending, addAttachedFiles]);

  return {
    attachedFiles,
    setAttachedFiles,
    isDragOverChat,
    setIsDragOverChat,
    dragDepthRef,
    addAttachedFiles,
    handleFileSelect,
    removeAttachedFile,
    handleChatDragEnter,
    handleChatDragOver,
    handleChatDragLeave,
    handleChatDrop,
  };
}
