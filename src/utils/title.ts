// Detect language from text (simple heuristic)
export function detectLanguage(text: string): 'en' | 'id' | 'other' {
  const idWords = ['yang', 'dan', 'di', 'ke', 'dari', 'ini', 'itu', 'dengan', 'untuk', 'ada', 'saya', 'kami', 'kita', 'mereka', 'bisa', 'tidak', 'akan', 'sudah', 'belum', 'juga', 'atau', 'tetapi', 'hanya', 'lebih', 'sangat', 'sekali', 'kapan', 'bagaimana', 'mengapa', 'apa', 'siapa', 'dimana', 'kenapa', 'berapa', 'merdeka', 'indonesia', 'buah', 'naga'];
  
  const words = text.toLowerCase().split(/\s+/);
  let idCount = 0;
  
  for (const word of words.slice(0, 50)) {
    if (idWords.includes(word)) idCount++;
  }
  
  if (idCount / Math.min(words.length, 50) > 0.15) return 'id';
  return 'en';
}

// Extract just the user question from messages
function extractUserQuestion(messages: { role: string; content: string }[]): string {
  // Find the user message
  const userMsg = messages.find(m => m.role === 'user');
  if (!userMsg) return '';
  
  let content = userMsg.content.trim();
  
  // If content is too long, truncate it for the prompt
  if (content.length > 300) {
    content = content.slice(0, 300) + '...';
  }
  
  return content;
}

// Generate title using AI
export async function generateTitle(
  messages: { role: string; content: string }[],
  onGenerated?: (title: string, suggestedFolder?: string) => void
): Promise<{ title: string; suggestedFolder?: string } | null> {
  try {
    const lang = detectLanguage(messages.map(m => m.content).join(' '));
    const userQuestion = extractUserQuestion(messages);
    
    // Smart prompts based on language
    const prompts = {
      id: {
        system: `Kamu adalah AI yang specialises dalam membuat judul percakapan yang singkat dan informatif.
BANarsi: Kembalikan HANYA judul (maksimum 4-5 kata), tanpa tanda kutip, tanpa emoji, tanpa penjelasan tambahan.
Judul harus: (1) menggambarkan TOPIK UTAMA bukan kata pertama, (2) menggunakan bahasa natural, (3) mudah dipahami.
Contoh judul bagus: "Sejarah Kemerdekaan Indonesia", "Manfaat Buah Naga", "Cara Buat Resume", "Jadwal Timnas Minggu Ini"`,
        user: `Berikut pertanyaan user dalam percakapan:\n"${userQuestion}"\n\nBuatkan judul yang menjelaskan TOPIK atau TOPIK UTAMA dari pertanyaan ini. Fokus pada substansi bukan kata pertama.`
      },
      en: {
        system: `You are an AI that specialises in creating short, informative conversation titles.
RULES: Return ONLY the title (max 4-5 words), no quotes, no emoji, no additional explanations.
The title must: (1) describe the MAIN TOPIC not first words, (2) use natural language, (3) be easy to understand.
Good title examples: "History of Indonesian Independence", "Health Benefits of Dragon Fruit", "How to Write Resume", "Arsenal Match Schedule This Week"`,
        user: `Here is the user's question in this conversation:\n"${userQuestion}"\n\nCreate a title that explains the TOPIC or MAIN SUBJECT of this question. Focus on substance, not just first words.`
      }
    };
    
    const prompt = (lang === 'id' || lang === 'en') ? prompts[lang] : prompts.en;

    const API_TOKEN = (window as any).API_TOKEN || import.meta.env.VITE_API_TOKEN || '';
    
    const response = await fetch('/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`
      },
      body: JSON.stringify({
        model: 'openclaw/default',
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user }
        ],
        max_tokens: 15,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`Title generation failed: ${response.status}`);
    }

    const data = await response.json();
    let title = data.choices?.[0]?.message?.content?.trim() || '';

    // Clean up title - remove quotes, extra spaces, etc
    title = title.replace(/^["']|["']$/g, '').replace(/\s+/g, ' ').trim();
    
    // Fallback if title is empty or too short
    if (!title || title.length < 3) {
      title = lang === 'id' ? 'Percakapan Baru' : 'New Conversation';
    }

    // Truncate if too long
    if (title.length > 50) {
      title = title.slice(0, 47) + '...';
    }

    // Suggest folder based on content keywords
    const suggestedFolder = suggestFolder(messages.map(m => m.content).join(' '), lang);

    console.log('[AutoTitle] Generated title:', title, 'lang:', lang);
    onGenerated?.(title, suggestedFolder);

    return { title, suggestedFolder };
  } catch (error) {
    console.error('Failed to generate title:', error);
    return null;
  }
}

// Suggest folder based on content keywords
function suggestFolder(text: string, lang: string): string | undefined {
  const lowerText = text.toLowerCase();
  
  // Work-related keywords
  const workKeywords = lang === 'id' 
    ? ['kerja', 'pekerjaan', 'kantor', 'proyek', 'client', 'meeting', 'deadline', 'laporan', 'presentasi', 'email', 'bisnis', 'coding', 'programming', 'jualan']
    : ['work', 'job', 'project', 'client', 'meeting', 'deadline', 'report', 'presentation', 'business', 'office', 'coding', 'programming', 'sales'];
  
  // Personal keywords
  const personalKeywords = lang === 'id'
    ? ['pribadi', 'keluarga', 'rumah', 'hobi', 'liburan', 'resep', 'kesehatan', 'olahraga', 'makan', 'nonton', 'game']
    : ['personal', 'family', 'home', 'hobby', 'vacation', 'health', 'fitness', 'recipe', 'food', 'watch', 'game'];
  
  // Today keywords
  const todayKeywords = lang === 'id'
    ? ['hari', 'besok', 'kemarin', 'minggu', 'bulan', 'tahun', 'jadwal']
    : ['today', 'tomorrow', 'yesterday', 'week', 'month', 'year', 'schedule'];

  const checkKeywords = (keywords: string[]) => {
    return keywords.some(k => lowerText.includes(k));
  };

  if (checkKeywords(workKeywords)) return 'work';
  if (checkKeywords(personalKeywords)) return 'personal';
  if (checkKeywords(todayKeywords)) return 'today';
  
  return undefined;
}
