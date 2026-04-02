import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import Settings from './components/Settings';
import { QuickSwitcher } from './components/QuickSwitcher';
import { ShortcutsHelp } from './components/ShortcutsHelp';
import { useChatStore } from './store/chatStore';

function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [showQuickSwitcher, setShowQuickSwitcher] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  
  const { createNewConversation, conversations, currentConversationId, setCurrentConversation } = useChatStore();

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;
      
      // Cmd/Ctrl + K - Quick Switcher
      if (cmdKey && e.key === 'k') {
        e.preventDefault();
        setShowQuickSwitcher(true);
        return;
      }
      
      // Cmd/Ctrl + N - New Conversation
      if (cmdKey && e.key === 'n') {
        e.preventDefault();
        createNewConversation();
        return;
      }
      
      // Cmd/Ctrl + Shift + C - Copy last AI response
      if (cmdKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        const currentConv = conversations.find(c => c.id === currentConversationId);
        if (currentConv && currentConv.messages.length > 0) {
          const lastAImsg = [...currentConv.messages].reverse().find(m => m.role === 'assistant');
          if (lastAImsg) {
            navigator.clipboard.writeText(lastAImsg.content);
          }
        }
        return;
      }
      
      // Cmd/Ctrl + / - Show shortcuts
      if (cmdKey && e.key === '/') {
        e.preventDefault();
        setShowShortcuts(true);
        return;
      }
      
      // Escape - Stop streaming or close modals
      if (e.key === 'Escape') {
        const state = useChatStore.getState();
        if (state.isStreaming) {
          state.stopStreaming();
          return;
        }
        setShowQuickSwitcher(false);
        setShowShortcuts(false);
        setShowSettings(false);
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [createNewConversation, conversations, currentConversationId, setCurrentConversation]);

  return (
    <div className="app-container">
      <Sidebar />
      <ChatArea onOpenSettings={() => setShowSettings(true)} />
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
      <QuickSwitcher 
        isOpen={showQuickSwitcher} 
        onClose={() => setShowQuickSwitcher(false)} 
      />
      <ShortcutsHelp 
        isOpen={showShortcuts} 
        onClose={() => setShowShortcuts(false)} 
      />
    </div>
  );
}

export default App;
