export interface SkillParameter {
  key: string;
  label: string;
  type: 'text' | 'select' | 'toggle';
  options?: string[];
  default: string;
  value?: string;
}

export interface Skill {
  id: string;
  name: string;
  icon: string;
  description: string;
  content: string;
  enabled: boolean;
  // New metadata fields (13a)
  version?: string;
  author?: string;
  category?: SkillCategory;
  tags?: string[];
  parameters?: SkillParameter[];
  usageCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type SkillCategory = 
  | 'writing' 
  | 'code' 
  | 'analysis' 
  | 'creative' 
  | 'business' 
  | 'custom';

export const SKILL_CATEGORIES: { value: SkillCategory; label: string; icon: string }[] = [
  { value: 'writing', label: 'Writing', icon: '✍️' },
  { value: 'code', label: 'Code', icon: '💻' },
  { value: 'analysis', label: 'Analysis', icon: '📊' },
  { value: 'creative', label: 'Creative', icon: '🎨' },
  { value: 'business', label: 'Business', icon: '💼' },
  { value: 'custom', label: 'Custom', icon: '🔧' },
];

export interface SkillState {
  skills: Skill[];
  loading: boolean;
  error: string | null;
}

export interface CreateSkillPayload {
  name: string;
  icon?: string;
  description?: string;
  rules?: string[];
  triggerKeywords?: string[];
  category?: SkillCategory;
  tags?: string[];
  parameters?: SkillParameter[];
  version?: string;
  author?: string;
}

// Featured/curated skill templates
export const FEATURED_SKILLS: Omit<Skill, 'id'>[] = [
  {
    name: 'Professional Writer',
    icon: '✍️',
    description: 'Formal, clear, and persuasive writing style',
    content: '## Rules\n- Write in a professional and formal tone\n- Use clear paragraph structure\n- Avoid slang and colloquialisms\n- Proofread for grammar and spelling\n- Use active voice when possible\n## Trigger Keywords\nwrite, email, report, document, letter',
    enabled: false,
    category: 'writing',
    tags: ['professional', 'formal'],
    version: '1.0.0',
    author: 'AI-HAM',
    parameters: [
      { key: 'tone', label: 'Tone', type: 'select', options: ['Formal', 'Semi-formal', 'Friendly'], default: 'Formal' },
      { key: 'language', label: 'Language', type: 'select', options: ['English', 'Indonesian', 'Bilingual'], default: 'English' },
    ],
  },
  {
    name: 'Code Reviewer',
    icon: '💻',
    description: 'Reviews code for bugs, performance, and best practices',
    content: '## Rules\n- Analyze code for bugs and logical errors\n- Suggest performance improvements\n- Follow language-specific best practices\n- Point out security vulnerabilities\n- Suggest proper error handling\n## Trigger Keywords\nreview, code, debug, refactor, optimize',
    enabled: false,
    category: 'code',
    tags: ['code', 'review', 'debug'],
    version: '1.0.0',
    author: 'AI-HAM',
    parameters: [
      { key: 'language', label: 'Language', type: 'select', options: ['TypeScript', 'Python', 'Java', 'Go', 'Any'], default: 'TypeScript' },
      { key: 'strict', label: 'Strict Mode', type: 'toggle', default: 'true' },
    ],
  },
  {
    name: 'Data Analyst',
    icon: '📊',
    description: 'Analyzes data and provides insights in structured format',
    content: '## Rules\n- Present data in tables when possible\n- Provide statistical summaries\n- Highlight key findings and anomalies\n- Suggest actionable insights\n- Use charts descriptions when relevant\n## Trigger Keywords\nanalyze, data, report, statistics, insights',
    enabled: false,
    category: 'analysis',
    tags: ['data', 'statistics', 'insights'],
    version: '1.0.0',
    author: 'AI-HAM',
  },
  {
    name: 'Creative Storyteller',
    icon: '🎭',
    description: 'Crafts engaging narratives and creative content',
    content: '## Rules\n- Use vivid descriptions and imagery\n- Create compelling characters\n- Maintain consistent narrative voice\n- Use dialogue effectively\n- Build tension and engagement\n## Trigger Keywords\nstory, creative, write, narrative, fiction',
    enabled: false,
    category: 'creative',
    tags: ['creative', 'story', 'narrative'],
    version: '1.0.0',
    author: 'AI-HAM',
    parameters: [
      { key: 'genre', label: 'Genre', type: 'select', options: ['Fantasy', 'Sci-Fi', 'Romance', 'Mystery', 'Any'], default: 'Any' },
    ],
  },
];
