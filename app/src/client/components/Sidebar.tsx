import { useNavigate, useParams } from "react-router";
import { useAuth } from "react-oidc-context";
import { useChatContext } from "../context/ChatContext";
import { LoginButton } from "./LoginButton";
import type { Conversation } from "../types/chat";

export function Sidebar() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { conversationId } = useParams<{ conversationId: string }>();
  const { 
    conversations, 
    deleteConversation,
    clearMessages
  } = useChatContext();

  const currentConversationId = conversationId ? parseInt(conversationId, 10) : null;

  const handleConversationClick = (conversationId: number) => {
    navigate(`/chat/${conversationId}`);
  };

  const handleNewChat = () => {
    clearMessages(); // Clear the current conversation state
    navigate('/', { replace: true }); // Navigate to home page
  };

  const handleDeleteConversation = (e: React.MouseEvent, conversationId: number) => {
    e.stopPropagation(); // Prevent conversation from being selected
    if (confirm("Are you sure you want to delete this conversation? This action cannot be undone.")) {
      deleteConversation(conversationId);
    }
  };

  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        {auth.isAuthenticated ? (
          <button
            onClick={handleNewChat}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors duration-200 font-medium"
          >
            + New Chat
          </button>
        ) : (
          <div className="text-center text-gray-400 text-sm">
            Log in to start chatting
          </div>
        )}
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {auth.isAuthenticated ? (
          <div className="p-2">
            {conversations.length === 0 ? (
              <div className="text-gray-400 text-sm p-4 text-center">
                No conversations yet
              </div>
            ) : (
              conversations.map((conversation: Conversation) => (
                <div
                  key={conversation.id}
                  className={`
                    group p-3 rounded-lg cursor-pointer transition-colors duration-200 mb-2 relative
                    ${currentConversationId === conversation.id
                      ? 'bg-gray-700 border-l-4 border-blue-500'
                      : 'hover:bg-gray-800'
                    }
                  `}
                  onClick={() => handleConversationClick(conversation.id)}
                >
                  <div className="text-sm font-medium truncate pr-8">
                    {conversation.title}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(conversation.created_at).toLocaleDateString()}
                  </div>
                  
                  {/* Delete button - shows on hover */}
                  <button
                    onClick={(e) => handleDeleteConversation(e, conversation.id)}
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-all duration-200 p-1 rounded-md focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-400/50"
                    title="Delete conversation"
                    aria-label={`Delete conversation: ${conversation.title}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="p-4 text-center text-gray-400 text-sm">
            <div className="mb-4">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p>Your conversations will appear here after logging in</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700 space-y-3">
        {auth.isAuthenticated && (
          <div className="text-xs text-gray-400">
            {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
          </div>
        )}
        <LoginButton />
      </div>
    </div>
  );
}