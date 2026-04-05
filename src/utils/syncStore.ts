import { useChatStore, type Conversation } from '../store/chatStore';
import { useMemoryStore } from '../store/memoryStore';
import { supabase } from './supabase';
import type { MemoryItem } from '../types/memory';

let currentUserId: string | null = null;
let unsubscribeConversations: (() => void) | null = null;
let unsubscribeMemories: (() => void) | null = null;

// ---------------------------------------------------------------------------
// Debounced sync — prevents flooding Supabase during streaming (100-500+ upserts
// per response).  Conversations are batched and flushed at most once every SYNC_DEBOUNCE_MS
// while streaming, and once immediately after streaming ends.
// ---------------------------------------------------------------------------
const SYNC_DEBOUNCE_MS = 3000;
const pendingConvUpserts = new Map<string, Conversation>();
const pendingConvDeletes = new Set<string>();
let convSyncTimer: ReturnType<typeof setTimeout> | null = null;

const flushConversationSync = () => {
  if (convSyncTimer) { clearTimeout(convSyncTimer); convSyncTimer = null; }
  if (!currentUserId) return;

  const userId = currentUserId;

  // Process upserts
  for (const conv of pendingConvUpserts.values()) {
    supabase.from('conversations').upsert({
      id: conv.id,
      user_id: userId,
      title: conv.title,
      messages: conv.messages,
      updated_at: new Date().toISOString()
    }).then(({ error }) => {
      if (error) console.error('Error syncing chat to Supabase', error);
    });
  }
  pendingConvUpserts.clear();

  // Process deletes
  for (const id of pendingConvDeletes) {
    supabase.from('conversations').delete().eq('id', id).then();
  }
  pendingConvDeletes.clear();
};

// Memory sync is less frequent so a simpler debounce suffices
const MEMORY_SYNC_DEBOUNCE_MS = 2000;
let memorySyncTimer: ReturnType<typeof setTimeout> | null = null;
const pendingMemoryUpserts = new Map<string, MemoryItem>();
const pendingMemoryDeletes = new Set<string>();

const flushMemorySync = () => {
  if (memorySyncTimer) { clearTimeout(memorySyncTimer); memorySyncTimer = null; }
  if (!currentUserId) return;

  const userId = currentUserId;

  for (const memory of pendingMemoryUpserts.values()) {
    supabase.from('memories').upsert({
      id: memory.id,
      user_id: userId,
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
  pendingMemoryUpserts.clear();

  for (const id of pendingMemoryDeletes) {
    supabase.from('memories').delete().eq('id', id).then(({ error: deleteError }) => {
      if (deleteError) console.error('Error deleting memory from Supabase', deleteError);
    });
  }
  pendingMemoryDeletes.clear();
};

const scheduleMemorySync = () => {
  if (!memorySyncTimer) {
    memorySyncTimer = setTimeout(flushMemorySync, MEMORY_SYNC_DEBOUNCE_MS);
  }
};

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

  // 2. Subscribe to state changes with debounced sync
  if (unsubscribeConversations) unsubscribeConversations();
  if (unsubscribeMemories) unsubscribeMemories();
  
  let previousConvs = useChatStore.getState().conversations;
  let previousMemories = useMemoryStore.getState().memories;

  unsubscribeConversations = useChatStore.subscribe((state) => {
    if (!currentUserId) return;

    const newConvs = state.conversations;
    
    newConvs.forEach(conv => {
      const prevConv = previousConvs.find(p => p.id === conv.id);
      if (prevConv !== conv) {
        pendingConvUpserts.set(conv.id, conv);
      }
    });

    previousConvs.forEach(prevConv => {
      if (!newConvs.find(n => n.id === prevConv.id)) {
        pendingConvDeletes.add(prevConv.id);
        pendingConvUpserts.delete(prevConv.id);
      }
    });

    previousConvs = newConvs;

    // If not streaming, flush faster (1s); while streaming, use longer debounce
    if (convSyncTimer) clearTimeout(convSyncTimer);
    const delay = state.isStreaming ? SYNC_DEBOUNCE_MS : 1000;
    convSyncTimer = setTimeout(flushConversationSync, delay);
  });

  unsubscribeMemories = useMemoryStore.subscribe((state) => {
    if (!currentUserId) return;

    const newMemories = state.memories;

    newMemories.forEach(memory => {
      const prevMemory = previousMemories.find(item => item.id === memory.id);
      if (prevMemory !== memory) {
        pendingMemoryUpserts.set(memory.id, memory);
      }
    });

    previousMemories.forEach(prevMemory => {
      if (!newMemories.find(memory => memory.id === prevMemory.id)) {
        pendingMemoryDeletes.add(prevMemory.id);
        pendingMemoryUpserts.delete(prevMemory.id);
      }
    });

    previousMemories = newMemories;
    scheduleMemorySync();
  });
};

export const clearSupabaseSync = () => {
    // Flush any pending changes before disconnecting
    flushConversationSync();
    flushMemorySync();

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
