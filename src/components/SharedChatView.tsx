import React, { useEffect, useState } from 'react';
import { Link2, ArrowLeft, User, Bot } from 'lucide-react';
import styles from './SharedChatView.module.css';

interface SharedMessage {
  role: 'user' | 'assistant' | 'ai';
  content: string;
  image?: string;
}

interface SharedConversation {
  id: string;
  title: string;
  messages: SharedMessage[];
  sharedBy: string;
  createdAt: string;
}

interface SharedChatViewProps {
  shareId: string;
}

export const SharedChatView: React.FC<SharedChatViewProps> = ({ shareId }) => {
  const [conversation, setConversation] = useState<SharedConversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchShared = async () => {
      try {
        const res = await fetch(`/api/shared/${shareId}`);
        const data = await res.json();
        
        if (!res.ok) {
          setError(data.error || 'Failed to load shared conversation');
          return;
        }
        
        setConversation(data);
      } catch {
        setError('Failed to load shared conversation');
      } finally {
        setLoading(false);
      }
    };
    
    fetchShared();
  }, [shareId]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>😕 {error}</h2>
          <p>This shared conversation may have been deleted or never existed.</p>
          <a href="/" className={styles.backLink}>
            <ArrowLeft size={16} />
            Go to AI-HAM Chat
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Link2 size={20} className={styles.headerIcon} />
          <div>
            <h1 className={styles.title}>{conversation?.title}</h1>
            <p className={styles.meta}>
              Shared by {conversation?.sharedBy} • {conversation?.createdAt && new Date(conversation.createdAt).toLocaleDateString('id-ID', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}
            </p>
          </div>
        </div>
        <a href="/" className={styles.chatBtn}>
          Start Chatting →
        </a>
      </header>

      <div className={styles.readOnlyBanner}>
        📖 This is a read-only preview of a conversation with AI-HAM
      </div>

      <div className={styles.messages}>
        {conversation?.messages.map((msg, i) => (
          <div key={i} className={`${styles.message} ${msg.role === 'user' ? styles.userMessage : styles.aiMessage}`}>
            <div className={styles.messageAvatar}>
              {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
            </div>
            <div className={styles.messageContent}>
              <div className={styles.messageRole}>
                {msg.role === 'user' ? 'You' : 'AI-HAM'}
              </div>
              <div className={styles.messageBubble}>
                {msg.content}
              </div>
              {msg.image && (
                <img src={msg.image} alt="Uploaded" className={styles.messageImage} />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
