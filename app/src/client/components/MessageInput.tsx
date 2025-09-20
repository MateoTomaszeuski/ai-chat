import { useState } from "react";
import { AiOutlineSend } from "react-icons/ai";

interface MessageInputProps {
  loading: boolean;
  onSendMessage: (userPrompt: string) => Promise<void>;
}

export function MessageInput({ loading, onSendMessage }: MessageInputProps) {
  const [currentMessage, setCurrentMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMessage.trim() || loading) return;

    const messageToSend = currentMessage;
    setCurrentMessage(""); // Clear input immediately
    await onSendMessage(messageToSend);
  };

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