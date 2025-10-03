import { Toaster } from 'react-hot-toast';
import { ChatApp } from "./components/ChatApp";
import { Sidebar } from "./components/Sidebar";
import { ChatProvider } from "./context";
import { useGlobalErrorHandler } from "./hooks";

function App() {
  // Set up global error handling for React Query
  useGlobalErrorHandler();

  return (
    <ChatProvider>
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1">
          <ChatApp />
        </div>
      </div>
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
  );
}

export default App;
