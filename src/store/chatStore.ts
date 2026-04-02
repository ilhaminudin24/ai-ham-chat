import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Skill } from '../types/skills';

export interface Message {
  role: 'user' | 'assistant' | 'ai';
  content: string;
  image?: string | null;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  folderId: string | null;
  isPinned: boolean;
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
}

const defaultFolders: Folder[] = [
  { id: 'today', name: 'Today', icon: '📅', order: 0 },
  { id: 'work', name: 'Work', icon: '💼', order: 1 },
  { id: 'personal', name: 'Personal', icon: '🏠', order: 2 },
  { id: 'archived', name: 'Archived', icon: '📦', order: 3 },
];

const defaultSettings: Settings = {
  soundEnabled: true,
  defaultModel: 'minimax/MiniMax-M2.7'
};

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      currentConversationId: null,
      isStreaming: false,
      isSidebarOpen: false,
      selectedModel: 'minimax/MiniMax-M2.7',
      folders: defaultFolders,
      searchQuery: '',
      settings: defaultSettings,
      activeSkills: [],

      createNewConversation: () => {
        const id = Date.now().toString();
        const newConv: Conversation = {
          id,
          title: 'New Chat',
          messages: [],
          createdAt: new Date().toISOString(),
          folderId: null,
          isPinned: false
        };
        set({
          conversations: [newConv, ...get().conversations],
          currentConversationId: id,
          isSidebarOpen: false
        });
      },

      setCurrentConversation: (id) => {
        set({ currentConversationId: id, isSidebarOpen: false });
      },

      addMessage: (conversationId, message) => {
        set((state) => {
          const updatedConvs = state.conversations.map((conv) => {
            if (conv.id === conversationId) {
              const updatedMessages = [...conv.messages, message];
              let newTitle = conv.title;
              if (updatedMessages.length === 1 && message.role === 'user') {
                newTitle = (message.content || 'Image').slice(0, 35);
                if ((message.content || 'Image').length > 35) newTitle += '...';
              }
              return { ...conv, messages: updatedMessages, title: newTitle };
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
              return { ...conv, messages: updatedMessages };
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
      }
    }),
    {
      name: 'aiham_conversations_v4',
      partialize: (state) => ({ 
        conversations: state.conversations, 
        selectedModel: state.selectedModel,
        folders: state.folders,
        settings: state.settings,
        activeSkills: state.activeSkills
      }),
    }
  )
);
