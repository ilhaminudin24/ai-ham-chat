import React, { useState } from 'react';
import { X, GitBranch, Plus, Trash2, Check, ArrowRight } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import styles from './BranchPanel.module.css';

interface BranchPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BranchPanel: React.FC<BranchPanelProps> = ({ isOpen, onClose }) => {
  const [newBranchName, setNewBranchName] = useState('');
  const [showNewBranch, setShowNewBranch] = useState(false);
  
  const { 
    currentConversationId, 
    conversations, 
    createBranch, 
    switchBranch, 
    deleteBranch 
  } = useChatStore();
  
  const currentConv = conversations.find(c => c.id === currentConversationId);
  const branches = currentConv?.branches || [];
  const activeBranchId = currentConv?.activeBranchId;

  const handleCreateBranch = () => {
    if (!currentConv || !newBranchName.trim()) return;
    
    // Create branch from last message
    const lastIndex = currentConv.messages.length - 1;
    if (lastIndex < 0) return;
    
    createBranch(currentConv.id, newBranchName.trim(), lastIndex);
    setNewBranchName('');
    setShowNewBranch(false);
    onClose();
  };

  const handleSwitchBranch = (branchId: string) => {
    if (currentConversationId) {
      switchBranch(currentConversationId, branchId);
      onClose();
    }
  };

  const handleDeleteBranch = (branchId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentConversationId && confirm('Delete this branch? This cannot be undone.')) {
      deleteBranch(currentConversationId, branchId);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.panel}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <GitBranch size={18} className={styles.headerIcon} />
            <h2>Branches</h2>
          </div>
          <button onClick={onClose} className={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>
        
        <div className={styles.content}>
          {!currentConv ? (
            <p className={styles.empty}>No conversation selected</p>
          ) : (
            <>
              {/* Current branch status */}
              {activeBranchId ? (
                <div className={styles.currentStatus}>
                  <span className={styles.statusLabel}>Currently on:</span>
                  <span className={styles.currentBranchName}>🌿 {activeBranchId && branches.find(b => b.id === activeBranchId)?.name}</span>
                </div>
              ) : (
                <div className={styles.currentStatus}>
                  <span className={styles.statusLabel}>Currently on:</span>
                  <span className={styles.currentBranchName}>💬 Main Thread</span>
                </div>
              )}
              
              <p className={styles.description}>
                Branches let you explore different directions without losing your original conversation.
              </p>
              
              {/* Main thread option */}
              <div 
                className={`${styles.branchItem} ${!activeBranchId ? styles.active : ''}`}
                onClick={() => handleSwitchBranch('')}
              >
                <div className={styles.branchIcon}>💬</div>
                <div className={styles.branchInfo}>
                  <div className={styles.branchName}>Main Thread</div>
                  <div className={styles.branchMeta}>{currentConv.messages.length} messages</div>
                </div>
                {!activeBranchId && <Check size={16} className={styles.checkIcon} />}
              </div>
              
              {/* Existing branches */}
              {branches.length > 0 && (
                <div className={styles.sectionTitle}>Your Branches</div>
              )}
              {branches.map(branch => (
                <div 
                  key={branch.id}
                  className={`${styles.branchItem} ${activeBranchId === branch.id ? styles.active : ''}`}
                  onClick={() => handleSwitchBranch(branch.id)}
                >
                  <div className={styles.branchIcon}>🌿</div>
                  <div className={styles.branchInfo}>
                    <div className={styles.branchName}>{branch.name}</div>
                    <div className={styles.branchMeta}>
                      {branch.messages.length} messages • forked from message #{branch.parentMessageIndex + 1}
                    </div>
                  </div>
                  {activeBranchId === branch.id && <Check size={16} className={styles.checkIcon} />}
                  <button 
                    className={styles.deleteBtn}
                    onClick={(e) => handleDeleteBranch(branch.id, e)}
                    title="Delete branch"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              
              {/* Create new branch */}
              {showNewBranch ? (
                <div className={styles.newBranchForm}>
                  <label className={styles.formLabel}>New branch name</label>
                  <input
                    type="text"
                    placeholder="e.g., Try alternative approach"
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateBranch()}
                    autoFocus
                    className={styles.newBranchInput}
                  />
                  <p className={styles.formHint}>
                    <ArrowRight size={12} /> Branch will start from your last message
                  </p>
                  <div className={styles.newBranchActions}>
                    <button 
                      onClick={() => setShowNewBranch(false)}
                      className={styles.cancelBtn}
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleCreateBranch}
                      disabled={!newBranchName.trim()}
                      className={styles.createBtn}
                    >
                      Create Branch
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  className={styles.newBranchBtn}
                  onClick={() => setShowNewBranch(true)}
                >
                  <Plus size={16} />
                  Create New Branch
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};
