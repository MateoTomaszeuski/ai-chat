import { useState } from "react";
import { ChatContainer } from "./components/ChatContainer";
import { MessageInput } from "./components/MessageInput";
import type { ChatMessage } from "./types/chat";

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [loading, setLoading] = useState(false);

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
      <ChatContainer messages={messages} loading={loading} />
      <MessageInput
        currentMessage={currentMessage}
        setCurrentMessage={setCurrentMessage}
        loading={loading}
        onSendMessage={sendMessage}
      />
    </div>
  );
}

export default App;
