import { useState } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import Settings from './components/Settings';

function App() {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="app-container">
      <Sidebar />
      <ChatArea onOpenSettings={() => setShowSettings(true)} />
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </div>
  );
}

export default App;
