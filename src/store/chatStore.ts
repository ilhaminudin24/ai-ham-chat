import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
}

export interface ChatState {
  conversations: Conversation[];
  currentConversationId: string | null;
  isStreaming: boolean;
  isSidebarOpen: boolean;
  selectedModel: string;
  
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
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      currentConversationId: null,
      isStreaming: false,
      isSidebarOpen: false,
      selectedModel: 'minimax/MiniMax-M2.7',

      createNewConversation: () => {
        const id = Date.now().toString();
        const newConv: Conversation = {
          id,
          title: 'New Chat',
          messages: [],
          createdAt: new Date().toISOString()
        };
        set({
          conversations: [newConv, ...get().conversations],
          currentConversationId: id,
          isSidebarOpen: false // close sidebar on mobile when creating
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
              // Update title if it's the first user message
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
      deleteConversation: (id) => set((state) => {
         const filtered = state.conversations.filter(c => c.id !== id);
         return {
           conversations: filtered,
           currentConversationId: state.currentConversationId === id 
              ? (filtered.length > 0 ? filtered[0].id : null) 
              : state.currentConversationId
         };
      })
    }),
    {
      name: 'aiham_conversations_v2', // unique name
      partialize: (state) => ({ 
        conversations: state.conversations, 
        selectedModel: state.selectedModel 
      }),
    }
  )
);
