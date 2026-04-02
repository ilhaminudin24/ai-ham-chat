import React, { useEffect, useRef, useState } from 'react';
import { Menu, Bot, Settings, FileText, Link, GitBranch, BarChart3 } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import { MessageBubble } from './MessageBubble';
import ChatInput from './ChatInput';
import { RenameModal } from './RenameModal';
import { EditMessageModal } from './EditMessageModal';
import { TemplatesPanel } from './TemplatesPanel';
import { SharedLinkModal } from './SharedLinkModal';
import { BranchPanel } from './BranchPanel';
import { UsageStatsPanel } from './UsageStatsPanel';
import styles from './ChatArea.module.css';

interface ChatAreaProps {
  onOpenSettings: () => void;
}

const MODELS = [
  { id: 'minimax/MiniMax-M2.7', display: 'MiniMax M2.7' },
  { id: 'minimax/MiniMax-M2.5', display: 'MiniMax M2.5' },
  { id: 'google-gemini-cli/gemini-3-flash-preview', display: 'Gemini 3 Flash' },
  { id: 'google-gemini-cli/gemini-2.5-flash', display: 'Gemini 2.5 Flash' },
  { id: 'google-gemini-cli/gemini-3.1-pro-preview', display: 'Gemini 3.1 Pro' },
];

// Simple notification sound using Web Audio API
const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (e) {
    console.log('Could not play notification sound');
  }
};

const ChatArea: React.FC<ChatAreaProps> = ({ onOpenSettings }) => {
  const { 
    conversations, 
    currentConversationId, 
    isStreaming, 
    setSidebarOpen,
    selectedModel,
    setSelectedModel,
    settings,
    renameConversation,
    updateMessageContent
  } = useChatStore();

  const [showRenameModal, setShowRenameModal] = useState(false);
  const [editingMessage, setEditingMessage] = useState<{convId: string, msgIndex: number, content: string} | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSharedLink, setShowSharedLink] = useState(false);
  const [showBranchPanel, setShowBranchPanel] = useState(false);
  const [showUsageStats, setShowUsageStats] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const prevStreamingRef = useRef(isStreaming);
  
  const currentConversation = conversations.find(c => c.id === currentConversationId);
  const messages = currentConversation?.messages || [];

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  // Play notification sound when streaming completes
  useEffect(() => {
    if (prevStreamingRef.current && !isStreaming && settings.soundEnabled) {
      playNotificationSound();
    }
    prevStreamingRef.current = isStreaming;
  }, [isStreaming, settings.soundEnabled]);

  const handleRename = (newName: string) => {
    if (currentConversationId) {
      renameConversation(currentConversationId, newName);
    }
  };

  const handleEditMessage = (msgIndex: number) => {
    if (currentConversationId) {
      const msg = messages[msgIndex];
      setEditingMessage({
        convId: currentConversationId,
        msgIndex,
        content: msg.content
      });
    }
  };

  const handleSaveEdit = (newContent: string) => {
    if (editingMessage) {
      updateMessageContent(editingMessage.convId, editingMessage.msgIndex, newContent);
      setEditingMessage(null);
    }
  };

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
          {currentConversation && (
            <button 
              className={styles.renameBtn}
              onClick={() => setShowRenameModal(true)}
              title="Rename chat"
            >
              ✏️
            </button>
          )}
        </div>
        
        <div className={styles.headerRight}>
          {currentConversation && messages.length > 0 && (
            <>
              <button 
                className={styles.actionBtn}
                onClick={() => setShowBranchPanel(true)}
                title="Branches"
              >
                <GitBranch size={16} />
              </button>
              <button 
                className={styles.actionBtn}
                onClick={() => setShowSharedLink(true)}
                title="Share"
              >
                <Link size={16} />
              </button>
              <button 
                className={styles.actionBtn}
                onClick={() => setShowUsageStats(true)}
                title="Usage Stats"
              >
                <BarChart3 size={16} />
              </button>
            </>
          )}
          <select 
            className={styles.modelSelect}
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
          >
            {MODELS.map(m => (
              <option key={m.id} value={m.id}>{m.display}</option>
            ))}
          </select>
          <button className={styles.settingsBtn} onClick={onOpenSettings} title="Settings">
            <Settings size={18} />
          </button>
        </div>
      </header>
      
      <div className={styles.scrollArea} ref={scrollRef}>
        {messages.length === 0 ? (
          <div className={styles.welcomeScreen}>
            <div className={styles.welcomeIcon}><Bot size={48} /></div>
            <h2 className={styles.welcomeTitle}>Welcome to AI-HAM</h2>
            <p>Ask me anything — text or image. Switch models anytime.</p>
            <div className={styles.welcomeActions}>
              <button 
                className={styles.templateBtn}
                onClick={() => setShowTemplates(true)}
              >
                <FileText size={18} />
                Browse Templates
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.messagesContainer}>
            {messages.map((msg, idx) => (
              <MessageBubble 
                key={idx} 
                message={msg}
                onEdit={msg.role === 'user' ? () => handleEditMessage(idx) : undefined}
              />
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

      {/* Modals */}
      <RenameModal
        isOpen={showRenameModal}
        currentName={currentConversation?.title || ''}
        onClose={() => setShowRenameModal(false)}
        onRename={handleRename}
      />

      <EditMessageModal
        isOpen={!!editingMessage}
        originalContent={editingMessage?.content || ''}
        onClose={() => setEditingMessage(null)}
        onSave={handleSaveEdit}
      />

      <TemplatesPanel
        isOpen={showTemplates}
        onClose={() => setShowTemplates(false)}
      />
      
      <SharedLinkModal
        isOpen={showSharedLink}
        onClose={() => setShowSharedLink(false)}
      />
      
      <BranchPanel
        isOpen={showBranchPanel}
        onClose={() => setShowBranchPanel(false)}
      />
      
      <UsageStatsPanel
        isOpen={showUsageStats}
        onClose={() => setShowUsageStats(false)}
      />
    </main>
  );
};

export default ChatArea;
