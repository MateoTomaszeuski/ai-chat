import { AiOutlineSend } from "react-icons/ai";

interface MessageInputProps {
  currentMessage: string;
  setCurrentMessage: (message: string) => void;
  loading: boolean;
  onSendMessage: (e: React.FormEvent) => void;
}

export function MessageInput({ 
  currentMessage, 
  setCurrentMessage, 
  loading, 
  onSendMessage 
}: MessageInputProps) {
  return (
    <div className="input-container">
      <form onSubmit={onSendMessage} className="message-form">
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