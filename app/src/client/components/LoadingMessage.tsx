export function LoadingMessage() {
  return (
    <div className="message-bubble ai-message loading-message">
      <div className="message-content">
        <div className="message-loading">
          <div className="spinner"></div>
          Thinking...
        </div>
      </div>
    </div>
  );
}