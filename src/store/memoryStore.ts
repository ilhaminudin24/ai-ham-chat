import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CreateMemoryInput, MemoryItem, MemorySuggestionInput } from '../types/memory';
import { extractMemorySuggestionsFromText, getRelevantMemories as selectRelevantMemories, normalizeMemoryContent } from '../utils/memory';

interface MemoryState {
  memories: MemoryItem[];
  setMemories: (memories: MemoryItem[]) => void;
  addMemory: (input: CreateMemoryInput) => MemoryItem | null;
  updateMemory: (id: string, updates: Partial<Omit<MemoryItem, 'id' | 'createdAt'>>) => void;
  deleteMemory: (id: string) => void;
  togglePin: (id: string) => void;
  toggleEnabled: (id: string) => void;
  confirmMemory: (id: string) => void;
  archiveMemory: (id: string) => void;
  clearAllMemories: () => void;
  clearArchivedMemories: () => void;
  captureSuggestionsFromText: (sourceConversationId: string | null, text: string) => void;
  getRelevantMemories: (query: string, limit?: number) => MemoryItem[];
  markMemoriesUsed: (ids: string[]) => void;
}

const createMemoryItem = (input: CreateMemoryInput): MemoryItem => {
  const now = new Date().toISOString();
  const normalized = normalizeMemoryContent(input.content);

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    content: normalized,
    category: input.category,
    status: input.status ?? 'confirmed',
    origin: input.origin ?? 'manual',
    sourceConversationId: input.sourceConversationId ?? null,
    sourceSnippet: input.sourceSnippet ?? null,
    pinned: input.pinned ?? false,
    enabled: input.enabled ?? true,
    reviewRequired: input.reviewRequired ?? false,
    isSensitive: input.isSensitive ?? false,
    confidence: input.confidence ?? 1,
    createdAt: now,
    updatedAt: now,
    lastUsedAt: null,
  };
};

const sameMemory = (a: string, b: string) => normalizeMemoryContent(a).toLowerCase() === normalizeMemoryContent(b).toLowerCase();

const mergeSuggestion = (existing: MemoryItem, incoming: MemorySuggestionInput): MemoryItem => ({
  ...existing,
  category: existing.status === 'confirmed' ? existing.category : incoming.category,
  sourceConversationId: incoming.sourceConversationId ?? existing.sourceConversationId,
  sourceSnippet: incoming.sourceSnippet ?? existing.sourceSnippet,
  isSensitive: existing.isSensitive || Boolean(incoming.isSensitive),
  confidence: Math.max(existing.confidence, incoming.confidence ?? existing.confidence),
  updatedAt: new Date().toISOString(),
});

export const useMemoryStore = create<MemoryState>()(
  persist(
    (set, get) => ({
      memories: [],

      setMemories: (memories) => set({ memories }),

      addMemory: (input) => {
        const normalized = normalizeMemoryContent(input.content);
        if (!normalized) return null;

        const existing = get().memories.find(memory => sameMemory(memory.content, normalized));
        if (existing) {
          get().updateMemory(existing.id, {
            category: input.category,
            status: input.status ?? existing.status,
            origin: input.origin ?? existing.origin,
            pinned: input.pinned ?? existing.pinned,
            enabled: input.enabled ?? existing.enabled,
            reviewRequired: input.reviewRequired ?? existing.reviewRequired,
            isSensitive: input.isSensitive ?? existing.isSensitive,
            confidence: input.confidence ?? existing.confidence,
            sourceConversationId: input.sourceConversationId ?? existing.sourceConversationId,
            sourceSnippet: input.sourceSnippet ?? existing.sourceSnippet,
          });
          return get().memories.find(memory => memory.id === existing.id) ?? existing;
        }

        const memory = createMemoryItem({ ...input, content: normalized });
        set({ memories: [memory, ...get().memories] });
        return memory;
      },

      updateMemory: (id, updates) => {
        set({
          memories: get().memories.map(memory =>
            memory.id === id
              ? {
                  ...memory,
                  ...updates,
                  content: updates.content ? normalizeMemoryContent(updates.content) : memory.content,
                  updatedAt: new Date().toISOString(),
                }
              : memory
          ),
        });
      },

      deleteMemory: (id) => {
        set({ memories: get().memories.filter(memory => memory.id !== id) });
      },

      togglePin: (id) => {
        set({
          memories: get().memories.map(memory =>
            memory.id === id ? { ...memory, pinned: !memory.pinned, updatedAt: new Date().toISOString() } : memory
          ),
        });
      },

      toggleEnabled: (id) => {
        set({
          memories: get().memories.map(memory =>
            memory.id === id ? { ...memory, enabled: !memory.enabled, updatedAt: new Date().toISOString() } : memory
          ),
        });
      },

      confirmMemory: (id) => {
        set({
          memories: get().memories.map(memory =>
            memory.id === id
              ? { ...memory, status: 'confirmed', reviewRequired: false, enabled: true, updatedAt: new Date().toISOString() }
              : memory
          ),
        });
      },

      archiveMemory: (id) => {
        set({
          memories: get().memories.map(memory =>
            memory.id === id ? { ...memory, status: 'archived', updatedAt: new Date().toISOString() } : memory
          ),
        });
      },

      clearAllMemories: () => set({ memories: [] }),

      clearArchivedMemories: () => {
        set({ memories: get().memories.filter(memory => memory.status !== 'archived') });
      },

      captureSuggestionsFromText: (sourceConversationId, text) => {
        const suggestions = extractMemorySuggestionsFromText(text, sourceConversationId);
        if (suggestions.length === 0) return;

        const now = new Date().toISOString();
        const updated = [...get().memories];

        for (const suggestion of suggestions) {
          const existingIndex = updated.findIndex(memory => sameMemory(memory.content, suggestion.content));
          if (existingIndex >= 0) {
            updated[existingIndex] = mergeSuggestion(updated[existingIndex], suggestion);
            continue;
          }

          updated.unshift(
            createMemoryItem({
              content: suggestion.content,
              category: suggestion.category,
              status: 'suggested',
              origin: 'suggested',
              sourceConversationId: suggestion.sourceConversationId ?? null,
              sourceSnippet: suggestion.sourceSnippet ?? null,
              reviewRequired: true,
              isSensitive: Boolean(suggestion.isSensitive),
              confidence: suggestion.confidence ?? 0.75,
            })
          );
        }

        set({
          memories: updated.map(memory => (memory.updatedAt ? memory : { ...memory, updatedAt: now })),
        });
      },

      getRelevantMemories: (query, limit = 6) => selectRelevantMemories(get().memories, query, limit),

      markMemoriesUsed: (ids) => {
        if (ids.length === 0) return;
        const stamp = new Date().toISOString();
        set({
          memories: get().memories.map(memory =>
            ids.includes(memory.id) ? { ...memory, lastUsedAt: stamp } : memory
          ),
        });
      },
    }),
    {
      name: 'aiham_memories_v1',
      partialize: (state) => ({ memories: state.memories }),
    }
  )
);
