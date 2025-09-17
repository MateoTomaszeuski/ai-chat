import { useState, useRef, useEffect } from "react";
import { AiOutlineSend } from "react-icons/ai";

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMessage.trim() || loading) return;

    const messageId = Date.now().toString();
    const userMessage: ChatMessage = {
      id: messageId,
      content: currentMessage,
      sender: 'user',
      timestamp: new Date(),
    };

    // Add the user message immediately
    setMessages((prev) => [...prev, userMessage]);
    setCurrentMessage("");
    setLoading(true);

    try {
      // Convert chat messages to OpenAI format
      const messagesToSend = [...messages, userMessage].map(msg => ({
        role: msg.sender === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: messagesToSend }),
      });

      if (response.ok) {
        const data = await response.json();
        const aiMessage: ChatMessage = {
          id: Date.now().toString() + "_ai",
          content: data.response || data.error || "No response received",
          sender: 'ai',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);
      } else {
        const errorMessage: ChatMessage = {
          id: Date.now().toString() + "_error",
          content: "Error: Failed to get response from server",
          sender: 'ai',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch {
      const errorMessage: ChatMessage = {
        id: Date.now().toString() + "_error",
        content: "Error: Unable to connect to server",
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-app">
      <div className="chat-container" ref={chatContainerRef}>
        {messages.length === 0 ? (
          <div className="empty-chat">
            Start a conversation by typing a message below
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`message-bubble ${
                message.sender === 'user' ? 'user-message' : 'ai-message'
              }`}
            >
              <div className="message-content">
                {message.content}
              </div>
              <div className="message-time">
                {message.timestamp.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="message-bubble ai-message loading-message">
            <div className="message-content">
              <div className="message-loading">
                <div className="spinner"></div>
                Thinking...
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="input-container">
        <form onSubmit={sendMessage} className="message-form">
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
    </div>
  );
}

export default App;
