import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Skill } from '../types/skills';

export type OutputMode = 'auto' | 'json' | 'table' | 'code';

export interface FileAttachment {
  id: string;
  name: string;
  type: string; // MIME type
  size: number; // bytes
  dataUrl: string; // base64 data URL
  isImage: boolean;
}

export interface Message {
  role: 'user' | 'assistant' | 'ai';
  content: string;
  image?: string | null; // legacy single image (backward compat)
  files?: FileAttachment[]; // new multi-file support
  timestamp?: string;
}

export interface Branch {
  id: string;
  name: string;
  messages: Message[];
  createdAt: string;
  parentMessageIndex: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  mainThreadMessages: Message[]; // preserved when switching branches
  branches: Branch[];
  activeBranchId: string | null;
  createdAt: string;
  folderId: string | null;
  isPinned: boolean;
  tags: string[];
  systemPrompt?: string;
  outputMode?: OutputMode;
}

export interface Folder {
  id: string;
  name: string;
  icon: string;
  order: number;
}

export interface Settings {
  soundEnabled: boolean;
  defaultModel: string;
  theme: 'dark' | 'light' | 'system';
  enableFollowUpSuggestions: boolean;
}

export interface UsageStats {
  totalMessages: number;
  totalTokens: number;
  totalConversations: number;
  lastUpdated: string;
  dailyStats: Record<string, { messages: number; tokens: number; conversations: number }>;
}

export interface ChatState {
  conversations: Conversation[];
  currentConversationId: string | null;
  isStreaming: boolean;
  isSidebarOpen: boolean;
  selectedModel: string;
  folders: Folder[];
  searchQuery: string;
  settings: Settings;
  activeSkills: Skill[];
  inputText: string;
  usageStats: UsageStats;
  streamingPhase: 'connecting' | 'thinking' | 'streaming' | null;
  abortController: AbortController | null;
  
  // Auto-title generation
  isGeneratingTitle: boolean;
  suggestedTitle: string | null;
  titleMessageIndex: number | null;
  
  // Follow-up suggestions
  followUpSuggestions: { id: string; text: string; type: string }[];
  showFollowUpSuggestions: boolean;
  translateMode: 'to-en' | 'to-id';
  
  // Actions
  createNewConversation: () => void;
  setCurrentConversation: (id: string) => void;
  addMessage: (conversationId: string, message: Message) => void;
  updateLastMessage: (conversationId: string, content: string) => void;
  setStreaming: (isStreaming: boolean) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  setSelectedModel: (model: string) => void;
  deleteConversation: (id: string) => void;
  setSearchQuery: (query: string) => void;
  setInputText: (text: string) => void;
  
  // Pin actions
  pinConversation: (id: string) => void;
  unpinConversation: (id: string) => void;
  togglePin: (id: string) => void;
  
  // Settings actions
  setSoundEnabled: (enabled: boolean) => void;
  toggleSound: () => void;
  setDefaultModel: (model: string) => void;
  clearAllConversations: () => void;
  
  // Folder actions
  createFolder: (name: string, icon?: string) => void;
  deleteFolder: (id: string) => void;
  renameFolder: (id: string, name: string) => void;
  moveToFolder: (conversationId: string, folderId: string | null) => void;
  
  // Skills actions
  setActiveSkills: (skills: Skill[]) => void;
  
  // Rename action
  renameConversation: (id: string, newTitle: string) => void;
  
  // Edit message action
  updateMessageContent: (convId: string, msgIndex: number, newContent: string) => void;
  deleteMessage: (convId: string, msgIndex: number) => void;
  
  // Branch actions
  createBranch: (convId: string, branchName: string, fromMessageIndex: number) => void;
  switchBranch: (convId: string, branchId: string) => void;
  deleteBranch: (convId: string, branchId: string) => void;
  
  // Usage stats
  trackUsage: (tokens: number) => void;
  getUsageStats: () => UsageStats;
  
  // Stop & streaming phase actions
  stopStreaming: () => void;
  setStreamingPhase: (phase: ChatState['streamingPhase']) => void;
  setAbortController: (controller: AbortController | null) => void;
  
  // Auto-title actions
  setGeneratingTitle: (isGenerating: boolean, title?: string | null, messageIndex?: number | null) => void;
  acceptSuggestedTitle: (conversationId: string) => void;
  dismissSuggestedTitle: () => void;
  
  // Follow-up suggestions actions
  setFollowUpSuggestions: (suggestions: { id: string; text: string; type: string }[]) => void;
  toggleFollowUpSuggestions: () => void;
  toggleTranslateMode: () => void;
  clearFollowUpSuggestions: () => void;
  regenerateLastResponse: (convId: string) => void;
  
  // Theme
  setTheme: (theme: Settings['theme']) => void;
  
  // Tags
  addTag: (convId: string, tag: string) => void;
  removeTag: (convId: string, tag: string) => void;
  
  // System prompt per conversation
  setConversationSystemPrompt: (convId: string, prompt: string) => void;
  
  // Output Mode
  globalOutputMode: OutputMode;
  setGlobalOutputMode: (mode: OutputMode) => void;
  setConversationOutputMode: (convId: string, mode: OutputMode) => void;
  
  // Clear messages in conversation
  clearConversationMessages: (convId: string) => void;
}

const defaultFolders: Folder[] = [
];

const defaultSettings: Settings = {
  soundEnabled: true,
  defaultModel: 'minimax/MiniMax-M2.7',
  theme: 'dark',
  enableFollowUpSuggestions: true // Default ON
};

const defaultUsageStats: UsageStats = {
  totalMessages: 0,
  totalTokens: 0,
  totalConversations: 0,
  lastUpdated: new Date().toISOString(),
  dailyStats: {}
};

const isEmptyNewChatDraft = (
  conversation: Conversation | undefined
): conversation is Conversation =>
  Boolean(
    conversation &&
    conversation.title === 'New Chat' &&
    conversation.messages.length === 0
  );

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      currentConversationId: null,
      isStreaming: false,
      isSidebarOpen: false,
      selectedModel: 'minimax/MiniMax-M2.7',
      inputText: '',
      folders: defaultFolders,
      searchQuery: '',
      settings: defaultSettings,
      activeSkills: [],
      usageStats: defaultUsageStats,
      streamingPhase: null,
      abortController: null,
      
      // Auto-title generation state
      isGeneratingTitle: false,
      suggestedTitle: null,
      titleMessageIndex: null,
      
      // Follow-up suggestions state
      followUpSuggestions: [],
      showFollowUpSuggestions: true, // Default ON
      translateMode: 'to-en',
      
      // Output Mode
      globalOutputMode: 'auto',

      createNewConversation: () => {
        const state = get();
        const existingDraft = state.conversations.find(isEmptyNewChatDraft);

        if (existingDraft) {
          set({
            currentConversationId: existingDraft.id,
            isSidebarOpen: false
          });
          return;
        }

        const id = Date.now().toString();
        const newConv: Conversation = {
          id,
          title: 'New Chat',
          messages: [],
          mainThreadMessages: [],
          branches: [],
          activeBranchId: null,
          createdAt: new Date().toISOString(),
          folderId: null,
          isPinned: false,
          tags: []
        };
        set({
          conversations: [newConv, ...state.conversations],
          currentConversationId: id,
          isSidebarOpen: false
        });
      },

      setCurrentConversation: (id) => {
        set({ currentConversationId: id, isSidebarOpen: false });
      },

      addMessage: (conversationId, message) => {
        const messageWithTimestamp = {
          ...message,
          timestamp: message.timestamp || new Date().toISOString()
        };
        set((state) => {
          const updatedConvs = state.conversations.map((conv) => {
            if (conv.id === conversationId) {
              const updatedMessages = [...conv.messages, messageWithTimestamp];
              let newTitle = conv.title;
              // Only set title from first message if title is still the default "New Chat"
              // Don't override if title was already set (e.g., by auto-title generation)
              const isDefaultTitle = conv.title === 'New Chat' || conv.title.startsWith('New Chat');
              if (updatedMessages.length === 1 && messageWithTimestamp.role === 'user' && isDefaultTitle) {
                newTitle = (messageWithTimestamp.content || 'Image').slice(0, 35);
                if ((messageWithTimestamp.content || 'Image').length > 35) newTitle += '...';
              }
              // Sync messages to the active branch or mainThreadMessages
              let updatedBranches = conv.branches;
              let updatedMainThread = conv.mainThreadMessages;
              if (conv.activeBranchId) {
                updatedBranches = updatedBranches.map(b =>
                  b.id === conv.activeBranchId ? { ...b, messages: updatedMessages } : b
                );
              } else {
                updatedMainThread = updatedMessages;
              }
              return { ...conv, messages: updatedMessages, branches: updatedBranches, mainThreadMessages: updatedMainThread, title: newTitle };
            }
            return conv;
          });
          return { conversations: updatedConvs };
        });
      },

      updateLastMessage: (conversationId, content) => {
        set((state) => {
          const updatedConvs = state.conversations.map((conv) => {
            if (conv.id === conversationId) {
              const updatedMessages = [...conv.messages];
              if (updatedMessages.length > 0) {
                const lastMsg = updatedMessages[updatedMessages.length - 1];
                updatedMessages[updatedMessages.length - 1] = {
                  ...lastMsg,
                  content: lastMsg.content + content
                };
              }
              // Sync messages to the active branch or mainThreadMessages
              let updatedBranches = conv.branches;
              let updatedMainThread = conv.mainThreadMessages;
              if (conv.activeBranchId) {
                updatedBranches = updatedBranches.map(b =>
                  b.id === conv.activeBranchId ? { ...b, messages: updatedMessages } : b
                );
              } else {
                updatedMainThread = updatedMessages;
              }
              return { ...conv, messages: updatedMessages, branches: updatedBranches, mainThreadMessages: updatedMainThread };
            }
            return conv;
          });
          return { conversations: updatedConvs };
        });
      },

      setStreaming: (isStreaming) => set({ isStreaming }),
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
      setSelectedModel: (model) => set({ selectedModel: model }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      
      deleteConversation: (id) => set((state) => {
        const filtered = state.conversations.filter(c => c.id !== id);
        return {
          conversations: filtered,
          currentConversationId: state.currentConversationId === id 
            ? (filtered.length > 0 ? filtered[0].id : null) 
            : state.currentConversationId
        };
      }),

      // Pin actions
      pinConversation: (id) => {
        set({
          conversations: get().conversations.map(conv =>
            conv.id === id ? { ...conv, isPinned: true } : conv
          )
        });
      },

      unpinConversation: (id) => {
        set({
          conversations: get().conversations.map(conv =>
            conv.id === id ? { ...conv, isPinned: false } : conv
          )
        });
      },

      togglePin: (id) => {
        set({
          conversations: get().conversations.map(conv =>
            conv.id === id ? { ...conv, isPinned: !conv.isPinned } : conv
          )
        });
      },

      // Settings actions
      setSoundEnabled: (enabled) => {
        set({
          settings: { ...get().settings, soundEnabled: enabled }
        });
      },

      toggleSound: () => {
        set({
          settings: { ...get().settings, soundEnabled: !get().settings.soundEnabled }
        });
      },

      setDefaultModel: (model) => {
        set({
          settings: { ...get().settings, defaultModel: model },
          selectedModel: model
        });
      },

      clearAllConversations: () => {
        set({
          conversations: [],
          currentConversationId: null
        });
      },

      createFolder: (name, icon = '📁') => {
        const newFolder: Folder = {
          id: Date.now().toString(),
          name,
          icon,
          order: get().folders.length
        };
        set({ folders: [...get().folders, newFolder] });
      },

      deleteFolder: (id) => {
        const updatedConvs = get().conversations.map(conv => {
          if (conv.folderId === id) {
            return { ...conv, folderId: null };
          }
          return conv;
        });
        set({
          folders: get().folders.filter(f => f.id !== id),
          conversations: updatedConvs
        });
      },

      renameFolder: (id, name) => {
        set({
          folders: get().folders.map(f => 
            f.id === id ? { ...f, name } : f
          )
        });
      },

      moveToFolder: (conversationId, folderId) => {
        set({
          conversations: get().conversations.map(conv =>
            conv.id === conversationId ? { ...conv, folderId } : conv
          )
        });
      },
      
      // Skills actions
      setActiveSkills: (skills) => {
        set({ activeSkills: skills.filter(s => s.enabled) });
      },
      
      // Rename action
      renameConversation: (id, newTitle) => {
        set({
          conversations: get().conversations.map(conv =>
            conv.id === id ? { ...conv, title: newTitle } : conv
          )
        });
      },
      
      // Edit message action
      updateMessageContent: (convId, msgIndex, newContent) => {
        set({
          conversations: get().conversations.map(conv => {
            if (conv.id !== convId) return conv;
            const updatedMessages = [...conv.messages];
            if (msgIndex >= 0 && msgIndex < updatedMessages.length) {
              updatedMessages[msgIndex] = { ...updatedMessages[msgIndex], content: newContent };
            }
            return { ...conv, messages: updatedMessages };
          })
        });
      },
      
      deleteMessage: (convId, msgIndex) => {
        set({
          conversations: get().conversations.map(conv => {
            if (conv.id !== convId) return conv;
            const updatedMessages = conv.messages.filter((_, i) => i !== msgIndex);
            return { ...conv, messages: updatedMessages };
          })
        });
      },
      
      setInputText: (text) => {
        set({ inputText: text });
      },
      
      // Branch actions
      createBranch: (convId, branchName, fromMessageIndex) => {
        const conv = get().conversations.find(c => c.id === convId);
        if (!conv) return;
        
        // Get messages up to and including the branch point
        const branchMessages = conv.messages.slice(0, fromMessageIndex + 1);
        
        const newBranch: Branch = {
          id: Date.now().toString(),
          name: branchName,
          messages: branchMessages,
          createdAt: new Date().toISOString(),
          parentMessageIndex: fromMessageIndex
        };
        
        set({
          conversations: get().conversations.map(c => {
            if (c.id !== convId) return c;
            // Save current state before creating branch
            let mainMsgs: Message[];
            let updatedBranches = [...c.branches];
            
            if (c.activeBranchId) {
              // Currently on a branch — save current messages back to that branch first
              updatedBranches = updatedBranches.map(b =>
                b.id === c.activeBranchId ? { ...b, messages: c.messages } : b
              );
              // Preserve existing mainThreadMessages
              mainMsgs = c.mainThreadMessages && c.mainThreadMessages.length > 0
                ? c.mainThreadMessages : c.messages;
            } else {
              // Currently on main thread — save current messages as mainThreadMessages
              mainMsgs = c.messages;
            }
            
            return {
              ...c,
              branches: [...updatedBranches, newBranch],
              mainThreadMessages: mainMsgs,
              activeBranchId: newBranch.id,
              messages: branchMessages // Switch to branch view
            };
          })
        });
      },
      
      switchBranch: (convId, branchId) => {
        const conv = get().conversations.find(c => c.id === convId);
        if (!conv) return;
        
        // Save current messages back to the active source before switching
        let updatedBranches = [...conv.branches];
        let updatedMainThread = conv.mainThreadMessages;
        
        if (conv.activeBranchId) {
          // Currently on a branch — save messages back to that branch
          updatedBranches = updatedBranches.map(b =>
            b.id === conv.activeBranchId ? { ...b, messages: conv.messages } : b
          );
        } else {
          // Currently on main thread — save messages to mainThreadMessages
          updatedMainThread = conv.messages;
        }
        
        // If branchId is empty, switch to main thread
        if (!branchId) {
          const mainMsgs = updatedMainThread && updatedMainThread.length > 0
            ? updatedMainThread : conv.messages;
          set({
            conversations: get().conversations.map(c => {
              if (c.id !== convId) return c;
              return {
                ...c,
                branches: updatedBranches,
                mainThreadMessages: mainMsgs,
                activeBranchId: null,
                messages: mainMsgs
              };
            })
          });
          return;
        }
        
        const branch = updatedBranches.find(b => b.id === branchId);
        if (!branch) return;
        
        set({
          conversations: get().conversations.map(c => {
            if (c.id !== convId) return c;
            return {
              ...c,
              branches: updatedBranches,
              mainThreadMessages: updatedMainThread && updatedMainThread.length > 0
                ? updatedMainThread : conv.messages,
              activeBranchId: branchId,
              messages: branch.messages
            };
          })
        });
      },
      
      deleteBranch: (convId, branchId) => {
        set({
          conversations: get().conversations.map(c => {
            if (c.id !== convId) return c;
            const isDeletingActive = c.activeBranchId === branchId;
            const mainMsgs = c.mainThreadMessages && c.mainThreadMessages.length > 0
              ? c.mainThreadMessages : c.messages;
            return {
              ...c,
              branches: c.branches.filter(b => b.id !== branchId),
              activeBranchId: isDeletingActive ? null : c.activeBranchId,
              messages: isDeletingActive ? mainMsgs : c.messages
            };
          })
        });
      },
      
      // Usage stats
      trackUsage: (tokens) => {
        const today = new Date().toISOString().split('T')[0];
        const stats = get().usageStats;
        
        set({
          usageStats: {
            ...stats,
            totalMessages: stats.totalMessages + 1,
            totalTokens: stats.totalTokens + tokens,
            totalConversations: get().conversations.length,
            lastUpdated: new Date().toISOString(),
            dailyStats: {
              ...stats.dailyStats,
              [today]: {
                messages: (stats.dailyStats[today]?.messages || 0) + 1,
                tokens: (stats.dailyStats[today]?.tokens || 0) + tokens,
                conversations: stats.dailyStats[today]?.conversations || get().conversations.length
              }
            }
          }
        });
      },
      
      getUsageStats: () => get().usageStats,
      
      // Stop streaming
      stopStreaming: () => {
        const controller = get().abortController;
        if (controller) {
          controller.abort();
        }
        set({ isStreaming: false, streamingPhase: null, abortController: null });
      },
      
      setStreamingPhase: (phase) => set({ streamingPhase: phase }),
      setAbortController: (controller) => set({ abortController: controller }),
      
      // Auto-title generation actions
      setGeneratingTitle: (isGenerating, title = null, messageIndex = null) => {
        set({
          isGeneratingTitle: isGenerating,
          suggestedTitle: title,
          titleMessageIndex: messageIndex
        });
        
        // Auto-accept generated title (no need for user to click accept)
        if (!isGenerating && title && messageIndex !== null) {
          const convId = get().currentConversationId;
          if (convId) {
            set({
              conversations: get().conversations.map(c => {
                if (c.id !== convId) return c;
                return { ...c, title };
              }),
              suggestedTitle: null,
              titleMessageIndex: null
            });
          }
        }
      },
      
      acceptSuggestedTitle: (conversationId) => {
        const state = get();
        const title = state.suggestedTitle;
        if (!title) return;
        
        set({
          conversations: get().conversations.map(c => {
            if (c.id !== conversationId) return c;
            return { ...c, title };
          }),
          suggestedTitle: null,
          titleMessageIndex: null
        });
      },
      
      dismissSuggestedTitle: () => set({
        suggestedTitle: null,
        titleMessageIndex: null
      }),
      
      // Follow-up suggestions actions
      setFollowUpSuggestions: (suggestions) => set({ followUpSuggestions: suggestions }),
      
      toggleFollowUpSuggestions: () => set((state) => ({ 
        showFollowUpSuggestions: !state.showFollowUpSuggestions 
      })),
      
      toggleTranslateMode: () => set((state) => ({ 
        translateMode: state.translateMode === 'to-en' ? 'to-id' : 'to-en' 
      })),
      
      clearFollowUpSuggestions: () => set({ followUpSuggestions: [] }),
      
      // Regenerate last AI response
      regenerateLastResponse: (convId) => {
        set({
          conversations: get().conversations.map(conv => {
            if (conv.id !== convId) return conv;
            const msgs = [...conv.messages];
            for (let i = msgs.length - 1; i >= 0; i--) {
              if (msgs[i].role === 'assistant') {
                msgs.splice(i, 1);
                break;
              }
            }
            return { ...conv, messages: msgs };
          })
        });
      },
      
      // Theme
      setTheme: (theme) => {
        set({ settings: { ...get().settings, theme } });
      },
      
      // Tags
      addTag: (convId, tag) => {
        set({
          conversations: get().conversations.map(conv => {
            if (conv.id !== convId) return conv;
            if (conv.tags?.includes(tag)) return conv;
            return { ...conv, tags: [...(conv.tags || []), tag] };
          })
        });
      },
      
      removeTag: (convId, tag) => {
        set({
          conversations: get().conversations.map(conv => {
            if (conv.id !== convId) return conv;
            return { ...conv, tags: (conv.tags || []).filter(t => t !== tag) };
          })
        });
      },
      
      // System prompt per conversation
      setConversationSystemPrompt: (convId, prompt) => {
        set({
          conversations: get().conversations.map(conv => {
            if (conv.id !== convId) return conv;
            return { ...conv, systemPrompt: prompt };
          })
        });
      },
      
      // Output Mode
      setGlobalOutputMode: (mode) => set({ globalOutputMode: mode }),
      setConversationOutputMode: (convId, mode) => {
        set({
          conversations: get().conversations.map(conv => {
            if (conv.id !== convId) return conv;
            return { ...conv, outputMode: mode };
          })
        });
      },
      
      // Clear messages in a conversation
      clearConversationMessages: (convId) => {
        set({
          conversations: get().conversations.map(conv => {
            if (conv.id !== convId) return conv;
            return { ...conv, messages: [] };
          })
        });
      }
    }),
    {
      name: 'aiham_conversations_v4',
      partialize: (state) => ({ 
        conversations: state.conversations.map(conv => ({
          ...conv,
          // Ensure mainThreadMessages is always set (migration for old conversations)
          mainThreadMessages: conv.mainThreadMessages && conv.mainThreadMessages.length > 0
            ? conv.mainThreadMessages : conv.messages
        })), 
        selectedModel: state.selectedModel,
        folders: state.folders,
        settings: state.settings,
        activeSkills: state.activeSkills,
        usageStats: state.usageStats,
        globalOutputMode: state.globalOutputMode
      }),
    }
  )
);

