import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Menu, Bot, Settings, FileText, Link, GitBranch, BarChart3, ClipboardCopy, Brain } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import { MessageBubble } from './MessageBubble';
import ChatInput from './ChatInput';
import { RenameModal } from './RenameModal';
import { EditMessageModal } from './EditMessageModal';
import { TemplatesPanel } from './TemplatesPanel';
import { SharedLinkModal } from './SharedLinkModal';
import { BranchPanel } from './BranchPanel';
import { UsageStatsPanel } from './UsageStatsPanel';
import { Toast } from './Toast';
import { sendChatRequest } from '../utils/api';
import { formatConversationAsMarkdown, formatConversationAsPlainText, copyToClipboard } from '../utils/clipboard';
import { useSwipeGesture } from '../hooks/useSwipeGesture';
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
    updateMessageContent,
    streamingPhase,
    regenerateLastResponse
  } = useChatStore();

  const [showRenameModal, setShowRenameModal] = useState(false);
  const [editingMessage, setEditingMessage] = useState<{convId: string, msgIndex: number, content: string} | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSharedLink, setShowSharedLink] = useState(false);
  const [showBranchPanel, setShowBranchPanel] = useState(false);
  const [showUsageStats, setShowUsageStats] = useState(false);
  const [showCopyMenu, setShowCopyMenu] = useState(false);

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Regeneration count tracking
  const [regenCount, setRegenCount] = useState(1);

  // Elapsed time counter for thinking phase
  const [thinkingElapsed, setThinkingElapsed] = useState(0);
  const thinkingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const prevStreamingRef = useRef(isStreaming);
  
  const currentConversation = conversations.find(c => c.id === currentConversationId);
  const messages = currentConversation?.messages || [];

  // Find last AI message index for regenerate button
  const lastAIIndex = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return i;
    }
    return -1;
  }, [messages]);

  // Detect if last user message has an image (for contextual thinking label)
  const lastUserHasImage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') return !!messages[i].image;
    }
    return false;
  }, [messages]);

  // Detect if last user message is code-related
  const lastUserIsCode = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        const c = messages[i].content.toLowerCase();
        return /\b(code|function|bug|error|script|class|import|def |const |let |var |async|await|return|console|print)\b/.test(c) ||
               /```/.test(messages[i].content);
      }
    }
    return false;
  }, [messages]);

  // Swipe gesture for mobile sidebar with visual peek
  const { ref: swipeRef, swipeState } = useSwipeGesture<HTMLElement>({
    onSwipeRight: () => setSidebarOpen(true),
    onSwipeLeft: () => setSidebarOpen(false),
  });

  // Elapsed timer for thinking phase
  useEffect(() => {
    if (streamingPhase === 'thinking' || streamingPhase === 'connecting') {
      setThinkingElapsed(0);
      thinkingTimerRef.current = setInterval(() => {
        setThinkingElapsed(prev => prev + 1);
      }, 1000);
    } else {
      if (thinkingTimerRef.current) {
        clearInterval(thinkingTimerRef.current);
        thinkingTimerRef.current = null;
      }
      setThinkingElapsed(0);
    }

    return () => {
      if (thinkingTimerRef.current) clearInterval(thinkingTimerRef.current);
    };
  }, [streamingPhase]);

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

  // Ctrl+Shift+R keyboard shortcut for regenerate
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;

      if (cmdKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        if (!isStreaming && currentConversationId && lastAIIndex >= 0) {
          handleRegenerate();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isStreaming, currentConversationId, lastAIIndex]);

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

  // Copy full conversation as markdown
  const handleCopyMarkdown = useCallback(async () => {
    if (!currentConversation) return;
    const text = formatConversationAsMarkdown(currentConversation.title, currentConversation.messages);
    const success = await copyToClipboard(text);
    if (success) {
      setToastMsg('Copied as Markdown!');
      setShowToast(true);
    }
    setShowCopyMenu(false);
  }, [currentConversation]);

  // Copy full conversation as plain text
  const handleCopyPlainText = useCallback(async () => {
    if (!currentConversation) return;
    const text = formatConversationAsPlainText(currentConversation.title, currentConversation.messages);
    const success = await copyToClipboard(text);
    if (success) {
      setToastMsg('Copied as Plain Text!');
      setShowToast(true);
    }
    setShowCopyMenu(false);
  }, [currentConversation]);

  // Regenerate last AI response (optionally with a different model)
  const handleRegenerate = useCallback(async (overrideModelId?: string) => {
    if (!currentConversationId || isStreaming) return;
    
    regenerateLastResponse(currentConversationId);
    setRegenCount(prev => prev + 1);

    const modelToUse = overrideModelId || selectedModel;
    
    // Wait a tick for state to update, then get fresh messages
    setTimeout(async () => {
      const updatedConv = useChatStore.getState().conversations.find(c => c.id === currentConversationId);
      if (updatedConv && updatedConv.messages.length > 0) {
        await sendChatRequest(currentConversationId, updatedConv.messages, modelToUse);
      }
    }, 0);
  }, [currentConversationId, isStreaming, regenerateLastResponse, selectedModel]);

  // Reset regen count when conversation changes
  useEffect(() => {
    setRegenCount(1);
  }, [currentConversationId]);

  // Contextual thinking phase label
  const getPhaseLabel = () => {
    if (streamingPhase === 'connecting') return 'Connecting...';
    if (streamingPhase === 'thinking') {
      if (lastUserHasImage) return 'Analyzing image...';
      if (lastUserIsCode) return 'Analyzing code...';
      return 'Thinking...';
    }
    return null;
  };

  const phaseLabel = getPhaseLabel();

  // Swipe peek indicator styles
  const swipePeekStyle: React.CSSProperties = swipeState.isSwiping && swipeState.offsetX > 5
    ? { boxShadow: `inset ${swipeState.offsetX}px 0 ${swipeState.offsetX * 2}px -${swipeState.offsetX}px rgba(139, 92, 246, 0.15)` }
    : {};

  return (
    <main className={styles.mainContent} ref={swipeRef} style={swipePeekStyle}>
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
              <div className={styles.copyMenuWrapper}>
                <button 
                  className={styles.actionBtn}
                  onClick={() => setShowCopyMenu(!showCopyMenu)}
                  title="Copy conversation"
                >
                  <ClipboardCopy size={16} />
                </button>
                {showCopyMenu && (
                  <div className={styles.copyDropdown}>
                    <button onClick={handleCopyMarkdown}>📝 Copy as Markdown</button>
                    <button onClick={handleCopyPlainText}>📄 Copy as Plain Text</button>
                  </div>
                )}
              </div>
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
            {messages.map((msg, idx) => {
              const isLastAI = !isStreaming && idx === lastAIIndex;
              
              return (
                <MessageBubble 
                  key={idx} 
                  message={msg}
                  onEdit={msg.role === 'user' ? () => handleEditMessage(idx) : undefined}
                  isLastAI={isLastAI}
                  onRegenerate={isLastAI ? handleRegenerate : undefined}
                  regenerationCount={isLastAI ? regenCount : undefined}
                />
              );
            })}
            
            {isStreaming && (
              <div className={styles.streamingIndicator}>
                {phaseLabel ? (
                  <div className={styles.thinkingPhase}>
                    <Brain size={18} className={styles.thinkingIcon} />
                    <span className={styles.phaseText}>{phaseLabel}</span>
                    {thinkingElapsed > 0 && (
                      <span className={styles.elapsedTime}>{thinkingElapsed}s</span>
                    )}
                  </div>
                ) : (
                  <div className={styles.typingIndicator}>
                    <div className={styles.typingDot} />
                    <div className={styles.typingDot} />
                    <div className={styles.typingDot} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Swipe peek indicator — visible bar on left edge during swipe */}
      {swipeState.isSwiping && swipeState.offsetX > 5 && (
        <div 
          className={styles.swipePeekBar}
          style={{ opacity: Math.min(swipeState.offsetX / 40, 1) }}
        />
      )}

      {/* Floating Input Area */}
      <ChatInput />

      {/* Toast */}
      <Toast 
        message={toastMsg} 
        isVisible={showToast} 
        onDismiss={() => setShowToast(false)} 
      />

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
