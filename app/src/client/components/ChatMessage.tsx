import { useState } from "react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import type { ChatMessage as ChatMessageType } from "../types/chat";

interface ChatMessageProps {
  message: ChatMessageType;
  onEdit?: (messageId: number, newContent: string) => Promise<void>;
}

export function ChatMessage({ message, onEdit }: ChatMessageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [isSaving, setIsSaving] = useState(false);

  const handleEdit = () => {
    setIsEditing(true);
    setEditContent(message.content);
  };

  const handleSave = async () => {
    if (!message.dbId || !onEdit || editContent.trim() === message.content) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onEdit(message.dbId, editContent.trim());
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving edit:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditContent(message.content);
  };

  return (
    <div
      className={`message-bubble ${
        message.sender === 'user' ? 'user-message' : 'ai-message'
      }`}
    >
      <div className="message-content">
        {isEditing ? (
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full p-2 border rounded resize-none min-h-[60px] bg-white text-black"
            disabled={isSaving}
          />
        ) : (
          <>
            {message.sender === 'ai' ? (
              <MarkdownRenderer content={message.content} />
            ) : (
              message.content
            )}
          </>
        )}
      </div>
      
      <div className="flex justify-between items-center mt-2 gap-2">
        <div className="flex items-center gap-2 text-xs opacity-70">
          {message.timestamp.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
          {message.isEdited && !isEditing && (
            <span className="opacity-60">(edited)</span>
          )}
        </div>
        
        {message.sender === 'user' && message.dbId && onEdit && (
          <div className="flex gap-2 flex-shrink-0">
            {!isEditing ? (
              <button
                onClick={handleEdit}
                className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                ✏️ Edit
              </button>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  disabled={isSaving || editContent.trim().length === 0}
                  className="text-xs px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {isSaving ? 'Saving...' : '💾 Save'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="text-xs px-3 py-1.5 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  ✖️ Cancel
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}