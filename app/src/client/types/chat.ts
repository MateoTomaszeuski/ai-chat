export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  isEdited?: boolean;
  dbId?: number;
}

export interface MessageEdit {
  id: number;
  message_id: number;
  previous_content: string;
  edited_at: string;
}

export interface Conversation {
  id: number;
  title: string;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

export interface UserInfo {
  email: string;
  name?: string;
  is_admin: boolean;
}