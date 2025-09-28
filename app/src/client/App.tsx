import { ChatApp } from "./components/ChatApp";
import { Sidebar } from "./components/Sidebar";
import { ChatProvider } from "./context";

function App() {
  return (
    <ChatProvider>
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1">
          <ChatApp />
        </div>
      </div>
    </ChatProvider>
  );
}

export default App;
