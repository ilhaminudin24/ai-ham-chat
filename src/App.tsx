import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import Settings from './components/Settings';
import { QuickSwitcher } from './components/QuickSwitcher';
import { ShortcutsHelp } from './components/ShortcutsHelp';
import { SharedChatView } from './components/SharedChatView';
import { useChatStore } from './store/chatStore';
import { useTheme } from './hooks/useTheme';
import { supabase } from './utils/supabase';
import { Auth } from './components/Auth';
import { initSupabaseSync, clearSupabaseSync } from './utils/syncStore';

function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [showQuickSwitcher, setShowQuickSwitcher] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [shareId, setShareId] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  
  const { createNewConversation, conversations, currentConversationId, setCurrentConversation } = useChatStore();

  // Initialize theme
  useTheme();

  // Handle Supabase Auth Initialization & Sync
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsInitializing(false);
      if (session?.user?.id) initSupabaseSync(session.user.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user?.id) {
          initSupabaseSync(session.user.id);
      } else {
          clearSupabaseSync();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Simple SPA routing for /share/:id
  useEffect(() => {
    const path = window.location.pathname;
    const shareMatch = path.match(/^\/share\/([a-zA-Z0-9_-]+)$/);
    if (shareMatch) {
      setShareId(shareMatch[1]);
    } else {
      setShareId(null);
    }
  }, []);

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

  // Shared link view
  if (shareId) {
    return <SharedChatView shareId={shareId} />;
  }

  if (isInitializing) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-primary)'}}>Loading...</div>;
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="app-container" style={{ position: 'relative' }}>
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
      <button 
        onClick={() => supabase.auth.signOut()}
        style={{
            position: 'absolute', top: '10px', right: '10px', 
            background: 'var(--bg-secondary)', color: 'var(--text-primary)',
            padding: '5px 10px', border: '1px solid var(--border-color)', borderRadius: '4px', zIndex: 50, cursor: 'pointer'
        }}
      >
        Logout
      </button>
    </div>
  );
}

export default App;
