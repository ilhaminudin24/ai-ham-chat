// Detect language from text (simple heuristic)
export function detectLanguage(text: string): 'en' | 'id' | 'other' {
  // Common Indonesian words
  const idWords = ['yang', 'dan', 'di', 'ke', 'dari', 'ini', 'itu', 'dengan', 'untuk', 'ada', 'saya', 'kami', 'kita', 'mereka', 'bisa', 'tidak', 'akan', 'sudah', 'belum', 'juga', 'atau', 'tetapi', 'hanya', 'lebih', 'sangat', 'sekali'];
  
  const words = text.toLowerCase().split(/\s+/);
  let idCount = 0;
  
  for (const word of words.slice(0, 50)) {
    if (idWords.includes(word)) idCount++;
  }
  
  // If more than 20% Indonesian words, consider it Indonesian
  if (idCount / Math.min(words.length, 50) > 0.2) return 'id';
  
  // Default to English
  return 'en';
}

// Generate title using AI
export async function generateTitle(
  messages: { role: string; content: string }[],
  onGenerated?: (title: string, suggestedFolder?: string) => void
): Promise<{ title: string; suggestedFolder?: string } | null> {
  try {
    // Build conversation text for title generation
    const convText = messages
      .slice(0, 6) // Only first few messages for speed
      .map(m => `${m.role}: ${m.content.slice(0, 200)}`)
      .join('\n');

    const lang = detectLanguage(convText);
    
    // Compact prompt based on language
    const systemPrompt = lang === 'id' 
      ? `Kamu adalah AI yang sangat baik dalam membuat judul percakapan. Buat judul yang sangat singkat (3-5 kata) dalam Bahasa Indonesia yang menggambarkan topik percakapan ini. Kembalikan HANYA judul, tanpa tanda kutip atau penjelasan tambahan. Judul harus jelas dan informatif.`
      : `You are an AI that excels at creating conversation titles. Create a very short title (3-5 words) in English that describes this conversation topic. Return ONLY the title, no quotes or additional explanations. The title must be clear and informative.`;

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
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Conversation:\n${convText}\n\nGenerate a short title:` }
        ],
        max_tokens: 20,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`Title generation failed: ${response.status}`);
    }

    const data = await response.json();
    let title = data.choices?.[0]?.message?.content?.trim() || '';

    // Clean up title
    title = title.replace(/^["']|["']$/g, '').trim();
    
    // Fallback if title is empty or too short
    if (!title || title.length < 3) {
      title = lang === 'id' ? 'Percakapan Baru' : 'New Conversation';
    }

    // Truncate if too long
    if (title.length > 50) {
      title = title.slice(0, 47) + '...';
    }

    // Suggest folder based on content keywords
    const suggestedFolder = suggestFolder(convText, lang);

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
    ? ['kerja', 'pekerjaan', 'kantor', 'proyek', 'client', 'meeting', 'deadline', 'laporan', 'presentasi', 'email', 'bisnis']
    : ['work', 'job', 'project', 'client', 'meeting', 'deadline', 'report', 'presentation', 'business', 'office'];
  
  // Personal keywords
  const personalKeywords = lang === 'id'
    ? ['pribadi', 'keluarga', 'rumah', 'hobi', 'liburan', 'resep', 'kesehatan', 'olahraga']
    : ['personal', 'family', 'home', 'hobby', 'vacation', 'health', 'fitness', 'recipe'];
  
  // Today keywords
  const todayKeywords = lang === 'id'
    ? ['hari', 'besok', 'kemarin', 'minggu', 'bulan', 'tahun']
    : ['today', 'tomorrow', 'yesterday', 'week', 'month', 'year'];

  const checkKeywords = (keywords: string[]) => {
    return keywords.some(k => lowerText.includes(k));
  };

  if (checkKeywords(workKeywords)) return 'work';
  if (checkKeywords(personalKeywords)) return 'personal';
  if (checkKeywords(todayKeywords)) return 'today';
  
  return undefined;
}
