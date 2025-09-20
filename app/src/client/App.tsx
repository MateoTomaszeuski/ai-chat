import { ChatApp } from "./components/ChatApp";
import { ChatProvider } from "./context";

function App() {
  return (
    <ChatProvider>
      <ChatApp />
    </ChatProvider>
  );
}

export default App;
