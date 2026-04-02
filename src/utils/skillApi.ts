import type { Skill, CreateSkillPayload } from '../types/skills';

const API_BASE = '';

// Get all skills
export const getSkills = async (): Promise<Skill[]> => {
  const res = await fetch(`${API_BASE}/api/skills`);
  if (!res.ok) throw new Error('Failed to fetch skills');
  return res.json();
};

// Get single skill
export const getSkill = async (id: string): Promise<Skill> => {
  const res = await fetch(`${API_BASE}/api/skills/${id}`);
  if (!res.ok) throw new Error('Failed to fetch skill');
  return res.json();
};

// Create skill
export const createSkill = async (payload: CreateSkillPayload): Promise<Skill> => {
  const res = await fetch(`${API_BASE}/api/skills`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to create skill');
  return res.json();
};

// Update skill
export const updateSkill = async (id: string, data: Partial<Skill>): Promise<Skill> => {
  const res = await fetch(`${API_BASE}/api/skills/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update skill');
  return res.json();
};

// Toggle skill
export const toggleSkill = async (id: string): Promise<Skill> => {
  const res = await fetch(`${API_BASE}/api/skills/${id}/toggle`, {
    method: 'PUT',
  });
  if (!res.ok) throw new Error('Failed to toggle skill');
  return res.json();
};

// Delete skill
export const deleteSkill = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/api/skills/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete skill');
};

// Export all skills
export const exportSkills = async (): Promise<Skill[]> => {
  const res = await fetch(`${API_BASE}/api/skills/export`);
  if (!res.ok) throw new Error('Failed to export skills');
  return res.json();
};

// Parse skill content to extract rules and keywords
export const parseSkillContent = (content: string): { rules: string[]; keywords: string[] } => {
  const rulesMatch = content.match(/## Rules\n([\s\S]*?)(?=\n##|$)/i);
  const keywordsMatch = content.match(/## Trigger Keywords\n([\s\S]*?)(?=\n##|$)/i);
  
  const rules = rulesMatch 
    ? rulesMatch[1].split('\n').map(r => r.replace(/^-\s*/, '').trim()).filter(Boolean)
    : [];
  
  const keywords = keywordsMatch 
    ? keywordsMatch[1].split(/[,\n]/).map(k => k.trim()).filter(Boolean)
    : [];
  
  return { rules, keywords };
};

// Generate system prompt from active skills
export const generateSkillsSystemPrompt = (skills: Skill[]): string => {
  const activeSkills = skills.filter(s => s.enabled);
  if (activeSkills.length === 0) return '';
  
  const instructions = activeSkills.map(skill => {
    const { rules, keywords } = parseSkillContent(skill.content);
    return `
[${skill.icon} ${skill.name}]
${rules.map(r => `- ${r}`).join('\n')}
Active keywords: ${keywords.join(', ')}
`;
  }).join('\n');
  
  return `
=== ACTIVE SKILLS ===
When responding, follow these skill-based guidelines:

${instructions}
=== END SKILLS ===
`;
};
