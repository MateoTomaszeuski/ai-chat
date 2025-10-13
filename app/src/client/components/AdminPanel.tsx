import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "react-oidc-context";
import { chatService } from "../services/chatService";
import type { Conversation } from "../types/chat";

export function AdminPanel() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [allConversations, setAllConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      setChecking(true);
      try {
        if (!auth.isAuthenticated) {
          setIsAdmin(false);
          setChecking(false);
          return;
        }

        const userInfo = await chatService.getCurrentUser();
        const adminStatus = userInfo?.is_admin || false;
        setIsAdmin(adminStatus);

        if (adminStatus) {
          loadAllConversations();
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
      } finally {
        setChecking(false);
      }
    };

    checkAdminStatus();
  }, [auth.isAuthenticated]);

  const loadAllConversations = async () => {
    setLoading(true);
    try {
      const conversations = await chatService.getAllConversationsAdmin();
      setAllConversations(conversations);
    } catch (error) {
      console.error("Error loading admin conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConversationClick = (conversationId: number) => {
    navigate(`/chat/${conversationId}`);
  };

  const groupedConversations = allConversations.reduce((acc, conv) => {
    const email = conv.user_email || "Unknown";
    if (!acc[email]) {
      acc[email] = [];
    }
    acc[email].push(conv);
    return acc;
  }, {} as Record<string, Conversation[]>);

  // Show loading state while checking admin status
  if (checking) {
    return (
      <div className="h-full overflow-y-auto bg-gray-50 p-6">
        <div className="flex justify-center items-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  // Show unauthorized message for non-admins
  if (!auth.isAuthenticated) {
    return (
      <div className="h-full overflow-y-auto bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto mt-20">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="mb-6">
              <svg className="w-20 h-20 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Authentication Required</h1>
            <p className="text-gray-600 mb-6">
              Please log in to access the admin panel.
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

  if (isAdmin === false) {
    return (
      <div className="h-full overflow-y-auto bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto mt-20">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="mb-6">
              <svg className="w-20 h-20 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Unauthorized</h1>
            <p className="text-gray-600 mb-2">
              You do not have permission to access the admin panel.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              This area is restricted to administrators only.
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

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Panel</h1>
          <p className="text-gray-600">
            View all conversations from all users (read-only access)
          </p>
          <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm">
                  As an admin, you have read-only access. You cannot send messages, create, or delete conversations.
                </p>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.keys(groupedConversations).length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-lg">No conversations found</p>
              </div>
            ) : (
              Object.entries(groupedConversations).map(([email, conversations]) => (
                <div key={email} className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {conversations[0]?.user_name || email}
                    </h2>
                    <p className="text-sm text-gray-600">{email}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {conversations.map((conversation) => (
                      <div
                        key={conversation.id}
                        onClick={() => handleConversationClick(conversation.id)}
                        className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {conversation.title}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Created: {new Date(conversation.created_at).toLocaleString()}
                            </p>
                          </div>
                          <svg
                            className="w-5 h-5 text-gray-400 ml-4 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
