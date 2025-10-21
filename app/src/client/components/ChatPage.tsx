import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useAuth } from "react-oidc-context";
import { ChatContainer } from "./ChatContainer";
import { MessageInput } from "./MessageInput";
import { ProtectedRoute } from "./ProtectedRoute";
import { useChatContext } from "../context";
import { chatService } from "../services/chatService";

function ChatPageContent() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const auth = useAuth();
  const { 
    messages, 
    loading, 
    getAIResponse, 
    loadConversation, 
    currentConversationId,
    editMessage
  } = useChatContext();
  const [checking, setChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      if (!conversationId || !auth.isAuthenticated) {
        setChecking(false);
        setHasAccess(false);
        return;
      }

      const id = parseInt(conversationId, 10);
      if (isNaN(id)) {
        setHasAccess(false);
        setChecking(false);
        return;
      }

      setChecking(true);

      try {
        // Check if user is admin
        const userInfo = await chatService.getCurrentUser();
        const adminStatus = userInfo?.is_admin || false;
        setIsAdmin(adminStatus);

        // Admins can view any conversation (read-only)
        if (adminStatus) {
          setHasAccess(true);
          if (currentConversationId !== id) {
            loadConversation(id);
          }
          setChecking(false);
          return;
        }

        // For non-admins, always verify access by trying to fetch messages
        // This ensures backend ownership check is enforced
        try {
          await chatService.getConversationMessages(id);
          // If we successfully get messages, we have access
          setHasAccess(true);
          if (currentConversationId !== id) {
            loadConversation(id);
          }
        } catch (error) {
          // Access denied - backend returned error
          console.error("Access denied to conversation:", error);
          setHasAccess(false);
        }
      } catch (error) {
        console.error("Error checking conversation access:", error);
        setHasAccess(false);
      } finally {
        setChecking(false);
      }
    };

    checkAccess();
  }, [conversationId, auth.isAuthenticated, currentConversationId, loadConversation]);

  const handleSendMessage = async (userPrompt: string) => {
    await getAIResponse(userPrompt);
  };

  // Show loading state while checking access
  if (checking) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If no conversation ID or invalid ID, don't render anything
  if (!conversationId || isNaN(parseInt(conversationId, 10))) {
    return (
      <div className="flex justify-center items-center h-full bg-gray-50">
        <div className="text-center text-gray-500">
          <p className="text-lg">No conversation selected</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  // Show unauthorized message if user doesn't have access
  if (hasAccess === false) {
    return (
      <div className="flex justify-center items-center h-full bg-gray-50 p-6">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="mb-6">
              <svg className="w-20 h-20 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Access Denied</h1>
            <p className="text-gray-600 mb-2">
              You don't have permission to view this conversation.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              This conversation belongs to another user.
            </p>
            <button
              onClick={() => navigate('/')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show admin notice if viewing as admin
  if (isAdmin && hasAccess) {
    return (
      <div className="flex flex-col h-full">
        <div className="bg-purple-50 border-b-2 border-purple-400 p-3">
          <div className="flex items-center justify-center text-purple-800 text-sm">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="font-medium">Admin View: Read-Only Access</span>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <ChatContainer messages={messages} loading={loading} onEditMessage={isAdmin ? undefined : editMessage} />
        </div>
        <div className="border-t bg-white">
          <MessageInput onSendMessage={handleSendMessage} loading={loading} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0">
        <ChatContainer messages={messages} loading={loading} onEditMessage={editMessage} />
      </div>
      <div className="border-t bg-white">
        <MessageInput onSendMessage={handleSendMessage} loading={loading} />
      </div>
    </div>
  );
}

export function ChatPage() {
  return (
    <ProtectedRoute>
      <ChatPageContent />
    </ProtectedRoute>
  );
}