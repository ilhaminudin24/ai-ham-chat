import { useChatStore, type Message } from '../store/chatStore';
import { generateSkillsSystemPrompt } from './skillApi';

// Accessing injected config from server or Vite env fallback
const API_TOKEN = (window as any).API_TOKEN || import.meta.env.VITE_API_TOKEN || '';
const API_BASE = '/v1';

// Base system prompt
const BASE_SYSTEM_PROMPT = `You are AI-HAM, a helpful, intelligent, and friendly AI assistant. You are designed to assist Boss Ilham with various tasks including answering questions, providing information, helping with projects, and engaging in meaningful conversations. Your goal is to be helpful, accurate, and reliable. Always maintain a caring and supportive tone while being intelligent and practical in your responses.`;

export const sendChatRequest = async (
  conversationId: string, 
  messages: Message[], 
  modelId: string
) => {
  const store = useChatStore.getState();
  const abortController = new AbortController();

  try {
    store.setAbortController(abortController);
    store.setStreaming(true);
    store.setStreamingPhase('connecting');

    // Initial placeholder for AI message
    store.addMessage(conversationId, { role: 'assistant', content: '' });

    // Build system prompt with skills
    const activeSkills = store.activeSkills;
    const skillsPrompt = generateSkillsSystemPrompt(activeSkills);
    const fullSystemPrompt = skillsPrompt 
      ? `${BASE_SYSTEM_PROMPT}\n\n${skillsPrompt}`
      : BASE_SYSTEM_PROMPT;

    // Map to API format - add system prompt at the beginning
    const apiMessages = [
      { role: 'system', content: fullSystemPrompt },
      ...messages.map((m) => {
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
      })
    ];

    store.setStreamingPhase('thinking');

    const response = await fetch(`${API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`,
        'x-openclaw-model': modelId
      },
      body: JSON.stringify({
        model: 'openclaw/default',
        messages: apiMessages,
        stream: true
      }),
      signal: abortController.signal
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    
    if (!reader) throw new Error("Stream not readable");

    let firstToken = true;

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
              if (firstToken) {
                store.setStreamingPhase('streaming');
                firstToken = false;
              }
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
    if (error.name === 'AbortError') {
      // User cancelled streaming — don't show error
      return;
    }
    console.error('Streaming request failed:', error);
    store.updateLastMessage(conversationId, `\n\n**Error:** ${error.message || 'Unknown error occurred.'}`);
  } finally {
    store.setStreaming(false);
    store.setStreamingPhase(null);
    store.setAbortController(null);
  }
};
