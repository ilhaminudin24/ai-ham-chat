import { useChatStore, type Message, type FileAttachment } from '../store/chatStore';
import { useMemoryStore } from '../store/memoryStore';
import { generateSkillsSystemPrompt } from './skillApi';
import { extractTextFromPdf } from './pdf';
import { formatMemoriesForPrompt } from './memory';
import { generateTitle } from './title';
import { generateSuggestions } from './suggestions';

// Accessing injected config from server or Vite env fallback
const API_TOKEN = window.API_TOKEN || import.meta.env.VITE_API_TOKEN || '';
const API_BASE = '/v1';

// Base system prompt
const BASE_SYSTEM_PROMPT = `You are AI-HAM, a helpful, intelligent, and friendly AI assistant. You are designed to assist Boss Ilham with various tasks including answering questions, providing information, helping with projects, and engaging in meaningful conversations. Your goal is to be helpful, accurate, and reliable. Always maintain a caring and supportive tone while being intelligent and practical in your responses.`;

// ---------------------------------------------------------------------------
// RAF-batched token flusher — collects SSE tokens and flushes to the store at
// most once per animation frame (~60 Hz), reducing 500+ set() calls to ~60/sec.
// ---------------------------------------------------------------------------
const createTokenBatcher = (conversationId: string) => {
  let buffer = '';
  let rafId: number | null = null;

  const flush = () => {
    rafId = null;
    if (buffer) {
      useChatStore.getState().updateLastMessage(conversationId, buffer);
      buffer = '';
    }
  };

  return {
    push(token: string) {
      buffer += token;
      if (rafId === null) {
        rafId = requestAnimationFrame(flush);
      }
    },
    /** Force-flush any remaining buffered tokens (call when stream ends). */
    flush() {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (buffer) {
        useChatStore.getState().updateLastMessage(conversationId, buffer);
        buffer = '';
      }
    },
  };
};

export const sendChatRequest = async (
  conversationId: string, 
  messages: Message[], 
  modelId: string
) => {
  const store = useChatStore.getState();
  const abortController = new AbortController();
  const batcher = createTokenBatcher(conversationId);

  try {
    store.setAbortController(abortController);
    store.setStreaming(true);
    store.setStreamingPhase('connecting');

    // Initial placeholder for AI message
    store.addMessage(conversationId, { role: 'assistant', content: '' });

    // Build system prompt with skills + conversation-specific prompt
    const activeSkills = store.activeSkills;
    const skillsPrompt = generateSkillsSystemPrompt(activeSkills);
    
    // Check for conversation-specific system prompt
    const currentConv = store.conversations.find(c => c.id === conversationId);
    const convSystemPrompt = currentConv?.systemPrompt;
    
    // Determine active output mode
    const outputMode = currentConv?.outputMode || store.globalOutputMode || 'auto';
    const memoryQuery = messages
      .slice(-6)
      .map(message => message.content)
      .join('\n');
    const relevantMemories = store.settings.enableMemory
      ? useMemoryStore.getState().getRelevantMemories(memoryQuery, 6)
      : [];
    const memoryPrompt = formatMemoriesForPrompt(relevantMemories);
    
    let fullSystemPrompt = BASE_SYSTEM_PROMPT;
    if (convSystemPrompt) fullSystemPrompt += `\n\n${convSystemPrompt}`;
    if (skillsPrompt) fullSystemPrompt += `\n\n${skillsPrompt}`;
    if (memoryPrompt) fullSystemPrompt += `\n\n${memoryPrompt}`;
    
    // Inject output mode instructions
    if (outputMode === 'json') {
      fullSystemPrompt += `\n\nAlways respond with valid JSON. Wrap in \`\`\`json code block.`;
    } else if (outputMode === 'table') {
      fullSystemPrompt += `\n\nAlways format data as markdown tables.`;
    } else if (outputMode === 'code') {
      fullSystemPrompt += `\n\nOnly respond with code. No explanations unless asked.`;
    }

    // Map to API format - add system prompt at the beginning
    // Process messages async to extract PDF text
    const processedMessages = await Promise.all(
      messages.map(async (m) => {
        // Collect all images from both legacy and new format
        const images: string[] = [];
        const docFiles: FileAttachment[] = [];
        if (m.image) images.push(m.image);
        if (m.files) {
          m.files.filter(f => f.isImage).forEach(f => images.push(f.dataUrl));
          m.files.filter(f => !f.isImage).forEach(f => docFiles.push(f));
        }

        // Build content: text + images + document attachments
        type TextPart = { type: 'text'; text: string };
        type ImagePart = { type: 'image_url'; image_url: { url: string } };
        type ContentPart = TextPart | ImagePart;
        const contentParts: ContentPart[] = [];
        const textContent = m.content || '';

        // Handle images: use array content format with image_url parts
        if (images.length > 0) {
          const textPart: TextPart = { type: 'text', text: textContent || '[Image]' };
          contentParts.push(
            textPart,
            ...images.map(url => ({ type: 'image_url' as const, image_url: { url } }))
          );
          // Extract text from PDF documents and append
          for (const doc of docFiles) {
            const ext = doc.name.split('.').pop()?.toUpperCase() || 'FILE';
            if (ext === 'PDF') {
              const pdfText = await extractTextFromPdf(doc.dataUrl);
              textPart.text += `\n\n[PDF Content from ${doc.name}]:\n${pdfText}`;
            } else {
              textPart.text += `\n\n[Attached file: ${doc.name} (${ext}) — base64 encoded]\n\`\`\`\n${doc.dataUrl}\n\`\`\``;
            }
          }
          return { role: m.role, content: contentParts };
        }

        // No images — for documents, extract text; for text only, use string
        if (docFiles.length > 0) {
          let textWithDocs = textContent;
          for (const doc of docFiles) {
            const ext = doc.name.split('.').pop()?.toUpperCase() || 'FILE';
            if (ext === 'PDF') {
              const pdfText = await extractTextFromPdf(doc.dataUrl);
              textWithDocs += `\n\n[PDF Content from ${doc.name}]:\n${pdfText}`;
            } else {
              textWithDocs += `\n\n[Attached file: ${doc.name} (${ext}) — base64 encoded]\n\`\`\`\n${doc.dataUrl}\n\`\`\``;
            }
          }
          return { role: m.role, content: textWithDocs };
        }

        // No images, no documents — simple string content
        return { role: m.role, content: m.content };
      })
    );

    const apiMessages = [
      { role: 'system', content: fullSystemPrompt },
      ...processedMessages
    ];

    if (relevantMemories.length > 0) {
      useMemoryStore.getState().markMemoriesUsed(relevantMemories.map(memory => memory.id));
    }

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
              batcher.push(delta);
            }
          } catch (e) {
            // Error parsing this specific chunk, ignore and continue
            console.error('JSON parse error on delta', e);
          }
        }
      }
    }

    // Flush any remaining buffered tokens
    batcher.flush();
  } catch (error) {
    batcher.flush();
    if ((error as { name?: string }).name === 'AbortError') {
      // User cancelled streaming — don't show error
      return;
    }
    const errMsg = error instanceof Error ? error.message : 'Unknown error occurred.';
    console.error('Streaming request failed:', error);
    store.updateLastMessage(conversationId, `\n\n**Error:** ${errMsg}`);
  } finally {
    store.setStreaming(false);
    store.setStreamingPhase(null);
    store.setAbortController(null);
    
    // Auto-title generation + follow-up suggestions — run in parallel (fire-and-forget)
    const updatedConv = useChatStore.getState().conversations.find(c => c.id === conversationId);
    
    // Generate title only on first AI response (when 2 messages total)
    if (updatedConv && updatedConv.messages.length === 2) {
      console.log('[AutoTitle] Starting title generation after first AI response...');
      const aiMsgIndex = 1;
      store.setGeneratingTitle(true, null, aiMsgIndex);
      
      generateTitle(updatedConv.messages, (title, suggestedFolder) => {
        console.log('[AutoTitle] Generated:', title, suggestedFolder);
        if (title) {
          useChatStore.getState().setGeneratingTitle(false, title, aiMsgIndex);
        } else {
          useChatStore.getState().setGeneratingTitle(false, null, null);
        }
      });
    }
    
    // Generate follow-up suggestions — runs in parallel with title generation
    const chatSettings = useChatStore.getState().settings;
    const suggestionsEnabled = chatSettings.enableFollowUpSuggestions !== false;
    
    if (updatedConv && suggestionsEnabled) {
      const msgs = updatedConv.messages;
      const lastMessage = msgs[msgs.length - 1];
      const userMessage = msgs[msgs.length - 2];
      
      if (lastMessage?.role === 'assistant' && userMessage?.role === 'user') {
        console.log('[Suggestions] Generating suggestions after AI response...');
        generateSuggestions(lastMessage.content, userMessage.content, (suggestions) => {
          console.log('[Suggestions] Generated:', suggestions);
          useChatStore.getState().setFollowUpSuggestions(suggestions);
        });
      }
    }
  }
};
