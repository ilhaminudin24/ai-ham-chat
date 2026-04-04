export type MemoryCategory = 'preference' | 'personal' | 'project' | 'workstyle' | 'reference';

export type MemoryStatus = 'suggested' | 'confirmed' | 'archived';

export type MemoryOrigin = 'manual' | 'suggested';

export interface MemoryItem {
  id: string;
  content: string;
  category: MemoryCategory;
  status: MemoryStatus;
  origin: MemoryOrigin;
  sourceConversationId: string | null;
  sourceSnippet: string | null;
  pinned: boolean;
  enabled: boolean;
  reviewRequired: boolean;
  isSensitive: boolean;
  confidence: number;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
}

export interface CreateMemoryInput {
  content: string;
  category: MemoryCategory;
  status?: MemoryStatus;
  origin?: MemoryOrigin;
  sourceConversationId?: string | null;
  sourceSnippet?: string | null;
  pinned?: boolean;
  enabled?: boolean;
  reviewRequired?: boolean;
  isSensitive?: boolean;
  confidence?: number;
}

export interface MemorySuggestionInput {
  content: string;
  category: MemoryCategory;
  sourceConversationId?: string | null;
  sourceSnippet?: string | null;
  isSensitive?: boolean;
  confidence?: number;
}
