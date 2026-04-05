// Detect language from text (simple heuristic)
export function detectLanguage(text: string): 'en' | 'id' | 'other' {
  const idWords = ['yang', 'dan', 'di', 'ke', 'dari', 'ini', 'itu', 'dengan', 'untuk', 'ada', 'saya', 'kami', 'kita', 'mereka', 'bisa', 'tidak', 'akan', 'sudah', 'belum', 'juga', 'atau', 'tetapi', 'hanya', 'lebih', 'sangat', 'sekali', 'kapan', 'bagaimana', 'mengapa', 'apa', 'siapa', 'dimana', 'kenapa', 'berapa', 'merdeka', 'indonesia', 'buah', 'naga', 'tanya', 'jawab', 'info', 'cek', 'lihat', 'cari'];
  
  const words = text.toLowerCase().split(/\s+/);
  let idCount = 0;
  
  for (const word of words.slice(0, 50)) {
    if (idWords.includes(word)) idCount++;
  }
  
  if (idCount / Math.min(words.length, 50) > 0.1) return 'id';
  return 'en';
}

// Extract just the user question from messages
function extractUserQuestion(messages: { role: string; content: string }[]): string {
  const userMsg = messages.find(m => m.role === 'user');
  if (!userMsg) return '';
  
  let content = userMsg.content.trim();
  if (content.length > 250) {
    content = content.slice(0, 250) + '...';
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
    
    // Simple, direct prompts - Indonesian ONLY for Indonesian
    const indonesianSystemPrompt = `Kamu: Pembuat judul percakapan Bahasa Indonesia.
BERLANGSUNG: Jangan balas dengan bahasa lain!
KETENTUAN:
1. Gunakan Bahasa Indonesia saja
2. Maksimum 4-5 kata
3. Jangan tanda kutip
4. Jangan emoji
5. Fokus ke topik utama

CONTOH JAWABAN YANG BENAR:
- Sejarah Kemerdekaan Indonesia
- Manfaat Buah Naga
- Cara Membuat Resume
- Jadwal Arsenal Minggu Ini

CONTOH YANG SALAH (JANGAN SALAH):
- kapan indonesia merdeka (terlalu pendek)
- English response (bahasa inggris)
- Fecha de independencia (bahasa spanyol)`;

    const indonesianUserPrompt = `Pertanyaan: "${userQuestion}"
Tulis judul pendek (4-5 kata) dalam Bahasa Indonesia yang menjelaskan topik utama pertanyaan ini.`;
    
    // English ONLY for English
    const englishSystemPrompt = `You: Create English conversation titles only.
RULES:
1. Use English only - NO other languages!
2. Maximum 4-5 words
3. No quotes
4. No emojis

CORRECT EXAMPLES:
- History of Indonesian Independence
- Health Benefits of Dragon Fruit
- How to Write a Professional Resume

WRONG EXAMPLES:
- sejarah kemerdekaan (Indonesian)
- Fecha de independencia (Spanish)`;

    const englishUserPrompt = `Question: "${userQuestion}"
Write a short title (4-5 words) in English that describes the main topic.`;
    
    const API_TOKEN = window.API_TOKEN || import.meta.env.VITE_API_TOKEN || '';
    console.log('[AutoTitle] Generating with question:', userQuestion, 'lang:', lang);
    
    const response = await fetch('/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`,
        'x-openclaw-model': 'minimax/MiniMax-M2.5'  // Force use specific model that handles multilingual better
      },
      body: JSON.stringify({
        model: 'openclaw/default',
        messages: [
          { role: 'system', content: lang === 'id' ? indonesianSystemPrompt : englishSystemPrompt },
          { role: 'user', content: lang === 'id' ? indonesianUserPrompt : englishUserPrompt }
        ],
        max_tokens: 15,
        temperature: 0.1  // Very low for predictable output
      })
    });

    if (!response.ok) {
      throw new Error(`Title generation failed: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error('API returned non-JSON response — is GATEWAY_URL configured in .env?');
    }

    const data = await response.json();
    let title = data.choices?.[0]?.message?.content?.trim() || '';

    // Clean up title
    title = title.replace(/^["']|["']$/g, '').replace(/\s+/g, ' ').trim();
    
    // Fallback if title is empty or too short
    if (!title || title.length < 3) {
      title = lang === 'id' ? 'Percakapan Baru' : 'New Conversation';
    }

    // Truncate if too long
    if (title.length > 50) {
      title = title.slice(0, 47) + '...';
    }

    // Additional cleanup - remove any remaining non-Indonesian/English chars
    if (lang === 'id') {
      // If result contains non-Indonesian characters, use fallback
      if (/[ñáéíóúü]/i.test(title)) {
        title = 'Percakapan Baru';
      }
    }

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
  
  const workKeywords = lang === 'id' 
    ? ['kerja', 'pekerjaan', 'kantor', 'proyek', 'client', 'meeting', 'deadline', 'laporan', 'presentasi', 'email', 'bisnis', 'coding', 'programming', 'jualan']
    : ['work', 'job', 'project', 'client', 'meeting', 'deadline', 'report', 'presentation', 'business', 'office', 'coding', 'programming', 'sales'];
  
  const personalKeywords = lang === 'id'
    ? ['pribadi', 'keluarga', 'rumah', 'hobi', 'liburan', 'resep', 'kesehatan', 'olahraga', 'makan', 'nonton', 'game']
    : ['personal', 'family', 'home', 'hobby', 'vacation', 'health', 'fitness', 'recipe', 'food', 'watch', 'game'];
  
  const todayKeywords = lang === 'id'
    ? ['hari', 'besok', 'kemarin', 'minggu', 'bulan', 'tahun', 'jadwal']
    : ['today', 'tomorrow', 'yesterday', 'week', 'month', 'year', 'schedule'];

  if (workKeywords.some(k => lowerText.includes(k))) return 'work';
  if (personalKeywords.some(k => lowerText.includes(k))) return 'personal';
  if (todayKeywords.some(k => lowerText.includes(k))) return 'today';
  
  return undefined;
}
