import type { MemoryCategory, MemoryItem, MemorySuggestionInput } from '../types/memory';

export const MEMORY_CATEGORIES: { value: MemoryCategory; label: string; description: string }[] = [
  { value: 'preference', label: 'Preference', description: 'Pilihan tools, gaya kerja, bahasa, atau format favorit user.' },
  { value: 'personal', label: 'Personal', description: 'Konteks pribadi yang relevan seperti role, lokasi, atau identitas umum.' },
  { value: 'project', label: 'Project', description: 'Fakta penting tentang project, stack, dan domain kerja yang sedang dibangun.' },
  { value: 'workstyle', label: 'Workstyle', description: 'Cara user ingin AI membantu, misalnya ringkas, detail, atau step-by-step.' },
  { value: 'reference', label: 'Reference', description: 'Fakta durable lain yang layak diingat lintas conversation.' },
];

const SENSITIVE_PATTERNS = [
  /\b(password|passcode|pin|otp|secret|api[\s-]?key|token|private key|seed phrase)\b/i,
  /\b(kata sandi|rahasia|token|api key|private key|seed phrase)\b/i,
  /\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/i,
  /\b(?:\+62|62|0)\d{8,13}\b/,
];

const STOP_WORDS = new Set([
  'yang', 'dan', 'untuk', 'dari', 'dengan', 'atau', 'this', 'that', 'have', 'saya', 'anda', 'kami', 'kamu',
  'the', 'and', 'for', 'with', 'you', 'your', 'sudah', 'akan', 'adalah', 'sebagai', 'using', 'uses', 'pakai',
]);

export function normalizeMemoryContent(content: string): string {
  return content.replace(/\s+/g, ' ').trim();
}

export function isSensitiveMemoryText(content: string): boolean {
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(content));
}

function sentenceCandidates(text: string): string[] {
  return text
    .split(/[\n.!?]+/)
    .map(part => normalizeMemoryContent(part))
    .filter(part => part.length >= 12 && part.length <= 180);
}

function classifySentence(sentence: string): { category: MemoryCategory; confidence: number } | null {
  const lower = sentence.toLowerCase();

  if (/\b(i prefer|i usually use|i like to use|saya prefer|saya lebih suka|saya biasanya pakai)\b/.test(lower)) {
    return { category: 'preference', confidence: 0.92 };
  }

  if (/\b(project|proyek)\b/.test(lower) && /\b(use|uses|using|menggunakan|pakai|built with|build dengan)\b/.test(lower)) {
    return { category: 'project', confidence: 0.94 };
  }

  if (/\b(my project|project|proyek)\b/.test(lower) && /\b(is|adalah|punya|memiliki)\b/.test(lower)) {
    return { category: 'project', confidence: 0.84 };
  }

  if (/\b(i am|i'm|my name is|saya|nama saya)\b/.test(lower) && /\b(developer|engineer|designer|freelancer|jakarta|indonesia|based|tinggal|kerja)\b/.test(lower)) {
    return { category: 'personal', confidence: 0.8 };
  }

  if (/\b(always|please|tolong|jangan|pastikan|ringkas|detail|step[- ]by[- ]step|langsung ke inti)\b/.test(lower)) {
    return { category: 'workstyle', confidence: 0.74 };
  }

  if (/\bremember|ingat\b/.test(lower)) {
    return { category: 'reference', confidence: 0.7 };
  }

  return null;
}

export function extractMemorySuggestionsFromText(
  text: string,
  sourceConversationId?: string | null
): MemorySuggestionInput[] {
  const seen = new Set<string>();
  const suggestions: MemorySuggestionInput[] = [];

  for (const sentence of sentenceCandidates(text)) {
    const classification = classifySentence(sentence);
    if (!classification) continue;

    const content = normalizeMemoryContent(sentence.replace(/^(remember|ingat)\s+(that|bahwa)\s+/i, ''));
    const key = content.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    suggestions.push({
      content,
      category: classification.category,
      sourceConversationId: sourceConversationId || null,
      sourceSnippet: sentence,
      isSensitive: isSensitiveMemoryText(content),
      confidence: classification.confidence,
    });
  }

  return suggestions.slice(0, 5);
}

function scoreOverlap(query: string, memory: MemoryItem): number {
  const queryTokens = query
    .toLowerCase()
    .split(/[^a-z0-9-]+/i)
    .filter(token => token.length > 2 && !STOP_WORDS.has(token));

  if (queryTokens.length === 0) return 0;

  const haystack = `${memory.content} ${memory.category} ${memory.sourceSnippet || ''}`.toLowerCase();
  return queryTokens.reduce((score, token) => score + (haystack.includes(token) ? 1 : 0), 0);
}

export function getRelevantMemories(
  memories: MemoryItem[],
  query: string,
  limit = 6
): MemoryItem[] {
  const confirmed = memories.filter(memory => memory.status === 'confirmed' && memory.enabled);
  return [...confirmed]
    .sort((a, b) => {
      const aScore = (a.pinned ? 100 : 0) + scoreOverlap(query, a) * 10 + a.confidence * 5;
      const bScore = (b.pinned ? 100 : 0) + scoreOverlap(query, b) * 10 + b.confidence * 5;

      if (aScore !== bScore) return bScore - aScore;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    })
    .slice(0, limit);
}

export function formatMemoriesForPrompt(memories: MemoryItem[]): string {
  if (memories.length === 0) return '';

  const lines = memories.map(memory => {
    const prefix = memory.pinned ? '[Pinned]' : `[${memory.category}]`;
    return `- ${prefix} ${memory.content}`;
  });

  return `Known memory about the user and ongoing context:\n${lines.join('\n')}`;
}
