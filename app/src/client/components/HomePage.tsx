import { useEffect, useState } from "react";
import { MessageInput } from "./MessageInput";
import { useChatContext } from "../context";
import { useNavigate } from "react-router";

export function HomePage() {
  const { getAIResponse, loading, clearMessages, currentConversationId } = useChatContext();
  const navigate = useNavigate();
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Navigate to chat when a conversation is created (but only if we're actually sending a message)
  useEffect(() => {
    if (currentConversationId && isSendingMessage) {
      console.log('Navigating from home to chat:', currentConversationId);
      navigate(`/chat/${currentConversationId}`);
      setIsSendingMessage(false);
    }
  }, [currentConversationId, navigate, isSendingMessage]);

  const handleSendMessage = async (userPrompt: string) => {
    try {
      // Set flag that we're sending a message (so we should navigate when conversation is created)
      setIsSendingMessage(true);
      
      // Clear any existing conversation state to start fresh
      clearMessages();
      
      // Send the message and get the response - this will create a new conversation
      await getAIResponse(userPrompt, true); // Force new conversation
      
      // Navigation will be handled by the useEffect above once the conversation is created
    } catch (error) {
      console.error('Error sending message:', error);
      setIsSendingMessage(false); // Reset flag on error
    }
  };

  // Show loading state when sending a message
  if (isSendingMessage || loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Starting your conversation...</h2>
            <p className="text-gray-600">Please wait while we process your message</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full justify-center items-center bg-gray-50">
      <div className="max-w-2xl w-full px-8">
        {/* Welcome Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to AI Chat
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Start a conversation with AI. Ask questions, get help, or just chat about anything on your mind.
          </p>
        </div>

        {/* Example prompts */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 text-center">
            Try asking about:
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer"
                 onClick={() => handleSendMessage("Explain quantum computing in simple terms")}>
              <div className="text-sm font-medium text-gray-900">Science & Technology</div>
              <div className="text-sm text-gray-600 mt-1">Explain quantum computing in simple terms</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer"
                 onClick={() => handleSendMessage("Help me plan a weekend trip")}>
              <div className="text-sm font-medium text-gray-900">Travel & Planning</div>
              <div className="text-sm text-gray-600 mt-1">Help me plan a weekend trip</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer"
                 onClick={() => handleSendMessage("Write a creative story about space exploration")}>
              <div className="text-sm font-medium text-gray-900">Creative Writing</div>
              <div className="text-sm text-gray-600 mt-1">Write a creative story about space exploration</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer"
                 onClick={() => handleSendMessage("What are some healthy meal prep ideas?")}>
              <div className="text-sm font-medium text-gray-900">Health & Lifestyle</div>
              <div className="text-sm text-gray-600 mt-1">What are some healthy meal prep ideas?</div>
            </div>
          </div>
        </div>

        {/* Message Input */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <MessageInput onSendMessage={handleSendMessage} loading={loading} />
        </div>
      </div>
    </div>
  );
}