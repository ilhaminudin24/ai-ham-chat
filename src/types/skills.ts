export interface Skill {
  id: string;
  name: string;
  icon: string;
  description: string;
  content: string;
  enabled: boolean;
}

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
}
