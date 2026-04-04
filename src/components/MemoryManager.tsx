import React, { useMemo, useState } from 'react';
import { Brain, Check, Pin, Plus, Search, Trash2, X } from 'lucide-react';
import { useMemoryStore } from '../store/memoryStore';
import type { MemoryCategory, MemoryStatus } from '../types/memory';
import { MEMORY_CATEGORIES } from '../utils/memory';
import styles from './MemoryManager.module.css';

const STATUS_OPTIONS: { value: MemoryStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'suggested', label: 'Needs review' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'archived', label: 'Archived' },
];

const CATEGORY_OPTIONS: { value: MemoryCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All categories' },
  ...MEMORY_CATEGORIES.map(category => ({ value: category.value, label: category.label })),
];

export const MemoryManager: React.FC = () => {
  const {
    memories,
    addMemory,
    updateMemory,
    deleteMemory,
    togglePin,
    toggleEnabled,
    confirmMemory,
    archiveMemory,
    clearAllMemories,
    clearArchivedMemories,
  } = useMemoryStore();

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<MemoryStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<MemoryCategory | 'all'>('all');
  const [draftContent, setDraftContent] = useState('');
  const [draftCategory, setDraftCategory] = useState<MemoryCategory>('reference');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [editingCategory, setEditingCategory] = useState<MemoryCategory>('reference');

  const filteredMemories = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return [...memories]
      .filter(memory => {
        if (statusFilter !== 'all' && memory.status !== statusFilter) return false;
        if (categoryFilter !== 'all' && memory.category !== categoryFilter) return false;
        if (!normalizedQuery) return true;
        return `${memory.content} ${memory.sourceSnippet || ''}`.toLowerCase().includes(normalizedQuery);
      })
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [categoryFilter, memories, query, statusFilter]);

  const suggestionCount = memories.filter(memory => memory.status === 'suggested').length;
  const confirmedCount = memories.filter(memory => memory.status === 'confirmed').length;

  const handleAddMemory = () => {
    if (!draftContent.trim()) return;
    addMemory({
      content: draftContent,
      category: draftCategory,
      status: 'confirmed',
      origin: 'manual',
      reviewRequired: false,
      confidence: 1,
    });
    setDraftContent('');
    setDraftCategory('reference');
  };

  const startEditing = (id: string, content: string, category: MemoryCategory) => {
    setEditingId(id);
    setEditingContent(content);
    setEditingCategory(category);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editingContent.trim()) return;
    updateMemory(editingId, {
      content: editingContent,
      category: editingCategory,
      status: 'confirmed',
      reviewRequired: false,
    });
    setEditingId(null);
    setEditingContent('');
  };

  const handleClearAllMemories = () => {
    if (!confirm('Delete all memories? This cannot be undone.')) return;
    clearAllMemories();
  };

  const handleClearArchived = () => {
    if (!confirm('Delete all archived memories?')) return;
    clearArchivedMemories();
  };

  return (
    <div className={styles.manager}>
      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <Brain size={16} />
          <div>
            <div className={styles.summaryValue}>{confirmedCount}</div>
            <div className={styles.summaryLabel}>Confirmed memories</div>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <Check size={16} />
          <div>
            <div className={styles.summaryValue}>{suggestionCount}</div>
            <div className={styles.summaryLabel}>Waiting review</div>
          </div>
        </div>
      </div>

      <div className={styles.createBox}>
        <div className={styles.createHeader}>
          <div>
            <div className={styles.blockTitle}>Add memory manually</div>
            <div className={styles.blockHint}>Simpan preference, personal context, atau project fact yang memang layak diingat lintas chat.</div>
          </div>
        </div>
        <div className={styles.createControls}>
          <select
            value={draftCategory}
            onChange={(e) => setDraftCategory(e.target.value as MemoryCategory)}
            className={styles.select}
          >
            {MEMORY_CATEGORIES.map(category => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
          <input
            value={draftContent}
            onChange={(e) => setDraftContent(e.target.value)}
            placeholder="Contoh: Saya prefer TypeScript daripada JavaScript"
            className={styles.input}
          />
          <button type="button" className={styles.addBtn} onClick={handleAddMemory}>
            <Plus size={16} /> Add
          </button>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={16} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search memories..."
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as MemoryStatus | 'all')}
          className={styles.select}
        >
          {STATUS_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as MemoryCategory | 'all')}
          className={styles.select}
        >
          {CATEGORY_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.bulkActions}>
        <button type="button" className={styles.ghostBtn} onClick={handleClearArchived}>
          Clear archived
        </button>
        <button type="button" className={styles.dangerBtn} onClick={handleClearAllMemories}>
          Clear all memories
        </button>
      </div>

      <div className={styles.list}>
        {filteredMemories.length === 0 ? (
          <div className={styles.emptyState}>No memories match the current filters.</div>
        ) : (
          filteredMemories.map(memory => {
            const isEditing = editingId === memory.id;

            return (
              <div key={memory.id} className={styles.memoryCard}>
                <div className={styles.memoryHeader}>
                  <div className={styles.badges}>
                    <span className={`${styles.badge} ${styles[memory.category]}`}>{memory.category}</span>
                    <span className={`${styles.badge} ${styles[memory.status]}`}>{memory.status}</span>
                    {memory.isSensitive && <span className={`${styles.badge} ${styles.sensitive}`}>Sensitive</span>}
                    {memory.pinned && <span className={`${styles.badge} ${styles.pinned}`}>Pinned</span>}
                    {!memory.enabled && <span className={`${styles.badge} ${styles.disabled}`}>Disabled</span>}
                  </div>
                  <div className={styles.actions}>
                    <button type="button" className={styles.iconBtn} onClick={() => togglePin(memory.id)}>
                      <Pin size={14} />
                    </button>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={() => toggleEnabled(memory.id)}
                    >
                      {memory.enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={() => startEditing(memory.id, memory.content, memory.category)}
                    >
                      Edit
                    </button>
                    <button type="button" className={styles.iconBtn} onClick={() => deleteMemory(memory.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {isEditing ? (
                  <div className={styles.editBox}>
                    <select
                      value={editingCategory}
                      onChange={(e) => setEditingCategory(e.target.value as MemoryCategory)}
                      className={styles.select}
                    >
                      {MEMORY_CATEGORIES.map(category => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                    <textarea
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      className={styles.textarea}
                    />
                    <div className={styles.editActions}>
                      <button type="button" className={styles.primaryBtn} onClick={handleSaveEdit}>
                        Save
                      </button>
                      <button type="button" className={styles.ghostBtn} onClick={() => setEditingId(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={styles.memoryContent}>{memory.content}</div>
                    {memory.sourceSnippet && (
                      <div className={styles.sourceText}>Source: {memory.sourceSnippet}</div>
                    )}
                    <div className={styles.metaRow}>
                      <span>Updated {new Date(memory.updatedAt).toLocaleDateString('id-ID')}</span>
                      {memory.reviewRequired && <span>Needs explicit review before AI trusts it.</span>}
                    </div>
                  </>
                )}

                {memory.status === 'suggested' && !isEditing && (
                  <div className={styles.reviewActions}>
                    <button type="button" className={styles.primaryBtn} onClick={() => confirmMemory(memory.id)}>
                      <Check size={14} /> Approve
                    </button>
                    <button type="button" className={styles.ghostBtn} onClick={() => archiveMemory(memory.id)}>
                      <X size={14} /> Reject
                    </button>
                  </div>
                )}

                {memory.status === 'archived' && !isEditing && (
                  <div className={styles.reviewActions}>
                    <button type="button" className={styles.ghostBtn} onClick={() => confirmMemory(memory.id)}>
                      Restore
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
