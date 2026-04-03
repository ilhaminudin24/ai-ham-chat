import type { Skill, CreateSkillPayload } from '../types/skills';

const API_BASE = '';

// Get all skills
export const getSkills = async (): Promise<Skill[]> => {
  const res = await fetch(`${API_BASE}/api/skills`);
  if (!res.ok) throw new Error('Failed to fetch skills');
  const skills: Skill[] = await res.json();
  // Migration: add defaults for new fields
  return skills.map(migrateSkill);
};

// Migrate old skill data to include new fields
export const migrateSkill = (skill: Skill): Skill => ({
  ...skill,
  version: skill.version || '1.0.0',
  author: skill.author || 'User',
  category: skill.category || 'custom',
  tags: skill.tags || [],
  parameters: skill.parameters || [],
  usageCount: skill.usageCount || 0,
  createdAt: skill.createdAt || new Date().toISOString(),
  updatedAt: skill.updatedAt || new Date().toISOString(),
});

// Get single skill
export const getSkill = async (id: string): Promise<Skill> => {
  const res = await fetch(`${API_BASE}/api/skills/${id}`);
  if (!res.ok) throw new Error('Failed to fetch skill');
  return migrateSkill(await res.json());
};

// Create skill
export const createSkill = async (payload: CreateSkillPayload): Promise<Skill> => {
  const res = await fetch(`${API_BASE}/api/skills`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to create skill');
  return migrateSkill(await res.json());
};

// Update skill
export const updateSkill = async (id: string, data: Partial<Skill>): Promise<Skill> => {
  const res = await fetch(`${API_BASE}/api/skills/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, updatedAt: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error('Failed to update skill');
  return migrateSkill(await res.json());
};

// Toggle skill
export const toggleSkill = async (id: string): Promise<Skill> => {
  const res = await fetch(`${API_BASE}/api/skills/${id}/toggle`, {
    method: 'PUT',
  });
  if (!res.ok) throw new Error('Failed to toggle skill');
  return migrateSkill(await res.json());
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

// Export single skill as JSON string
export const exportSingleSkill = (skill: Skill): string => {
  const exportData = { ...skill };
  return JSON.stringify(exportData, null, 2);
};

// Validate imported skill data (13d)
export const validateSkillImport = (data: unknown): { valid: boolean; errors: string[]; skills: Skill[] } => {
  const errors: string[] = [];
  
  if (!data) {
    return { valid: false, errors: ['Empty data'], skills: [] };
  }

  const arr = Array.isArray(data) ? data : [data];
  const validSkills: Skill[] = [];

  arr.forEach((item, idx) => {
    const label = arr.length > 1 ? `Skill #${idx + 1}` : 'Skill';
    if (!item || typeof item !== 'object') {
      errors.push(`${label}: Invalid format (not an object)`);
      return;
    }
    if (!item.name || typeof item.name !== 'string') {
      errors.push(`${label}: Missing or invalid "name" field`);
      return;
    }
    if (!item.content && !item.description) {
      errors.push(`${label} "${item.name}": Missing "content" or "description"`);
      return;
    }
    // Valid enough — migrate and add
    validSkills.push(migrateSkill({
      id: item.id || `imported-${Date.now()}-${idx}`,
      name: item.name,
      icon: item.icon || '📦',
      description: item.description || '',
      content: item.content || '',
      enabled: false,
      ...item,
    }));
  });

  return {
    valid: errors.length === 0 && validSkills.length > 0,
    errors,
    skills: validSkills,
  };
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

// Generate system prompt from active skills (with parameter substitution)
export const generateSkillsSystemPrompt = (skills: Skill[]): string => {
  const activeSkills = skills.filter(s => s.enabled);
  if (activeSkills.length === 0) return '';
  
  const instructions = activeSkills.map(skill => {
    const { rules, keywords } = parseSkillContent(skill.content);
    
    // Substitute parameters into rules
    let processedRules = rules.map(r => {
      let processed = r;
      if (skill.parameters) {
        skill.parameters.forEach(param => {
          const val = param.value || param.default;
          processed = processed.replace(new RegExp(`\\{\\{${param.key}\\}\\}`, 'g'), val);
        });
      }
      return processed;
    });

    return `
[${skill.icon} ${skill.name}${skill.version ? ` v${skill.version}` : ''}]
${processedRules.map(r => `- ${r}`).join('\n')}
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
