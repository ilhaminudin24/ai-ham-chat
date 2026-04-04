import React, { useState } from 'react';
import { X, Play, Edit2, Trash2, Plus, Workflow } from 'lucide-react';
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
  const { chains, deleteChain, startExecution } = useChainStore();
  const { currentConversationId } = useChatStore();
  
  const [selectedChain, setSelectedChain] = useState<PromptChain | null>(null);
  const [initialInput, setInitialInput] = useState('');

  if (!isOpen && !selectedChain) return null;

  const handleRunChain = (chain: PromptChain) => {
    // Check if chain requires initial input
    const needsInput = chain.steps.some(step => step.promptTemplate.includes('{{input}}'));
    if (needsInput) {
      setSelectedChain(chain);
      setInitialInput('');
    } else {
      startChainExecution(chain, '');
    }
  };

  const startChainExecution = (chain: PromptChain, input: string) => {
    // Determine active conversation or create new
    let targetConvId = currentConversationId;
    if (!targetConvId || useChatStore.getState().conversations.find(c => c.id === targetConvId)?.messages.length !== 0) {
      // create new conversation without switching automatically here if we use the store action directly 
      // but easiest is to call createNewConversation
      useChatStore.getState().createNewConversation();
      targetConvId = useChatStore.getState().currentConversationId;
    }
    
    if (targetConvId) {
      startExecution(targetConvId, chain.id, input);
      setSelectedChain(null);
      onClose();
    }
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

        <div className={styles.panelContent}>
          {chains.map((chain) => (
            <div key={chain.id} className={styles.chainCard}>
              <div className={styles.chainHeader}>
                <div className={styles.chainTitleGroup}>
                  <span className={styles.chainIcon}>{chain.icon || '🔗'}</span>
                  <div>
                    <div className={styles.chainTitle}>{chain.name}</div>
                    <div className={styles.chainMeta}>
                      <span className={styles.stepBadge}>{chain.steps.length} Steps</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className={styles.chainDescription}>
                {chain.description}
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                <div className={styles.cardActions}>
                  <button title="Edit Chain" onClick={() => onEditChain(chain)}>
                    <Edit2 size={14} />
                  </button>
                  <button className={styles.deleteBtn} title="Delete Chain" onClick={() => {
                    if (window.confirm('Are you sure you want to delete this prompt chain?')) {
                      deleteChain(chain.id);
                    }
                  }}>
                    <Trash2 size={14} />
                  </button>
                </div>
                
                <button 
                  className={styles.runBtn}
                  onClick={() => handleRunChain(chain)}
                >
                  <Play size={14} fill="currentColor" />
                  Run
                </button>
              </div>
            </div>
          ))}
          
          <button className={styles.createBtn} onClick={() => onEditChain(null)}>
            <Plus size={18} />
            Create New Chain
          </button>
        </div>
      </div>

      {/* Input Modal */}
      {selectedChain && (
        <div className={styles.inputModalOverlay}>
          <div className={styles.inputModal}>
            <h3>Start Chain: {selectedChain.name}</h3>
            <p>This workflow requires an initial input to begin.</p>
            <textarea
              placeholder="Provide context, code, or data here..."
              value={initialInput}
              onChange={(e) => setInitialInput(e.target.value)}
              autoFocus
            />
            <div className={styles.inputModalActions}>
              <button 
                className={styles.cancelBtn} 
                onClick={() => setSelectedChain(null)}
              >
                Cancel
              </button>
              <button 
                className={styles.runBtn}
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
