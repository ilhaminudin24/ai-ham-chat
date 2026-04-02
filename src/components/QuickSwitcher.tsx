import React, { useState, useEffect, useRef } from 'react';
import { Search, MessageSquare } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import styles from './QuickSwitcher.module.css';

interface QuickSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickSwitcher: React.FC<QuickSwitcherProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { conversations, folders, setCurrentConversation, createNewConversation } = useChatStore();

  // Filter conversations based on query
  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(query.toLowerCase())
  );

  // Sort: pinned first, then by date
  const sortedConversations = [...filteredConversations].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Get folder name
  const getFolderName = (folderId: string | null) => {
    if (!folderId) return 'All Chats';
    const folder = folders.find(f => f.id === folderId);
    return folder ? `${folder.icon} ${folder.name}` : 'All Chats';
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, sortedConversations.length));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex < sortedConversations.length) {
            handleSelect(sortedConversations[selectedIndex].id);
          } else {
            handleNewChat();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, sortedConversations]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = (id: string) => {
    setCurrentConversation(id);
    onClose();
  };

  const handleNewChat = () => {
    createNewConversation();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.modal}>
        <div className={styles.searchBox}>
          <Search size={18} className={styles.searchIcon} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations..."
            className={styles.input}
          />
        </div>
        
        <div className={styles.results}>
          {sortedConversations.length === 0 && !query ? (
            <div className={styles.empty}>No conversations yet</div>
          ) : sortedConversations.length === 0 ? (
            <div className={styles.empty}>No matches found</div>
          ) : (
            sortedConversations.map((conv, index) => (
              <div
                key={conv.id}
                className={`${styles.result} ${index === selectedIndex ? styles.selected : ''}`}
                onClick={() => handleSelect(conv.id)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <MessageSquare size={16} className={styles.resultIcon} />
                <div className={styles.resultContent}>
                  <div className={styles.resultTitle}>
                    {conv.isPinned && <span className={styles.pinBadge}>📌</span>}
                    {conv.title || 'New Chat'}
                  </div>
                  <div className={styles.resultMeta}>
                    {getFolderName(conv.folderId)} • {conv.messages.length} messages
                  </div>
                </div>
              </div>
            ))
          )}
          
          <div
            className={`${styles.result} ${selectedIndex === sortedConversations.length ? styles.selected : ''}`}
            onClick={handleNewChat}
            onMouseEnter={() => setSelectedIndex(sortedConversations.length)}
          >
            <div className={styles.newChatIcon}>+</div>
            <div className={styles.resultContent}>
              <div className={styles.resultTitle}>New Conversation</div>
              <div className={styles.resultMeta}>Create a fresh chat</div>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <span><kbd>↑↓</kbd> Navigate</span>
          <span><kbd>↵</kbd> Select</span>
          <span><kbd>Esc</kbd> Close</span>
        </div>
      </div>
    </>
  );
};
