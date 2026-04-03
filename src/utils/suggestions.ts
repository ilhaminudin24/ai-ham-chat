// Generate follow-up suggestions based on AI response
export async function generateSuggestions(
  aiMessage: string,
  userQuestion: string,
  onGenerated?: (suggestions: { id: string; text: string; type: 'ai-generated' }[]) => void
): Promise<{ id: string; text: string; type: 'ai-generated' }[] | null> {
  try {
    // Get first ~300 chars of AI response for context
    const responsePreview = aiMessage.slice(0, 400);
    
    const systemPrompt = `Kamu adalah asisten yang Suggestion creator.
TUGAS: Buat 3 saran pertanyaan lanjutan berdasarkan respons AI sebelumnya.

STRICT RULES:
1. Jawaban dalam Bahasa Indonesia saja
2. Maksimum 8 kata per pertanyaan
3. Jangan gunakan tanda kutip
4. Fokus pada topik yang belum tercover di respons asli
5. Setiap saran harus relevan dengan konteks pertanyaan user

CONTOH OUTPUT YANG BENAR:
- Apa saja bahan utamanya?
- Bagaimana cara membuatnya?
- Berapa lama memasak?

SALAH:
- "Can you explain more?" (English)
- Pertanyaan yang sangat panjang`;

    const userPrompt = `Pertanyaan user: "${userQuestion}"
Respons AI: "${responsePreview}"

Buat 3 saran pertanyaan lanjutan dalam Bahasa Indonesia (maks 8 kata masing-masing). Pisahkan dengan baris baru.`;

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
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 80,
        temperature: 0.5
      })
    });

    if (!response.ok) {
      throw new Error(`Suggestion generation failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || '';
    
    // Parse suggestions - split by newlines or bullets
    const lines = content.split(/\n|·|-/).filter((line: string) => line.trim().length > 0);
    
    const suggestions = lines.slice(0, 3).map((text: string, index: number) => ({
      id: `suggestion-${Date.now()}-${index}`,
      text: text.trim().slice(0, 60), // Limit to 60 chars
      type: 'ai-generated' as const
    }));

    if (suggestions.length === 0) {
      return null;
    }

    console.log('[Suggestions] Generated:', suggestions.map((s: { text: string }) => s.text));
    onGenerated?.(suggestions);

    return suggestions;
  } catch (error) {
    console.error('Failed to generate suggestions:', error);
    return null;
  }
}
