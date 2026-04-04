import { useChatStore, type Conversation } from '../store/chatStore';
import { supabase } from './supabase';

let currentUserId: string | null = null;
let unsubscribe: (() => void) | null = null;

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

  // 2. Subscribe to state changes and sync incrementally
  if (unsubscribe) unsubscribe();
  
  let previousConvs = useChatStore.getState().conversations;

  unsubscribe = useChatStore.subscribe((state) => {
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
};

export const clearSupabaseSync = () => {
    currentUserId = null;
    if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
    }
}
