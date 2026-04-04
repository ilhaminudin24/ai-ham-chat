import React, { useState, useRef } from 'react';
import { X, Play, Edit2, Trash2, Plus, Workflow, Copy, Download, Upload, Zap } from 'lucide-react';
import { useChainStore } from '../store/chainStore';
import { useChatStore } from '../store/chatStore';
import { PromptChain } from '../types/chains';
import styles from './ChainsPanel.module.css';

interface ChainsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onEditChain: (chain: PromptChain | null) => void;
}

export const ChainsPanel: React.FC<ChainsPanelProps> = ({ isOpen, onClose, onEditChain }) => {
  const { chains, deleteChain, startExecution, duplicateChain } = useChainStore();
  const { currentConversationId } = useChatStore();
  
  const [selectedChain, setSelectedChain] = useState<PromptChain | null>(null);
  const [initialInput, setInitialInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const importInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen && !selectedChain) return null;

  const filteredChains = searchQuery.trim()
    ? chains.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : chains;

  const handleRunChain = (chain: PromptChain, mode: 'step' | 'auto' = 'step') => {
    const needsInput = chain.steps.some(step => step.promptTemplate.includes('{{input}}'));
    if (needsInput) {
      setSelectedChain({ ...chain, autoAdvance: mode === 'auto' ? true : chain.autoAdvance });
      setInitialInput('');
    } else {
      startChainExecution({ ...chain, autoAdvance: mode === 'auto' ? true : chain.autoAdvance }, '');
    }
  };

  const startChainExecution = (chain: PromptChain, input: string) => {
    const store = useChatStore.getState();
    let targetConvId = currentConversationId;

    // Create a fresh conversation for chain execution
    const existingConv = targetConvId
      ? store.conversations.find(c => c.id === targetConvId)
      : null;
    const hasMessages = existingConv && existingConv.messages.length > 0;

    if (!targetConvId || hasMessages) {
      store.createNewConversation();
      targetConvId = useChatStore.getState().currentConversationId;
    }
    
    if (targetConvId) {
      // Temporarily update the chain's autoAdvance if running in auto mode
      if (chain.autoAdvance) {
        useChainStore.getState().updateChain(chain.id, { autoAdvance: chain.autoAdvance });
      }
      startExecution(targetConvId, chain.id, input || undefined);
      // Switch to the conversation
      useChatStore.getState().setCurrentConversation(targetConvId);
      setSelectedChain(null);
      onClose();
    }
  };

  const handleExportChain = (chain: PromptChain) => {
    const exportData = { ...chain };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chain-${chain.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportChain = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target?.result as string);
        if (!data.name || !data.steps || !Array.isArray(data.steps)) {
          alert('Invalid chain file format.');
          return;
        }
        const now = new Date().toISOString();
        const imported: PromptChain = {
          id: `chain-${Date.now()}`,
          name: data.name,
          description: data.description || '',
          icon: data.icon || '🔗',
          steps: data.steps.map((s: Record<string, unknown>, i: number) => ({
            id: `step-${Date.now()}-${i}`,
            name: (s.name as string) || `Step ${i + 1}`,
            promptTemplate: (s.promptTemplate as string) || '',
            outputMode: (s.outputMode as string) || 'auto',
          })),
          autoAdvance: data.autoAdvance || false,
          createdAt: now,
          updatedAt: now,
        };
        useChainStore.getState().addChain(imported);
      } catch {
        alert('Failed to parse chain file.');
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be imported again
    if (importInputRef.current) importInputRef.current.value = '';
  };

  return (
    <>
      <div 
        className={`${styles.panelOverlay} ${isOpen ? styles.open : ''}`} 
        onClick={onClose}
      />
      
      <div className={`${styles.panelContainer} ${isOpen ? styles.open : ''}`}>
        <div className={styles.panelHeader}>
          <div className={styles.headerTitle}>
            <Workflow size={20} />
            Prompt Chains
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        {chains.length > 2 && (
          <div className={styles.searchContainer}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search chains..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}

        <div className={styles.panelContent}>
          {filteredChains.map((chain) => (
            <div key={chain.id} className={styles.chainCard}>
              <div className={styles.chainHeader}>
                <div className={styles.chainTitleGroup}>
                  <span className={styles.chainIcon}>{chain.icon || '🔗'}</span>
                  <div>
                    <div className={styles.chainTitle}>{chain.name}</div>
                    <div className={styles.chainMeta}>
                      <span className={styles.stepBadge}>{chain.steps.length} Steps</span>
                      {chain.autoAdvance && <span className={styles.autoBadge}>Auto</span>}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className={styles.chainDescription}>
                {chain.description}
              </div>
              
              <div className={styles.cardFooter}>
                <div className={styles.cardActions}>
                  <button title="Edit" onClick={() => onEditChain(chain)}>
                    <Edit2 size={14} />
                  </button>
                  <button title="Duplicate" onClick={() => duplicateChain(chain.id)}>
                    <Copy size={14} />
                  </button>
                  <button title="Export as JSON" onClick={() => handleExportChain(chain)}>
                    <Download size={14} />
                  </button>
                  <button className={styles.deleteBtn} title="Delete" onClick={() => {
                    if (window.confirm('Delete this prompt chain?')) {
                      deleteChain(chain.id);
                    }
                  }}>
                    <Trash2 size={14} />
                  </button>
                </div>
                
                <div className={styles.runActions}>
                  <button 
                    className={styles.quickRunBtn}
                    onClick={() => handleRunChain(chain, 'auto')}
                    title="Quick Run (auto-advance all steps)"
                  >
                    <Zap size={13} />
                  </button>
                  <button 
                    className={styles.runBtn}
                    onClick={() => handleRunChain(chain, 'step')}
                  >
                    <Play size={14} fill="currentColor" />
                    Run
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filteredChains.length === 0 && searchQuery && (
            <div className={styles.emptyState}>
              <p>No chains match "{searchQuery}"</p>
            </div>
          )}

          <div className={styles.bottomActions}>
            <button className={styles.createBtn} onClick={() => onEditChain(null)}>
              <Plus size={18} />
              Create New Chain
            </button>
            <button className={styles.importBtn} onClick={() => importInputRef.current?.click()}>
              <Upload size={16} />
              Import
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleImportChain}
            />
          </div>
        </div>
      </div>

      {/* Input Modal */}
      {selectedChain && (
        <div className={styles.inputModalOverlay}>
          <div className={styles.inputModal}>
            <h3>{selectedChain.icon} Start: {selectedChain.name}</h3>
            <p>This workflow requires initial input to begin.</p>
            <textarea
              placeholder="Provide context, code, or data here..."
              value={initialInput}
              onChange={(e) => setInitialInput(e.target.value)}
              autoFocus
            />
            <div className={styles.inputModalActions}>
              <button 
                className={styles.cancelModalBtn} 
                onClick={() => setSelectedChain(null)}
              >
                Cancel
              </button>
              <button 
                className={styles.startBtn}
                disabled={!initialInput.trim()}
                onClick={() => startChainExecution(selectedChain, initialInput)}
              >
                <Play size={14} fill="currentColor" />
                Start Execution
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
