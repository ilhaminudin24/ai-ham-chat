import { useChatStore, type Message } from '../store/chatStore';

// Accessing injected config from server or Vite env fallback
const API_TOKEN = (window as any).API_TOKEN || import.meta.env.VITE_API_TOKEN || '';
const API_BASE = '/v1';

export const sendChatRequest = async (
  conversationId: string, 
  messages: Message[], 
  modelId: string
) => {
  const store = useChatStore.getState();
  
  try {
    store.setStreaming(true);

    // Initial placeholder for AI message
    store.addMessage(conversationId, { role: 'assistant', content: '' });

    // Map to API format
    const apiMessages = messages.map((m) => {
      if (m.image) {
        return {
          role: m.role,
          content: [
            { type: 'text', text: m.content || '[Image]' },
            { type: 'image_url', image_url: { url: m.image } }
          ]
        };
      }
      return { role: m.role, content: m.content };
    });

    const response = await fetch(`${API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`,
        'x-openclaw-model': modelId
      },
      body: JSON.stringify({
        model: 'openclaw/default', // the actual API expects this static model value
        messages: apiMessages,
        stream: true
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    
    if (!reader) throw new Error("Stream not readable");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6).trim();
          if (dataStr === '[DONE]') continue;
          
          try {
            if (!dataStr) continue;
            const json = JSON.parse(dataStr);
            const delta = json.choices?.[0]?.delta?.content;
            
            if (delta) {
              store.updateLastMessage(conversationId, delta);
            }
          } catch (e) {
            // Error parsing this specific chunk, ignore and continue
            console.error('JSON parse error on delta', e);
          }
        }
      }
    }
  } catch (error: any) {
    console.error('Streaming request failed:', error);
    store.updateLastMessage(conversationId, `\n\n**Error:** ${error.message || 'Unknown error occurred.'}`);
  } finally {
    store.setStreaming(false);
  }
};
