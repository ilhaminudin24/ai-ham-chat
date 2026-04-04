import React, { useState } from 'react';
import { X, Plus, Tag } from 'lucide-react';
import styles from './TagSelector.module.css';

const PRESET_TAGS = [
  { name: 'Urgent', color: '#ef4444', emoji: '🔴' },
  { name: 'Done', color: '#22c55e', emoji: '🟢' },
  { name: 'Research', color: '#3b82f6', emoji: '🔵' },
  { name: 'Idea', color: '#eab308', emoji: '🟡' },
  { name: 'Personal', color: '#a855f7', emoji: '🟣' },
  { name: 'Work', color: '#f97316', emoji: '🟠' },
];

interface TagSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  currentTags: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
}

export const TagSelector: React.FC<TagSelectorProps> = ({ isOpen, onClose, currentTags, onAddTag, onRemoveTag }) => {
  const [customTagInput, setCustomTagInput] = useState('');

  if (!isOpen) return null;

  const handleAddCustom = () => {
    const tag = customTagInput.trim();
    if (tag && !currentTags.includes(tag)) {
      onAddTag(tag);
      setCustomTagInput('');
    }
  };

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.panel}>
        <div className={styles.header}>
          <Tag size={16} />
          <span>Manage Tags</span>
          <button className={styles.closeBtn} onClick={onClose}><X size={16} /></button>
        </div>

        {/* Current tags */}
        {currentTags.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Current Tags</div>
            <div className={styles.tagList}>
              {currentTags.map(tag => {
                const preset = PRESET_TAGS.find(p => p.name === tag);
                return (
                  <span 
                    key={tag} 
                    className={styles.tag}
                    style={preset ? { borderColor: preset.color, color: preset.color } : {}}
                  >
                    {preset?.emoji || '🏷️'} {tag}
                    <button onClick={() => onRemoveTag(tag)} className={styles.tagRemove}>
                      <X size={12} />
                    </button>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Preset tags */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Quick Add</div>
          <div className={styles.presetGrid}>
            {PRESET_TAGS.filter(p => !currentTags.includes(p.name)).map(preset => (
              <button
                key={preset.name}
                className={styles.presetBtn}
                style={{ borderColor: preset.color }}
                onClick={() => onAddTag(preset.name)}
              >
                {preset.emoji} {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Custom tag */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Custom Tag</div>
          <div className={styles.customInput}>
            <input
              type="text"
              placeholder="Tag name..."
              value={customTagInput}
              onChange={(e) => setCustomTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
              maxLength={20}
            />
            <button onClick={handleAddCustom} disabled={!customTagInput.trim()}>
              <Plus size={16} /> Add
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

// Small inline tag chip for sidebar display
export const TagChip: React.FC<{ tag: string; small?: boolean }> = ({ tag, small }) => {
  const preset = PRESET_TAGS.find(p => p.name === tag);
  return (
    <span 
      className={`${styles.chip} ${small ? styles.chipSmall : ''}`}
      style={preset ? { backgroundColor: preset.color + '20', color: preset.color, borderColor: preset.color + '40' } : {}}
      title={tag}
    >
      {preset?.emoji || '🏷️'} {!small && tag}
    </span>
  );
};
