// Shared Link types
export interface SharedMessage {
  role: 'user' | 'assistant' | 'ai';
  content: string;
  image?: string | null;
}

export interface SharedConversation {
  id: string;
  title: string;
  messages: SharedMessage[];
  sharedBy: string;
  createdAt: string;
}

// Usage Stats types
export interface DailyStats {
  date: string;
  messages: number;
  conversations: number;
  tokens: number; // estimated
}

export interface UsageStats {
  totalTokens: number;
  totalMessages: number;
  totalConversations: number;
  lastUpdated: string;
  dailyStats: Record<string, DailyStats>;
}
