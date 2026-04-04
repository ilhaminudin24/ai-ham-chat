import { useChatStore, type Conversation } from '../store/chatStore';
import { useMemoryStore } from '../store/memoryStore';
import { supabase } from './supabase';
import type { MemoryItem } from '../types/memory';

let currentUserId: string | null = null;
let unsubscribeConversations: (() => void) | null = null;
let unsubscribeMemories: (() => void) | null = null;

export const initSupabaseSync = async (userId: string) => {
  if (currentUserId === userId) return;
  currentUserId = userId;

  // 1. Initial Fetch from Cloud
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (!error && data && data.length > 0) {
    const cloudConvs: Conversation[] = data.map((row: Record<string, unknown>) => ({
      id: String(row.id),
      title: row.title as string,
      messages: (row.messages as Conversation['messages']) || [],
      mainThreadMessages: (row.messages as Conversation['messages']) || [],
      branches: [], 
      activeBranchId: null,
      createdAt: row.created_at as string,
      folderId: null,
      isPinned: false,
      tags: []
    }));

    // For smooth transition, merge with LocalStorage if this is the first login
    // Or just overwrite. We will completely overwrite with cloud source-of-truth.
    useChatStore.setState({ 
        conversations: cloudConvs,
        currentConversationId: cloudConvs.length > 0 ? cloudConvs[0].id : null
    });
  }

  const { data: memoryData, error: memoryError } = await supabase
    .from('memories')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (!memoryError && memoryData) {
    const cloudMemories: MemoryItem[] = memoryData.map((row: Record<string, unknown>) => ({
      id: String(row.id),
      content: String(row.content ?? ''),
      category: (row.category as MemoryItem['category']) ?? 'reference',
      status: (row.status as MemoryItem['status']) ?? 'confirmed',
      origin: (row.origin as MemoryItem['origin']) ?? 'manual',
      sourceConversationId: row.source_conversation_id ? String(row.source_conversation_id) : null,
      sourceSnippet: row.source_snippet ? String(row.source_snippet) : null,
      pinned: Boolean(row.pinned),
      enabled: row.enabled !== false,
      reviewRequired: Boolean(row.review_required),
      isSensitive: Boolean(row.is_sensitive),
      confidence: typeof row.confidence === 'number' ? row.confidence : Number(row.confidence ?? 1),
      createdAt: String(row.created_at ?? new Date().toISOString()),
      updatedAt: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
      lastUsedAt: row.last_used_at ? String(row.last_used_at) : null,
    }));

    if (cloudMemories.length > 0) {
      useMemoryStore.setState({ memories: cloudMemories });
    }
  }

  // 2. Subscribe to state changes and sync incrementally
  if (unsubscribeConversations) unsubscribeConversations();
  if (unsubscribeMemories) unsubscribeMemories();
  
  let previousConvs = useChatStore.getState().conversations;
  let previousMemories = useMemoryStore.getState().memories;

  unsubscribeConversations = useChatStore.subscribe((state) => {
    if (!currentUserId) return; // logged out

    const newConvs = state.conversations;
    
    // Find what changed or was added
    newConvs.forEach(conv => {
      const prevConv = previousConvs.find(p => p.id === conv.id);
      if (prevConv !== conv) {
        // Upsert to Supabase
        // Note: Using standard timeout debounce could be better, but firing promises directly is fine for this scale
        supabase.from('conversations').upsert({
          id: conv.id,
          user_id: currentUserId,
          title: conv.title,
          messages: conv.messages,
          updated_at: new Date().toISOString()
        }).then(({error}) => {
          if (error) console.error("Error syncing chat to Supabase", error);
        });
      }
    });

    // Find what was deleted locally
    previousConvs.forEach(prevConv => {
      if (!newConvs.find(n => n.id === prevConv.id)) {
        supabase.from('conversations').delete().eq('id', prevConv.id).then();
      }
    });

    previousConvs = newConvs;
  });

  unsubscribeMemories = useMemoryStore.subscribe((state) => {
    if (!currentUserId) return;

    const newMemories = state.memories;

    newMemories.forEach(memory => {
      const prevMemory = previousMemories.find(item => item.id === memory.id);
      if (prevMemory !== memory) {
        supabase.from('memories').upsert({
          id: memory.id,
          user_id: currentUserId,
          content: memory.content,
          category: memory.category,
          status: memory.status,
          origin: memory.origin,
          source_conversation_id: memory.sourceConversationId,
          source_snippet: memory.sourceSnippet,
          pinned: memory.pinned,
          enabled: memory.enabled,
          review_required: memory.reviewRequired,
          is_sensitive: memory.isSensitive,
          confidence: memory.confidence,
          created_at: memory.createdAt,
          updated_at: memory.updatedAt,
          last_used_at: memory.lastUsedAt,
        }).then(({ error: syncError }) => {
          if (syncError) console.error('Error syncing memories to Supabase', syncError);
        });
      }
    });

    previousMemories.forEach(prevMemory => {
      if (!newMemories.find(memory => memory.id === prevMemory.id)) {
        supabase.from('memories').delete().eq('id', prevMemory.id).then(({ error: deleteError }) => {
          if (deleteError) console.error('Error deleting memory from Supabase', deleteError);
        });
      }
    });

    previousMemories = newMemories;
  });
};

export const clearSupabaseSync = () => {
    currentUserId = null;
    if (unsubscribeConversations) {
        unsubscribeConversations();
        unsubscribeConversations = null;
    }
    if (unsubscribeMemories) {
        unsubscribeMemories();
        unsubscribeMemories = null;
    }
}
