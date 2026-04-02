import React, { useState, useMemo } from 'react';
import { X, Search, ChevronRight } from 'lucide-react';
import { templates, categories, type Template } from '../data/templates';
import { useChatStore } from '../store/chatStore';
import styles from './TemplatesPanel.module.css';

interface TemplatesPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TemplatesPanel: React.FC<TemplatesPanelProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Business');
  
  const { setInputText, createNewConversation } = useChatStore();

  // Filter templates based on query
  const filteredTemplates = useMemo(() => {
    if (!query.trim()) return templates;
    const q = query.toLowerCase();
    return templates.filter(t => 
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q)
    );
  }, [query]);

  // Group by category
  const groupedTemplates = useMemo(() => {
    const groups: Record<string, Template[]> = {};
    filteredTemplates.forEach(t => {
      if (!groups[t.category]) groups[t.category] = [];
      groups[t.category].push(t);
    });
    return groups;
  }, [filteredTemplates]);

  const handleUseTemplate = (template: Template) => {
    // Replace variables in prompt
    let prompt = template.prompt;
    prompt = prompt.replace(/\{\{topic\}\}/g, '[Your Topic Here]');
    prompt = prompt.replace(/\{\{purpose\}\}/g, '[Email Purpose]');
    prompt = prompt.replace(/\{\{code\}\}/g, '[Your Code Here]');
    prompt = prompt.replace(/\{\{audience\}\}/g, '[Target Audience]');
    prompt = prompt.replace(/\{\{tone\}\}/g, 'informative and engaging');
    prompt = prompt.replace(/\{\{decision\}\}/g, '[Decision to Make]');
    prompt = prompt.replace(/\{\{criteria\}\}/g, 'Impact, Cost, Time, Risk');
    
    // Set the prompt to input text
    setInputText(prompt);
    
    // Create new conversation if none selected
    const state = useChatStore.getState();
    if (!state.currentConversationId) {
      createNewConversation();
    }
    
    onClose();
  };

  const toggleCategory = (category: string) => {
    setExpandedCategory(expandedCategory === category ? null : category);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.panel}>
        <div className={styles.header}>
          <h2>📋 Templates</h2>
          <button onClick={onClose} className={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.searchBox}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search templates..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.templateList}>
          {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => {
            const catInfo = categories.find(c => c.name === category);
            return (
              <div key={category} className={styles.categoryGroup}>
                <div 
                  className={styles.categoryHeader}
                  onClick={() => toggleCategory(category)}
                >
                  <ChevronRight 
                    size={16} 
                    className={`${styles.chevron} ${expandedCategory === category ? styles.expanded : ''}`}
                  />
                  <span className={styles.categoryIcon}>{catInfo?.icon || '📁'}</span>
                  <span className={styles.categoryName}>{category}</span>
                  <span className={styles.categoryCount}>{categoryTemplates.length}</span>
                </div>
                
                {expandedCategory === category && (
                  <div className={styles.templates}>
                    {categoryTemplates.map(template => (
                      <div 
                        key={template.id}
                        className={styles.templateCard}
                        onClick={() => handleUseTemplate(template)}
                      >
                        <div className={styles.templateIcon}>{template.icon}</div>
                        <div className={styles.templateInfo}>
                          <div className={styles.templateName}>{template.name}</div>
                          <div className={styles.templateDesc}>{template.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          
          {Object.keys(groupedTemplates).length === 0 && (
            <div className={styles.empty}>No templates found</div>
          )}
        </div>

        <div className={styles.footer}>
          <p>Click a template → goes to chat input → edit → send!</p>
        </div>
      </div>
    </>
  );
};
