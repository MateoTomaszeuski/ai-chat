import { ChatContainer } from "./ChatContainer";
import { MessageInput } from "./MessageInput";
import { useChatContext } from "../context";

export function ChatApp() {
  const { messages, loading, getAIResponse } = useChatContext();

  const handleSendMessage = async (userPrompt: string) => {
    await getAIResponse(userPrompt);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">
        <ChatContainer messages={messages} loading={loading} />
      </div>
      <div className="border-t bg-white">
        <MessageInput onSendMessage={handleSendMessage} loading={loading} />
      </div>
    </div>
  );
}