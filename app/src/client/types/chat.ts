export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
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