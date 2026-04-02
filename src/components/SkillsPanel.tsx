import React, { useState, useEffect } from 'react';
import { X, Plus, Download, Upload, RefreshCw, Search } from 'lucide-react';
import { getSkills, toggleSkill, deleteSkill, exportSkills } from '../utils/skillApi';
import type { Skill } from '../types/skills';
import styles from './SkillsPanel.module.css';
import { SkillEditor } from './SkillEditor';

interface SkillsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSkillsChange?: (skills: Skill[]) => void;
}

export const SkillsPanel: React.FC<SkillsPanelProps> = ({ isOpen, onClose, onSkillsChange }) => {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSkills();
    }
  }, [isOpen]);

  const loadSkills = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSkills();
      setSkills(data);
      onSkillsChange?.(data);
    } catch (e) {
      setError('Failed to load skills');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (skill: Skill) => {
    // Max 3 active skills
    if (!skill.enabled && skills.filter(s => s.enabled).length >= 3) {
      setError('Maximum 3 skills can be active at once');
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    try {
      const updated = await toggleSkill(skill.id);
      setSkills(prev => prev.map(s => s.id === skill.id ? updated : s));
      onSkillsChange?.(skills);
    } catch (e) {
      setError('Failed to toggle skill');
    }
  };

  const handleDelete = async (skill: Skill) => {
    if (!confirm(`Delete "${skill.name}"?`)) return;
    
    try {
      await deleteSkill(skill.id);
      setSkills(prev => prev.filter(s => s.id !== skill.id));
    } catch (e) {
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
    } catch (e) {
      setError('Failed to export skills');
    }
  };

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
        if (Array.isArray(data)) {
          setSkills(data);
          setError('Skills imported! Note: Server sync needed.');
        }
      } catch (e) {
        setError('Invalid skills file');
      }
    };
    input.click();
  };

  const handleCreateNew = () => {
    setEditingSkill(null);
    setIsEditorOpen(true);
  };

  const handleEdit = (skill: Skill) => {
    setEditingSkill(skill);
    setIsEditorOpen(true);
  };

  const handleEditorClose = () => {
    setIsEditorOpen(false);
    setEditingSkill(null);
    loadSkills();
  };

  const filteredSkills = skills.filter(skill =>
    skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    skill.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCount = skills.filter(s => s.enabled).length;

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.panel}>
        <div className={styles.header}>
          <h2>Skills Manager</h2>
          <span className={styles.activeCount}>{activeCount}/3 active</span>
          <button onClick={onClose} className={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.searchBox}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Search skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className={styles.actions}>
            <button onClick={handleCreateNew} className={styles.actionBtn}>
              <Plus size={16} /> New
            </button>
            <button onClick={handleImport} className={styles.actionBtn}>
              <Upload size={16} />
            </button>
            <button onClick={handleExport} className={styles.actionBtn}>
              <Download size={16} />
            </button>
            <button onClick={loadSkills} className={styles.actionBtn}>
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {error && (
          <div className={styles.error}>
            {error}
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        <div className={styles.skillList}>
          {loading ? (
            <div className={styles.loading}>Loading skills...</div>
          ) : filteredSkills.length === 0 ? (
            <div className={styles.empty}>No skills found</div>
          ) : (
            filteredSkills.map(skill => (
              <div key={skill.id} className={`${styles.skillCard} ${skill.enabled ? styles.enabled : ''}`}>
                <div className={styles.skillIcon}>{skill.icon}</div>
                <div className={styles.skillInfo}>
                  <div className={styles.skillName}>{skill.name}</div>
                  <div className={styles.skillDesc}>{skill.description}</div>
                </div>
                <div className={styles.skillActions}>
                  <button
                    className={`${styles.toggleBtn} ${skill.enabled ? styles.on : ''}`}
                    onClick={() => handleToggle(skill)}
                    disabled={!skill.enabled && activeCount >= 3}
                    title={skill.enabled ? 'Disable' : 'Enable'}
                  >
                    {skill.enabled ? 'ON' : 'OFF'}
                  </button>
                  <button onClick={() => handleEdit(skill)} className={styles.editBtn} title="Edit">
                    📝
                  </button>
                  <button onClick={() => handleDelete(skill)} className={styles.deleteBtn} title="Delete">
                    🗑️
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className={styles.footer}>
          <p>Max 3 skills active. Skills affect AI responses.</p>
        </div>
      </div>

      {isEditorOpen && (
        <SkillEditor
          skill={editingSkill}
          onClose={handleEditorClose}
        />
      )}
    </>
  );
};
