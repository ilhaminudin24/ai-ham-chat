import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Download, Upload, RefreshCw, Search, Star, TrendingUp, Copy, Check } from 'lucide-react';
import { getSkills, toggleSkill, deleteSkill, exportSkills, exportSingleSkill, validateSkillImport } from '../utils/skillApi';
import type { Skill } from '../types/skills';
import { SKILL_CATEGORIES, FEATURED_SKILLS } from '../types/skills';
import type { SkillCategory } from '../types/skills';
import styles from './SkillsPanel.module.css';
import { SkillEditor } from './SkillEditor';

interface SkillsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSkillsChange?: (skills: Skill[]) => void;
}

type ViewTab = 'all' | 'featured' | 'analytics';

export const SkillsPanel: React.FC<SkillsPanelProps> = ({ isOpen, onClose, onSkillsChange }) => {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ViewTab>('all');
  const [selectedCategory, setSelectedCategory] = useState<SkillCategory | 'all'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [detailSkill, setDetailSkill] = useState<Skill | null>(null);

  useEffect(() => {
    if (isOpen) loadSkills();
  }, [isOpen]);

  const loadSkills = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSkills();
      setSkills(data);
      onSkillsChange?.(data);
    } catch {
      setError('Failed to load skills');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (skill: Skill) => {
    if (!skill.enabled && skills.filter(s => s.enabled).length >= 3) {
      setError('Maximum 3 skills can be active at once');
      setTimeout(() => setError(null), 3000);
      return;
    }
    try {
      const updated = await toggleSkill(skill.id);
      // Increment usage count when enabling (13e)
      if (updated.enabled) {
        updated.usageCount = (updated.usageCount || 0) + 1;
      }
      setSkills(prev => prev.map(s => s.id === skill.id ? updated : s));
      onSkillsChange?.(skills);
    } catch {
      setError('Failed to toggle skill');
    }
  };

  const handleDelete = async (skill: Skill) => {
    if (!confirm(`Delete "${skill.name}"?`)) return;
    try {
      await deleteSkill(skill.id);
      setSkills(prev => prev.filter(s => s.id !== skill.id));
    } catch {
      setError('Failed to delete skill');
    }
  };

  const handleExport = async () => {
    try {
      const data = await exportSkills();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-ham-skills-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Failed to export skills');
    }
  };

  // Copy single skill as JSON (13d)
  const handleCopySkill = (skill: Skill) => {
    const json = exportSingleSkill(skill);
    navigator.clipboard.writeText(json);
    setCopiedId(skill.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Validated import (13d)
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const result = validateSkillImport(data);
        if (result.errors.length > 0) {
          setError(`Import warnings: ${result.errors.join('; ')}`);
        }
        if (result.skills.length > 0) {
          setSkills(prev => [...prev, ...result.skills]);
          if (result.errors.length === 0) {
            setError(`✅ Imported ${result.skills.length} skill(s) successfully!`);
          }
          setTimeout(() => setError(null), 4000);
        }
      } catch {
        setError('Invalid JSON file format');
      }
    };
    input.click();
  };

  // Install featured skill
  const handleInstallFeatured = (template: Omit<Skill, 'id'>) => {
    const existing = skills.find(s => s.name === template.name);
    if (existing) {
      setError(`"${template.name}" is already installed`);
      setTimeout(() => setError(null), 2000);
      return;
    }
    const newSkill: Skill = {
      ...template,
      id: `featured-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      usageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSkills(prev => [...prev, newSkill]);
    setError(`✅ "${template.name}" installed!`);
    setTimeout(() => setError(null), 2000);
  };

  const handleCreateNew = () => { setEditingSkill(null); setIsEditorOpen(true); };
  const handleEdit = (skill: Skill) => { setEditingSkill(skill); setIsEditorOpen(true); };
  const handleEditorClose = () => { setIsEditorOpen(false); setEditingSkill(null); loadSkills(); };

  // Filter by search + category
  const filteredSkills = useMemo(() => {
    let result = skills;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        (s.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }
    if (selectedCategory !== 'all') {
      result = result.filter(s => (s.category || 'custom') === selectedCategory);
    }
    return result;
  }, [skills, searchQuery, selectedCategory]);

  // Most used skills (13e)
  const mostUsedSkills = useMemo(() => {
    return [...skills]
      .filter(s => (s.usageCount || 0) > 0)
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
      .slice(0, 5);
  }, [skills]);

  const activeCount = skills.filter(s => s.enabled).length;
  const getCategoryLabel = (cat?: string) => SKILL_CATEGORIES.find(c => c.value === cat)?.label || 'Custom';
  const getCategoryIcon = (cat?: string) => SKILL_CATEGORIES.find(c => c.value === cat)?.icon || '🔧';

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.panel}>
        <div className={styles.header}>
          <h2>🧩 Skills Marketplace</h2>
          <span className={styles.activeCount}>{activeCount}/3 active</span>
          <button onClick={onClose} className={styles.closeBtn}><X size={20} /></button>
        </div>

        {/* Tab Bar */}
        <div className={styles.tabBar}>
          <button className={`${styles.tab} ${activeTab === 'all' ? styles.tabActive : ''}`} onClick={() => setActiveTab('all')}>
            All Skills
          </button>
          <button className={`${styles.tab} ${activeTab === 'featured' ? styles.tabActive : ''}`} onClick={() => setActiveTab('featured')}>
            <Star size={14} /> Featured
          </button>
          <button className={`${styles.tab} ${activeTab === 'analytics' ? styles.tabActive : ''}`} onClick={() => setActiveTab('analytics')}>
            <TrendingUp size={14} /> Analytics
          </button>
        </div>

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.searchBox}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Search skills, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className={styles.actions}>
            <button onClick={handleCreateNew} className={styles.actionBtn} title="New Skill"><Plus size={16} /> New</button>
            <button onClick={handleImport} className={styles.actionBtn} title="Import"><Upload size={16} /></button>
            <button onClick={handleExport} className={styles.actionBtn} title="Export All"><Download size={16} /></button>
            <button onClick={loadSkills} className={styles.actionBtn} title="Refresh"><RefreshCw size={16} /></button>
          </div>
        </div>

        {/* Category Filter (all tab) */}
        {activeTab === 'all' && (
          <div className={styles.categoryBar}>
            <button
              className={`${styles.catBtn} ${selectedCategory === 'all' ? styles.catActive : ''}`}
              onClick={() => setSelectedCategory('all')}
            >All</button>
            {SKILL_CATEGORIES.map(cat => (
              <button
                key={cat.value}
                className={`${styles.catBtn} ${selectedCategory === cat.value ? styles.catActive : ''}`}
                onClick={() => setSelectedCategory(cat.value)}
              >{cat.icon} {cat.label}</button>
            ))}
          </div>
        )}

        {error && (
          <div className={styles.error}>
            {error}
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        <div className={styles.skillList}>
          {/* Featured Tab */}
          {activeTab === 'featured' && (
            <>
              <div className={styles.sectionTitle}>⭐ Curated Skill Packs</div>
              {FEATURED_SKILLS.map((template, idx) => {
                const installed = skills.some(s => s.name === template.name);
                return (
                  <div key={idx} className={`${styles.skillCard} ${installed ? styles.installed : ''}`}>
                    <div className={styles.skillIcon}>{template.icon}</div>
                    <div className={styles.skillInfo}>
                      <div className={styles.skillName}>
                        {template.name}
                        <span className={styles.categoryBadge}>{getCategoryIcon(template.category)} {getCategoryLabel(template.category)}</span>
                      </div>
                      <div className={styles.skillDesc}>{template.description}</div>
                      {template.tags && template.tags.length > 0 && (
                        <div className={styles.skillTags}>
                          {template.tags.map(t => <span key={t} className={styles.tagChip}>{t}</span>)}
                        </div>
                      )}
                    </div>
                    <button
                      className={`${styles.installBtn} ${installed ? styles.installed : ''}`}
                      onClick={() => !installed && handleInstallFeatured(template)}
                      disabled={installed}
                    >
                      {installed ? '✓ Installed' : '+ Install'}
                    </button>
                  </div>
                );
              })}
            </>
          )}

          {/* Analytics Tab (13e) */}
          {activeTab === 'analytics' && (
            <>
              <div className={styles.sectionTitle}>📊 Most Used Skills</div>
              {mostUsedSkills.length === 0 ? (
                <div className={styles.empty}>No usage data yet. Start using skills!</div>
              ) : (
                mostUsedSkills.map((skill, idx) => (
                  <div key={skill.id} className={styles.analyticsCard}>
                    <span className={styles.analyticsRank}>#{idx + 1}</span>
                    <span className={styles.skillIcon}>{skill.icon}</span>
                    <div className={styles.skillInfo}>
                      <div className={styles.skillName}>{skill.name}</div>
                      <div className={styles.skillDesc}>{skill.description}</div>
                    </div>
                    <div className={styles.usageCount}>
                      <TrendingUp size={14} />
                      {skill.usageCount || 0}
                    </div>
                  </div>
                ))
              )}

              <div className={styles.sectionTitle} style={{ marginTop: 20 }}>📂 Category Breakdown</div>
              <div className={styles.categoryStats}>
                {SKILL_CATEGORIES.map(cat => {
                  const count = skills.filter(s => (s.category || 'custom') === cat.value).length;
                  return (
                    <div key={cat.value} className={styles.catStatItem}>
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                      <span className={styles.catStatCount}>{count}</span>
                    </div>
                  );
                })}
              </div>

              <div className={styles.sectionTitle} style={{ marginTop: 20 }}>📈 Summary</div>
              <div className={styles.categorySummary}>
                <div>Total Skills: <strong>{skills.length}</strong></div>
                <div>Active: <strong>{activeCount}/3</strong></div>
                <div>Total Activations: <strong>{skills.reduce((acc, s) => acc + (s.usageCount || 0), 0)}</strong></div>
              </div>
            </>
          )}

          {/* All Skills Tab */}
          {activeTab === 'all' && (
            loading ? (
              <div className={styles.loading}>Loading skills...</div>
            ) : filteredSkills.length === 0 ? (
              <div className={styles.empty}>
                No skills found.
                <button onClick={handleCreateNew} className={styles.emptyAction}>Create one →</button>
              </div>
            ) : (
              filteredSkills.map(skill => (
                <div key={skill.id} className={`${styles.skillCard} ${skill.enabled ? styles.enabled : ''}`}>
                  <div className={styles.skillIcon}>{skill.icon}</div>
                  <div className={styles.skillInfo} onClick={() => setDetailSkill(detailSkill?.id === skill.id ? null : skill)}>
                    <div className={styles.skillName}>
                      {skill.name}
                      {skill.version && <span className={styles.versionBadge}>v{skill.version}</span>}
                      <span className={styles.categoryBadge}>{getCategoryIcon(skill.category)}</span>
                    </div>
                    <div className={styles.skillDesc}>{skill.description}</div>
                    {skill.tags && skill.tags.length > 0 && (
                      <div className={styles.skillTags}>
                        {skill.tags.map(t => <span key={t} className={styles.tagChip}>{t}</span>)}
                      </div>
                    )}
                    {/* Expanded detail */}
                    {detailSkill?.id === skill.id && (
                      <div className={styles.skillDetail}>
                        <div className={styles.detailRow}><span>Author:</span> {skill.author || 'User'}</div>
                        <div className={styles.detailRow}><span>Category:</span> {getCategoryLabel(skill.category)}</div>
                        <div className={styles.detailRow}><span>Uses:</span> {skill.usageCount || 0}</div>
                        {skill.parameters && skill.parameters.length > 0 && (
                          <div className={styles.detailRow}><span>Params:</span> {skill.parameters.map(p => p.label).join(', ')}</div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className={styles.skillActions}>
                    {(skill.usageCount || 0) > 0 && (
                      <span className={styles.usageBadge} title="Usage count">{skill.usageCount}</span>
                    )}
                    <button
                      className={`${styles.toggleBtn} ${skill.enabled ? styles.on : ''}`}
                      onClick={() => handleToggle(skill)}
                      disabled={!skill.enabled && activeCount >= 3}
                      title={skill.enabled ? 'Disable' : 'Enable'}
                    >
                      {skill.enabled ? 'ON' : 'OFF'}
                    </button>
                    <button onClick={() => handleCopySkill(skill)} className={styles.editBtn} title="Copy as JSON">
                      {copiedId === skill.id ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                    <button onClick={() => handleEdit(skill)} className={styles.editBtn} title="Edit">📝</button>
                    <button onClick={() => handleDelete(skill)} className={styles.deleteBtn} title="Delete">🗑️</button>
                  </div>
                </div>
              ))
            )
          )}
        </div>

        <div className={styles.footer}>
          <p>Max 3 skills active • Skills affect AI responses • Click skill name for details</p>
        </div>
      </div>

      {isEditorOpen && (
        <SkillEditor skill={editingSkill} onClose={handleEditorClose} />
      )}
    </>
  );
};
