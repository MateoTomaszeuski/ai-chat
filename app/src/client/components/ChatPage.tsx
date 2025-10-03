import { useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { ChatContainer } from "./ChatContainer";
import { MessageInput } from "./MessageInput";
import { useChatContext } from "../context";

export function ChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { 
    messages, 
    loading, 
    getAIResponse, 
    loadConversation, 
    currentConversationId,
    conversations 
  } = useChatContext();

  useEffect(() => {
    if (conversationId) {
      const id = parseInt(conversationId, 10);
      if (isNaN(id)) {
        // Invalid conversation ID, redirect to home
        navigate('/');
        return;
      }

      // Check if the conversation exists
      const conversationExists = conversations.some(conv => conv.id === id);
      // Only redirect to home if we have conversations loaded AND the conversation doesn't exist
      // AND this is not the current conversation ID from context (to handle newly created conversations)
      if (conversations.length > 0 && !conversationExists && currentConversationId !== id) {
        // Conversation doesn't exist, redirect to home
        navigate('/');
        return;
      }

      // Load the conversation if it's not already loaded
      if (currentConversationId !== id) {
        loadConversation(id);
      }
    }
  }, [conversationId, loadConversation, currentConversationId, navigate, conversations]);

  const handleSendMessage = async (userPrompt: string) => {
    await getAIResponse(userPrompt);
  };

  // If no conversation ID or invalid ID, don't render anything
  if (!conversationId || isNaN(parseInt(conversationId, 10))) {
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0">
        <ChatContainer messages={messages} loading={loading} />
      </div>
      <div className="border-t bg-white">
        <MessageInput onSendMessage={handleSendMessage} loading={loading} />
      </div>
    </div>
  );
}