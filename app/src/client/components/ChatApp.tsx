import { ChatContainer } from "./ChatContainer";
import { MessageInput } from "./MessageInput";
import { useChatContext } from "../context";

export function ChatApp() {
  const { messages, loading, getAIResponse } = useChatContext();

  const handleSendMessage = async (userPrompt: string) => {
    await getAIResponse(userPrompt);
  };

  return (
    <div className="chat-app">
      <ChatContainer messages={messages} loading={loading} />
      <MessageInput onSendMessage={handleSendMessage} loading={loading} />
    </div>
  );
}