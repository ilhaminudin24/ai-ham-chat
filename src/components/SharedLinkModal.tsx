import React, { useState } from 'react';
import { X, Link, Copy, Check } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import styles from './SharedLinkModal.module.css';

interface SharedLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SharedLinkModal: React.FC<SharedLinkModalProps> = ({ isOpen, onClose }) => {
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { currentConversationId, conversations } = useChatStore();
  
  const currentConv = conversations.find(c => c.id === currentConversationId);

  const handleCreateLink = async () => {
    if (!currentConv || currentConv.messages.length === 0) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/shared', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: currentConv.title,
          messages: currentConv.messages,
          sharedBy: 'AI-HAM User'
        })
      });
      
      const data = await response.json();
      setShareUrl(window.location.origin + data.url);
    } catch (e) {
      console.error('Failed to create share link:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <Link size={18} className={styles.headerIcon} />
            <h3>Share Chat</h3>
          </div>
          <button onClick={onClose} className={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>
        
        <div className={styles.body}>
          {!currentConv ? (
            <p className={styles.noChat}>No conversation selected</p>
          ) : currentConv.messages.length === 0 ? (
            <p className={styles.noChat}>Start a conversation first</p>
          ) : !shareUrl ? (
            <>
              <p className={styles.description}>
                Create a shareable link for "{currentConv.title}"
              </p>
              <button 
                onClick={handleCreateLink} 
                disabled={loading}
                className={styles.createBtn}
              >
                {loading ? 'Creating...' : 'Generate Link'}
              </button>
            </>
          ) : (
            <>
              <p className={styles.description}>Share this link:</p>
              <div className={styles.linkBox}>
                <input 
                  type="text" 
                  value={shareUrl} 
                  readOnly 
                  className={styles.linkInput}
                />
                <button 
                  onClick={handleCopy} 
                  className={styles.copyBtn}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className={styles.hint}>
                Anyone with this link can view this conversation
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
};
