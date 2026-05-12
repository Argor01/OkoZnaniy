export interface ChatRoom {
  id: number;
  name: string;
  description?: string;
  type: 'general' | 'department' | 'project' | 'private';
  unread_count: number;
  is_muted: boolean;
  participants?: ChatParticipant[];
  last_message?: {
    id: number;
    text: string;
    sender: { first_name: string; last_name: string };
    sent_at: string;
  };
}

export interface ChatParticipant {
  id: number;
  first_name: string;
  last_name: string;
  role: string;
  online: boolean;
  last_seen?: string;
}

export interface ChatMessage {
  id: number;
  text: string;
  message?: string;
  sender: {
    id: number;
    first_name: string;
    last_name: string;
    role: string;
    is_admin?: boolean;
  };
  sent_at?: string;
  created_at?: string;
  is_system: boolean;
  is_pinned: boolean;
  is_mine?: boolean;
}

export type RoomType = 'general' | 'department' | 'project' | 'private';

export interface ChatConfig {
  role: 'director' | 'partner' | 'admin' | 'support';
  title: string;
  allowFileUpload?: boolean;
  allowCreateRoom?: boolean;
  allowInviteUser?: boolean;
  allowReportMessage?: boolean;
}

export interface ChatSectionApi {
  loadRooms: () => Promise<ChatRoom[]>;
  loadMessages: (roomId: number) => Promise<ChatMessage[]>;
  sendMessage: (roomId: number, text: string) => Promise<any>;
  createRoom?: (data: { name: string; description?: string; type: RoomType }) => Promise<ChatRoom>;
  uploadFile?: (roomId: number, file: File) => Promise<any>;
}
