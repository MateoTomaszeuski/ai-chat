import { useState, useEffect } from "react";
import { AiOutlineSend } from "react-icons/ai";
import { useAuth } from "react-oidc-context";
import { chatService } from "../services/chatService";

interface MessageInputProps {
  loading: boolean;
  onSendMessage: (userPrompt: string) => Promise<void>;
}

export function MessageInput({ loading, onSendMessage }: MessageInputProps) {
  const [currentMessage, setCurrentMessage] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const auth = useAuth();

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (auth.isAuthenticated) {
        const userInfo = await chatService.getCurrentUser();
        setIsAdmin(userInfo?.is_admin || false);
      }
    };
    checkAdminStatus();
  }, [auth.isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMessage.trim() || loading || isAdmin) return;

    const messageToSend = currentMessage;
    setCurrentMessage(""); // Clear input immediately
    await onSendMessage(messageToSend);
  };

  if (isAdmin) {
    return (
      <div className="input-container">
        <div className="p-4 bg-yellow-50 border-t-2 border-yellow-400 text-center">
          <p className="text-sm text-yellow-800">
            👑 Admin Mode: Read-only access - You cannot send messages
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="input-container">
      <form onSubmit={handleSubmit} className="message-form">
        <input
          type="text"
          placeholder="Type your message here..."
          value={currentMessage}
          onChange={(e) => setCurrentMessage(e.target.value)}
          disabled={loading}
          className="message-input"
        />
        <button 
          type="submit" 
          disabled={loading || !currentMessage.trim()}
          className="send-button"
        >
          {loading ? (
            <div className="spinner"></div>
          ) : (
            <AiOutlineSend className="airplane-icon" size={20} />
          )}
        </button>
      </form>
    </div>
  );
}