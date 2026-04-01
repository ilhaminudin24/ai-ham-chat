import React, { useEffect, useRef } from 'react';
import { Menu, Bot } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import { MessageBubble } from './MessageBubble';
import ChatInput from './ChatInput';
import styles from './ChatArea.module.css';

const MODELS = [
  { id: 'minimax/MiniMax-M2.7', display: 'MiniMax M2.7' },
  { id: 'minimax/MiniMax-M2.5', display: 'MiniMax M2.5' },
  { id: 'google-gemini-cli/gemini-3-flash-preview', display: 'Gemini 3 Flash' },
  { id: 'google-gemini-cli/gemini-2.5-flash', display: 'Gemini 2.5 Flash' },
  { id: 'google-gemini-cli/gemini-3.1-pro-preview', display: 'Gemini 3.1 Pro' },
];

const ChatArea: React.FC = () => {
  const { 
    conversations, 
    currentConversationId, 
    isStreaming, 
    setSidebarOpen,
    selectedModel,
    setSelectedModel
  } = useChatStore();

  const scrollRef = useRef<HTMLDivElement>(null);
  
  const currentConversation = conversations.find(c => c.id === currentConversationId);
  const messages = currentConversation?.messages || [];

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  return (
    <main className={styles.mainContent}>
      <header className={styles.chatHeader}>
        <div className={styles.headerLeft}>
          <button className={styles.menuBtn} onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>
          <span className={styles.headerTitle}>
            {currentConversation?.title || 'AI-HAM Chat'}
          </span>
        </div>
        
        <select 
          className={styles.modelSelect}
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
        >
          {MODELS.map(m => (
            <option key={m.id} value={m.id}>{m.display}</option>
          ))}
        </select>
      </header>
      
      <div className={styles.scrollArea} ref={scrollRef}>
        {messages.length === 0 ? (
          <div className={styles.welcomeScreen}>
            <div className={styles.welcomeIcon}><Bot size={48} /></div>
            <h2 className={styles.welcomeTitle}>Welcome to AI-HAM</h2>
            <p>Ask me anything — text or image. Switch models anytime.</p>
          </div>
        ) : (
          <div className={styles.messagesContainer}>
            {messages.map((msg, idx) => (
              <MessageBubble key={idx} message={msg} />
            ))}
            
            {isStreaming && (
              <div className={styles.typingIndicator}>
                <div className={styles.typingDot} />
                <div className={styles.typingDot} />
                <div className={styles.typingDot} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Input Area */}
      <ChatInput />
    </main>
  );
};

export default ChatArea;
