import React from 'react';
import { MessageSquarePlus, MessageSquare, Trash2, Bot } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import styles from './Sidebar.module.css';

const Sidebar: React.FC = () => {
  const { 
    conversations, 
    currentConversationId, 
    isSidebarOpen, 
    setSidebarOpen, 
    createNewConversation, 
    setCurrentConversation,
    deleteConversation 
  } = useChatStore();

  return (
    <>
      <div 
        className={`${styles.sidebarOverlay} ${isSidebarOpen ? styles.open : ''}`} 
        onClick={() => setSidebarOpen(false)}
      />
      <aside className={`${styles.sidebarContainer} ${isSidebarOpen ? styles.open : ''}`}>
        <div className={styles.sidebarHeader}>
          <button className={styles.newChatBtn} onClick={createNewConversation}>
            <MessageSquarePlus size={18} />
            <span>New Chat</span>
          </button>
        </div>

        <div className={styles.chatList}>
          {conversations.map(conv => (
            <div 
              key={conv.id} 
              className={`${styles.chatItem} ${conv.id === currentConversationId ? styles.active : ''}`}
              onClick={() => setCurrentConversation(conv.id)}
            >
              <MessageSquare size={16} />
              <span className={styles.chatTitle}>{conv.title || 'New Chat'}</span>
              <button 
                className={styles.deleteBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConversation(conv.id);
                }}
                title="Delete Chat"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className={styles.sidebarFooter}>
          <div className={styles.avatar}>
            <Bot size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>AI-HAM</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Online</div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
