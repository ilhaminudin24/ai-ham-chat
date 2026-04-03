import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Menu, Bot, Settings, FileText, Link, GitBranch, BarChart3, ClipboardCopy, Brain, Sun, Moon, Search, Tag } from 'lucide-react';
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
import { SearchBar } from './SearchBar';
import { TagSelector } from './TagSelector';
import { SuggestionChips } from './SuggestionChips';
import { sendChatRequest } from '../utils/api';
import { formatConversationAsMarkdown, formatConversationAsPlainText, copyToClipboard } from '../utils/clipboard';
import { useSwipeGesture } from '../hooks/useSwipeGesture';
import { useTheme } from '../hooks/useTheme';
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

const WELCOME_STARTERS = [
  { icon: '💡', label: 'Brainstorm ideas', prompt: 'Help me brainstorm creative ideas for ' },
  { icon: '📝', label: 'Write content', prompt: 'Write a professional email about ' },
  { icon: '🐛', label: 'Debug code', prompt: 'Help me debug this code:\n```\n' },
  { icon: '📊', label: 'Analyze data', prompt: 'Analyze the following data and provide insights:\n' },
  { icon: '🎯', label: 'Plan a project', prompt: 'Help me create a project plan for ' },
  { icon: '🌐', label: 'Translate text', prompt: 'Translate the following to English:\n' },
];

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning, Boss Ilham! ☀️';
  if (hour < 17) return 'Good afternoon, Boss Ilham! 🌤️';
  if (hour < 21) return 'Good evening, Boss Ilham! 🌅';
  return 'Good night, Boss Ilham! 🌙';
};

// Simple notification sound
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
    regenerateLastResponse,
    setTheme,
    setCurrentConversation,
    setInputText,
    addTag,
    removeTag,
    createBranch,
    isGeneratingTitle,
    suggestedTitle,
    acceptSuggestedTitle,
    dismissSuggestedTitle,
    followUpSuggestions,
    showFollowUpSuggestions,
    translateMode,
    toggleTranslateMode,
    clearFollowUpSuggestions
  } = useChatStore();

  const { resolvedTheme } = useTheme();

  const [showRenameModal, setShowRenameModal] = useState(false);
  const [editingMessage, setEditingMessage] = useState<{convId: string, msgIndex: number, content: string} | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSharedLink, setShowSharedLink] = useState(false);
  const [showBranchPanel, setShowBranchPanel] = useState(false);
  const [showUsageStats, setShowUsageStats] = useState(false);
  const [showCopyMenu, setShowCopyMenu] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [showTagSelector, setShowTagSelector] = useState(false);

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const showToastMsg = useCallback((msg: string) => {
    setToastMsg(msg);
    setShowToast(true);
  }, []);

  // Regeneration count tracking
  const [regenCount, setRegenCount] = useState(1);

  // Elapsed time counter for thinking phase
  const [thinkingElapsed, setThinkingElapsed] = useState(0);
  const thinkingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Search highlight state
  const [searchHighlights, setSearchHighlights] = useState<{ msgIndex: number; matches: number[] }[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const prevStreamingRef = useRef(isStreaming);
  
  const currentConversation = conversations.find(c => c.id === currentConversationId);
  const messages = currentConversation?.messages || [];
  const activeBranch = currentConversation?.branches?.find(b => b.id === currentConversation.activeBranchId);

  // Recent conversations for welcome screen
  const recentConversations = useMemo(() => {
    return [...conversations]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3)
      .filter(c => c.messages.length > 0);
  }, [conversations]);

  // Currently selected model display name
  const currentModelDisplay = MODELS.find(m => m.id === selectedModel)?.display || selectedModel;

  // Find last AI message index for regenerate button
  const lastAIIndex = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return i;
    }
    return -1;
  }, [messages]);

  // Detect if last user message has an image
  const lastUserHasImage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        return !!messages[i].image || !!(messages[i].files?.some(f => f.isImage));
      }
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

  // Ctrl+Shift+R and Ctrl+F keyboard shortcuts
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

      // Ctrl+F — in-conversation search
      if (cmdKey && e.key === 'f') {
        e.preventDefault();
        setShowSearchBar(true);
      }

      // Ctrl+T — add tag to current conversation
      if (cmdKey && e.key === 't') {
        e.preventDefault();
        if (currentConversationId) setShowTagSelector(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isStreaming, currentConversationId, lastAIIndex]);

  // Reset regen count when conversation changes
  useEffect(() => { setRegenCount(1); }, [currentConversationId]);

  const handleRename = (newName: string) => {
    if (currentConversationId) renameConversation(currentConversationId, newName);
  };

  const handleEditMessage = (msgIndex: number) => {
    if (currentConversationId) {
      const msg = messages[msgIndex];
      setEditingMessage({ convId: currentConversationId, msgIndex, content: msg.content });
    }
  };

  const handleSaveEdit = (newContent: string) => {
    if (editingMessage) {
      updateMessageContent(editingMessage.convId, editingMessage.msgIndex, newContent);
      setEditingMessage(null);
    }
  };

  const handleBranchFromMessage = (msgIndex: number) => {
    if (!currentConversationId || !currentConversation) return;
    const branchName = `Branch from #${msgIndex + 1}`;
    createBranch(currentConversationId, branchName, msgIndex);
    setShowBranchPanel(true);
  };

  const handleCopyMarkdown = useCallback(async () => {
    if (!currentConversation) return;
    const text = formatConversationAsMarkdown(currentConversation.title, currentConversation.messages);
    const success = await copyToClipboard(text);
    if (success) showToastMsg('Copied as Markdown!');
    setShowCopyMenu(false);
  }, [currentConversation]);

  const handleCopyPlainText = useCallback(async () => {
    if (!currentConversation) return;
    const text = formatConversationAsPlainText(currentConversation.title, currentConversation.messages);
    const success = await copyToClipboard(text);
    if (success) showToastMsg('Copied as Plain Text!');
    setShowCopyMenu(false);
  }, [currentConversation]);

  const handleRegenerate = useCallback(async (overrideModelId?: string) => {
    if (!currentConversationId || isStreaming) return;
    regenerateLastResponse(currentConversationId);
    setRegenCount(prev => prev + 1);
    const modelToUse = overrideModelId || selectedModel;
    setTimeout(async () => {
      const updatedConv = useChatStore.getState().conversations.find(c => c.id === currentConversationId);
      if (updatedConv && updatedConv.messages.length > 0) {
        await sendChatRequest(currentConversationId, updatedConv.messages, modelToUse);
      }
    }, 0);
  }, [currentConversationId, isStreaming, regenerateLastResponse, selectedModel]);

  // Handle starter click
  const handleStarterClick = (prompt: string) => {
    setInputText(prompt);
  };

  // Search highlight callback
  const handleSearchHighlight = useCallback((matchIndices: { msgIndex: number; matches: number[] }[], _currentMatch: number) => {
    setSearchHighlights(matchIndices);
  }, []);

  // Toggle theme quickly
  const toggleTheme = () => {
    const next = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

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
          
          {/* Auto-title generation indicator */}
          {isGeneratingTitle && (
            <span className={styles.titleLoading}>
              <span className={styles.titleSpinner}>✨</span>
              <span>Generating title...</span>
            </span>
          )}
          
          {/* Suggested title - accept or dismiss */}
          {suggestedTitle && !isGeneratingTitle && currentConversation && (
            <span className={styles.titleSuggestion}>
              <span>Suggested: <strong>"{suggestedTitle}"</strong></span>
              <button 
                className={styles.acceptTitleBtn}
                onClick={() => acceptSuggestedTitle(currentConversation.id)}
                title="Accept suggested title"
              >
                ✓
              </button>
              <button 
                className={styles.dismissTitleBtn}
                onClick={() => dismissSuggestedTitle()}
                title="Keep current title"
              >
                ✕
              </button>
            </span>
          )}
          
          {activeBranch && (
            <span className={styles.branchBadge} onClick={() => setShowBranchPanel(true)} title="Click to manage branches">
              🌿 {activeBranch.name}
            </span>
          )}
          {currentConversation && (
            <button className={styles.renameBtn} onClick={() => setShowRenameModal(true)} title="Rename chat">✏️</button>
          )}
        </div>
        
        <div className={styles.headerRight}>
          {currentConversation && messages.length > 0 && (
            <>
              <button className={styles.actionBtn} onClick={() => setShowSearchBar(!showSearchBar)} title="Search (Ctrl+F)">
                <Search size={16} />
              </button>
              <button className={styles.actionBtn} onClick={() => setShowTagSelector(true)} title="Tags (Ctrl+T)">
                <Tag size={16} />
              </button>
              <div className={styles.copyMenuWrapper}>
                <button className={styles.actionBtn} onClick={() => setShowCopyMenu(!showCopyMenu)} title="Copy conversation">
                  <ClipboardCopy size={16} />
                </button>
                {showCopyMenu && (
                  <div className={styles.copyDropdown}>
                    <button onClick={handleCopyMarkdown}>📝 Copy as Markdown</button>
                    <button onClick={handleCopyPlainText}>📄 Copy as Plain Text</button>
                  </div>
                )}
              </div>
              <button className={styles.actionBtn} onClick={() => setShowBranchPanel(true)} title="Branches">
                <GitBranch size={16} />
              </button>
              <button className={styles.actionBtn} onClick={() => setShowSharedLink(true)} title="Share">
                <Link size={16} />
              </button>
              <button className={styles.actionBtn} onClick={() => setShowUsageStats(true)} title="Usage Stats">
                <BarChart3 size={16} />
              </button>
            </>
          )}
          {/* Quick theme toggle */}
          <button className={styles.actionBtn} onClick={toggleTheme} title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}>
            {resolvedTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <select className={styles.modelSelect} value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
            {MODELS.map(m => (<option key={m.id} value={m.id}>{m.display}</option>))}
          </select>
          <button className={styles.settingsBtn} onClick={onOpenSettings} title="Settings">
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* In-conversation Search Bar */}
      <SearchBar
        isOpen={showSearchBar}
        onClose={() => setShowSearchBar(false)}
        messages={messages}
        onHighlight={handleSearchHighlight}
      />
      
      <div className={styles.scrollArea} ref={scrollRef}>
        {messages.length === 0 ? (
          <div className={styles.welcomeScreen}>
            <div className={styles.welcomeIcon}><Bot size={48} /></div>
            <h2 className={styles.welcomeTitle}>{getGreeting()}</h2>
            <p className={styles.welcomeSubtitle}>Ask me anything — powered by <strong>{currentModelDisplay}</strong></p>
            
            {/* Suggested Starters */}
            <div className={styles.starterGrid}>
              {WELCOME_STARTERS.map((starter, idx) => (
                <button
                  key={idx}
                  className={styles.starterCard}
                  onClick={() => handleStarterClick(starter.prompt)}
                >
                  <span className={styles.starterIcon}>{starter.icon}</span>
                  <span className={styles.starterLabel}>{starter.label}</span>
                </button>
              ))}
            </div>

            {/* Recent Conversations */}
            {recentConversations.length > 0 && (
              <div className={styles.recentSection}>
                <div className={styles.recentTitle}>Recent Conversations</div>
                <div className={styles.recentList}>
                  {recentConversations.map(conv => (
                    <button
                      key={conv.id}
                      className={styles.recentItem}
                      onClick={() => setCurrentConversation(conv.id)}
                    >
                      <span className={styles.recentItemTitle}>{conv.title}</span>
                      <span className={styles.recentItemCount}>{conv.messages.length} msgs</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* What's New */}
            <div className={styles.whatsNew}>
              <span className={styles.whatsNewBadge}>✨ What's New</span>
              <span>Slash commands, theme toggle, tags, and in-conversation search!</span>
            </div>

            <div className={styles.welcomeActions}>
              <button className={styles.templateBtn} onClick={() => setShowTemplates(true)}>
                <FileText size={18} /> Browse Templates
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.messagesContainer}>
            {messages.map((msg, idx) => {
              const isLastAI = !isStreaming && idx === lastAIIndex;
              const highlight = searchHighlights.find(h => h.msgIndex === idx);
              
              return (
                <MessageBubble 
                  key={idx} 
                  message={msg}
                  messageIndex={idx}
                  onEdit={msg.role === 'user' ? () => handleEditMessage(idx) : undefined}
                  onBranch={msg.role === 'user' ? (branchIdx) => handleBranchFromMessage(branchIdx) : undefined}
                  isLastAI={isLastAI}
                  onRegenerate={isLastAI ? handleRegenerate : undefined}
                  regenerationCount={isLastAI ? regenCount : undefined}
                  searchQuery={showSearchBar ? undefined : undefined}
                  highlightRanges={highlight?.matches}
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

      {/* Swipe peek indicator */}
      {swipeState.isSwiping && swipeState.offsetX > 5 && (
        <div className={styles.swipePeekBar} style={{ opacity: Math.min(swipeState.offsetX / 40, 1) }} />
      )}

      {/* Floating Input Area */}
      <ChatInput 
        onShowTemplates={() => setShowTemplates(true)}
        onShowToast={showToastMsg}
      />

      {/* Follow-up Suggestions */}
      {followUpSuggestions.length > 0 && showFollowUpSuggestions && (
        <SuggestionChips
          suggestions={followUpSuggestions as any}
          isOpen={true}
          translateMode={translateMode}
          onSuggestionClick={(text) => {
            clearFollowUpSuggestions();
            setInputText(text);
          }}
          onTranslateToggle={toggleTranslateMode}
        />
      )}

      {/* Toast */}
      <Toast message={toastMsg} isVisible={showToast} onDismiss={() => setShowToast(false)} />

      {/* Tag Selector */}
      <TagSelector
        isOpen={showTagSelector}
        onClose={() => setShowTagSelector(false)}
        currentTags={currentConversation?.tags || []}
        onAddTag={(tag) => currentConversationId && addTag(currentConversationId, tag)}
        onRemoveTag={(tag) => currentConversationId && removeTag(currentConversationId, tag)}
      />

      {/* Modals */}
      <RenameModal isOpen={showRenameModal} currentName={currentConversation?.title || ''} onClose={() => setShowRenameModal(false)} onRename={handleRename} />
      <EditMessageModal isOpen={!!editingMessage} originalContent={editingMessage?.content || ''} onClose={() => setEditingMessage(null)} onSave={handleSaveEdit} />
      <TemplatesPanel isOpen={showTemplates} onClose={() => setShowTemplates(false)} />
      <SharedLinkModal isOpen={showSharedLink} onClose={() => setShowSharedLink(false)} />
      <BranchPanel isOpen={showBranchPanel} onClose={() => setShowBranchPanel(false)} />
      <UsageStatsPanel isOpen={showUsageStats} onClose={() => setShowUsageStats(false)} />
    </main>
  );
};

export default ChatArea;
