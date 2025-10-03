import { BrowserRouter, Routes, Route } from 'react-router';
import { Toaster } from 'react-hot-toast';
import { Layout } from "./components/Layout";
import { HomePage } from "./components/HomePage";
import { ChatPage } from "./components/ChatPage";
import { ChatProvider } from "./context";
import { useGlobalErrorHandler } from "./hooks";

function App() {
  // Set up global error handling for React Query
  useGlobalErrorHandler();

  return (
    <BrowserRouter>
      <ChatProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="chat/:conversationId" element={<ChatPage />} />
          </Route>
        </Routes>
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
      </ChatProvider>
    </BrowserRouter>
  );
}

export default App;
