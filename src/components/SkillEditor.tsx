import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { createSkill, updateSkill } from '../utils/skillApi';
import type { Skill } from '../types/skills';
import styles from './SkillEditor.module.css';

interface SkillEditorProps {
  skill: Skill | null;
  onClose: () => void;
}

const EMOJI_OPTIONS = ['💼', '🎨', '💻', '✉️', '🎭', '📊', '📝', '🚀', '💡', '🎯', '📚', '🔧'];

export const SkillEditor: React.FC<SkillEditorProps> = ({ skill, onClose }) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📝');
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState<string[]>(['']);
  const [keywords, setKeywords] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (skill) {
      setName(skill.name);
      setIcon(skill.icon);
      setDescription(skill.description);
      
      // Parse rules from content
      const rulesMatch = skill.content.match(/## Rules\n([\s\S]*?)(?=\n##|$)/i);
      if (rulesMatch) {
        const parsedRules = rulesMatch[1]
          .split('\n')
          .map(r => r.replace(/^-\s*/, '').trim())
          .filter(Boolean);
        setRules(parsedRules.length ? parsedRules : ['']);
      }
      
      const keywordsMatch = skill.content.match(/## Trigger Keywords\n([\s\S]*?)(?=\n##|$)/i);
      if (keywordsMatch) {
        setKeywords(keywordsMatch[1].trim());
      }
    }
  }, [skill]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const payload = {
        name: name.trim(),
        icon,
        description: description.trim(),
        rules: rules.filter(r => r.trim()),
        triggerKeywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
      };
      
      if (skill) {
        await updateSkill(skill.id, payload);
      } else {
        await createSkill(payload);
      }
      
      onClose();
    } catch (e) {
      setError('Failed to save skill');
    } finally {
      setLoading(false);
    }
  };

  const addRule = () => {
    setRules([...rules, '']);
  };

  const updateRule = (index: number, value: string) => {
    const updated = [...rules];
    updated[index] = value;
    setRules(updated);
  };

  const removeRule = (index: number) => {
    if (rules.length > 1) {
      setRules(rules.filter((_, i) => i !== index));
    }
  };

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3>{skill ? 'Edit Skill' : 'Create New Skill'}</h3>
          <button onClick={onClose} className={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>
        
        <div className={styles.body}>
          {error && <div className={styles.error}>{error}</div>}
          
          <div className={styles.field}>
            <label>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Business Formal"
            />
          </div>
          
          <div className={styles.field}>
            <label>Icon</label>
            <div className={styles.emojiPicker}>
              {EMOJI_OPTIONS.map(emoji => (
                <button
                  key={emoji}
                  className={`${styles.emojiBtn} ${icon === emoji ? styles.selected : ''}`}
                  onClick={() => setIcon(emoji)}
                  type="button"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          
          <div className={styles.field}>
            <label>Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this skill"
            />
          </div>
          
          <div className={styles.field}>
            <label>Rules (How AI should behave)</label>
            <div className={styles.rulesList}>
              {rules.map((rule, index) => (
                <div key={index} className={styles.ruleRow}>
                  <span className={styles.ruleDash}>-</span>
                  <input
                    type="text"
                    value={rule}
                    onChange={(e) => updateRule(index, e.target.value)}
                    placeholder={`Rule ${index + 1}`}
                  />
                  {rules.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRule(index)}
                      className={styles.removeRuleBtn}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={addRule} className={styles.addRuleBtn}>
              + Add Rule
            </button>
          </div>
          
          <div className={styles.field}>
            <label>Trigger Keywords</label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="report, meeting, business (comma separated)"
            />
            <span className={styles.hint}>Comma-separated keywords that may auto-activate this skill</span>
          </div>
        </div>
        
        <div className={styles.footer}>
          <button onClick={onClose} className={styles.cancelBtn}>Cancel</button>
          <button onClick={handleSave} disabled={loading} className={styles.saveBtn}>
            {loading ? 'Saving...' : skill ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </>
  );
};
