import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Play, Eye } from 'lucide-react';
import { createSkill, updateSkill, parseSkillContent } from '../utils/skillApi';
import type { Skill, SkillParameter, SkillCategory } from '../types/skills';
import { SKILL_CATEGORIES } from '../types/skills';
import styles from './SkillEditor.module.css';

interface SkillEditorProps {
  skill: Skill | null;
  onClose: () => void;
}

const EMOJI_OPTIONS = ['💼', '🎨', '💻', '✉️', '🎭', '📊', '📝', '🚀', '💡', '🎯', '📚', '🔧', '🧠', '🔬', '📈', '🛡️'];

export const SkillEditor: React.FC<SkillEditorProps> = ({ skill, onClose }) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📝');
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState<string[]>(['']);
  const [keywords, setKeywords] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New fields (13a + 13c)
  const [category, setCategory] = useState<SkillCategory>('custom');
  const [tags, setTags] = useState('');
  const [version, setVersion] = useState('1.0.0');
  const [author, setAuthor] = useState('User');
  const [parameters, setParameters] = useState<SkillParameter[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => {
    if (skill) {
      setName(skill.name);
      setIcon(skill.icon);
      setDescription(skill.description);
      setCategory(skill.category || 'custom');
      setTags((skill.tags || []).join(', '));
      setVersion(skill.version || '1.0.0');
      setAuthor(skill.author || 'User');
      setParameters(skill.parameters || []);

      const { rules: parsedRules, keywords: parsedKw } = parseSkillContent(skill.content);
      setRules(parsedRules.length ? parsedRules : ['']);
      setKeywords(parsedKw.join(', '));
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
        category,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        version,
        author: author.trim() || 'User',
        parameters: parameters.filter(p => p.key.trim()),
      };
      if (skill) {
        await updateSkill(skill.id, payload);
      } else {
        await createSkill(payload);
      }
      onClose();
    } catch {
      setError('Failed to save skill');
    } finally {
      setLoading(false);
    }
  };

  // Rules management
  const addRule = () => setRules([...rules, '']);
  const updateRule = (index: number, value: string) => {
    const updated = [...rules];
    updated[index] = value;
    setRules(updated);
  };
  const removeRule = (index: number) => {
    if (rules.length > 1) setRules(rules.filter((_, i) => i !== index));
  };

  // Parameter management (13c)
  const addParameter = () => {
    setParameters([...parameters, { key: '', label: '', type: 'text', default: '' }]);
  };
  const updateParameter = (index: number, field: keyof SkillParameter, value: string | string[]) => {
    const updated = [...parameters];
    if (field === 'options') {
      updated[index] = { ...updated[index], options: value as string[] };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setParameters(updated);
  };
  const removeParameter = (index: number) => {
    setParameters(parameters.filter((_, i) => i !== index));
  };

  // Live preview with parameter substitution (13c)
  const previewContent = useMemo(() => {
    let content = `[${icon} ${name || 'Skill Name'}${version ? ` v${version}` : ''}]\n`;
    content += `Category: ${SKILL_CATEGORIES.find(c => c.value === category)?.label || 'Custom'}\n\n`;
    content += `## Rules\n`;
    rules.filter(r => r.trim()).forEach(r => {
      let processed = r;
      parameters.forEach(p => {
        const val = p.value || p.default || `{{${p.key}}}`;
        processed = processed.replace(new RegExp(`\\{\\{${p.key}\\}\\}`, 'g'), val);
      });
      content += `- ${processed}\n`;
    });
    if (keywords.trim()) {
      content += `\n## Trigger Keywords\n${keywords}`;
    }
    if (parameters.length > 0) {
      content += `\n\n## Parameters\n`;
      parameters.forEach(p => {
        content += `- {{${p.key}}}: ${p.label || p.key} (${p.type}, default: ${p.default})\n`;
      });
    }
    return content;
  }, [name, icon, version, category, rules, keywords, parameters]);

  // Test skill (13c) — sends a quick test prompt
  const handleTest = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetch('/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'minimax/MiniMax-M2.5',
          messages: [
            { role: 'system', content: `You have the following skill active:\n${previewContent}\nApply this skill in your response.` },
            { role: 'user', content: `Test: Give me a brief example of how you'd respond with the "${name || 'this'}" skill active. Keep it under 3 sentences.` },
          ],
          stream: false,
        }),
      });
      const data = await res.json();
      setTestResult(data.choices?.[0]?.message?.content || 'No response received');
    } catch {
      setTestResult('⚠️ Test failed — ensure the server is running');
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3>{skill ? 'Edit Skill' : 'Create New Skill'}</h3>
          <div className={styles.headerActions}>
            <button onClick={() => setShowPreview(!showPreview)} className={styles.previewToggle} title="Toggle Preview">
              <Eye size={16} /> {showPreview ? 'Editor' : 'Preview'}
            </button>
            <button onClick={onClose} className={styles.closeBtn}><X size={20} /></button>
          </div>
        </div>
        
        <div className={styles.body}>
          {error && <div className={styles.error}>{error}</div>}

          {showPreview ? (
            /* Live Preview Panel (13c) */
            <div className={styles.previewPanel}>
              <div className={styles.previewLabel}>System Prompt Preview</div>
              <pre className={styles.previewCode}>{previewContent}</pre>
              
              <button onClick={handleTest} disabled={testLoading} className={styles.testBtn}>
                <Play size={14} /> {testLoading ? 'Testing...' : 'Test Skill'}
              </button>
              {testResult && (
                <div className={styles.testResult}>
                  <div className={styles.testResultLabel}>AI Response:</div>
                  {testResult}
                </div>
              )}
            </div>
          ) : (
            /* Editor Form */
            <>
              {/* Row: Name + Version */}
              <div className={styles.fieldRow}>
                <div className={`${styles.field} ${styles.fieldFlex}`}>
                  <label>Name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Business Formal" />
                </div>
                <div className={styles.field} style={{ width: 100 }}>
                  <label>Version</label>
                  <input type="text" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.0.0" />
                </div>
              </div>

              {/* Icon */}
              <div className={styles.field}>
                <label>Icon</label>
                <div className={styles.emojiPicker}>
                  {EMOJI_OPTIONS.map(emoji => (
                    <button
                      key={emoji}
                      className={`${styles.emojiBtn} ${icon === emoji ? styles.selected : ''}`}
                      onClick={() => setIcon(emoji)}
                      type="button"
                    >{emoji}</button>
                  ))}
                </div>
              </div>

              {/* Row: Category + Author */}
              <div className={styles.fieldRow}>
                <div className={`${styles.field} ${styles.fieldFlex}`}>
                  <label>Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value as SkillCategory)} className={styles.selectInput}>
                    {SKILL_CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                    ))}
                  </select>
                </div>
                <div className={`${styles.field} ${styles.fieldFlex}`}>
                  <label>Author</label>
                  <input type="text" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Your name" />
                </div>
              </div>

              <div className={styles.field}>
                <label>Description</label>
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of this skill" />
              </div>

              <div className={styles.field}>
                <label>Tags</label>
                <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="professional, formal, writing (comma separated)" />
                <span className={styles.hint}>Used for search and filtering in the marketplace</span>
              </div>

              {/* Rules */}
              <div className={styles.field}>
                <label>Rules (How AI should behave)</label>
                <span className={styles.hint}>Use {"{{param}}"} syntax to reference parameters</span>
                <div className={styles.rulesList}>
                  {rules.map((rule, index) => (
                    <div key={index} className={styles.ruleRow}>
                      <span className={styles.ruleDash}>-</span>
                      <input
                        type="text"
                        value={rule}
                        onChange={(e) => updateRule(index, e.target.value)}
                        placeholder={`Rule ${index + 1} (e.g., "Write in {{tone}} tone")`}
                      />
                      {rules.length > 1 && (
                        <button type="button" onClick={() => removeRule(index)} className={styles.removeRuleBtn}>×</button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addRule} className={styles.addRuleBtn}>+ Add Rule</button>
              </div>

              <div className={styles.field}>
                <label>Trigger Keywords</label>
                <input type="text" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="report, meeting, business (comma separated)" />
              </div>

              {/* Parameters Builder (13c) */}
              <div className={styles.field}>
                <label>⚙️ Parameters</label>
                <span className={styles.hint}>Define configurable options. Reference in rules as {"{{key}}"}</span>
                {parameters.map((param, idx) => (
                  <div key={idx} className={styles.paramRow}>
                    <input
                      type="text"
                      value={param.key}
                      onChange={(e) => updateParameter(idx, 'key', e.target.value)}
                      placeholder="key"
                      className={styles.paramKey}
                    />
                    <input
                      type="text"
                      value={param.label}
                      onChange={(e) => updateParameter(idx, 'label', e.target.value)}
                      placeholder="Label"
                      className={styles.paramLabel}
                    />
                    <select
                      value={param.type}
                      onChange={(e) => updateParameter(idx, 'type', e.target.value)}
                      className={styles.paramType}
                    >
                      <option value="text">Text</option>
                      <option value="select">Select</option>
                      <option value="toggle">Toggle</option>
                    </select>
                    <input
                      type="text"
                      value={param.default}
                      onChange={(e) => updateParameter(idx, 'default', e.target.value)}
                      placeholder="default"
                      className={styles.paramDefault}
                    />
                    {param.type === 'select' && (
                      <input
                        type="text"
                        value={(param.options || []).join(', ')}
                        onChange={(e) => updateParameter(idx, 'options', e.target.value.split(',').map(o => o.trim()))}
                        placeholder="opt1, opt2, ..."
                        className={styles.paramOptions}
                      />
                    )}
                    <button type="button" onClick={() => removeParameter(idx)} className={styles.removeRuleBtn}>×</button>
                  </div>
                ))}
                <button type="button" onClick={addParameter} className={styles.addRuleBtn}>
                  <Plus size={14} /> Add Parameter
                </button>
              </div>
            </>
          )}
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
