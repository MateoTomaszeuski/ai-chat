import { BrowserRouter, Routes, Route } from 'react-router';
import { Toaster } from 'react-hot-toast';
import { Layout } from "./components/Layout";
import { HomePage } from "./components/HomePage";
import { ChatPage } from "./components/ChatPage";
import { AuthCallback } from "./components/AuthCallback";
import { SilentRefresh } from "./components/SilentRefresh";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AdminPanel } from "./components/AdminPanel";
import { ChatProvider } from "./context";
import { useGlobalErrorHandler } from "./hooks";

function App() {
  // Set up global error handling for React Query
  useGlobalErrorHandler();

  return (
    <>
      <ErrorBoundary>
        <BrowserRouter>
          <ChatProvider>
            <Routes>
              <Route path="/callback" element={<AuthCallback />} />
              <Route path="/silent-refresh" element={<SilentRefresh />} />
              <Route path="/" element={<Layout />}>
                <Route index element={<HomePage />} />
                <Route path="chat/:conversationId" element={<ChatPage />} />
                <Route path="admin" element={<AdminPanel />} />
              </Route>
            </Routes>
          </ChatProvider>
        </BrowserRouter>
      </ErrorBoundary>
      <Toaster 
        position="top-right"
        gutter={8}
        containerClassName="z-50"
        toastOptions={{
          duration: Infinity,
          style: {
            background: 'transparent',
            boxShadow: 'none',
            padding: 0,
          },
        }}
      />
    </>
  );
}

export default App;
