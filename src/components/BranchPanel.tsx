import React, { useState } from 'react';
import { X, GitBranch, Plus, Trash2 } from 'lucide-react';
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
    if (currentConversationId && confirm('Delete this branch?')) {
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
              <p className={styles.description}>
                Create branches to explore different directions without losing your main conversation.
              </p>
              
              {/* Main thread (no branch) */}
              <div 
                className={`${styles.branchItem} ${!currentConv.activeBranchId ? styles.active : ''}`}
                onClick={() => {
                  if (currentConversationId) {
                    switchBranch(currentConversationId, '');
                  }
                  onClose();
                }}
              >
                <div className={styles.branchIcon}>💬</div>
                <div className={styles.branchInfo}>
                  <div className={styles.branchName}>Main Thread</div>
                  <div className={styles.branchMeta}>{currentConv.messages.length} messages</div>
                </div>
              </div>
              
              {/* Existing branches */}
              {branches.map(branch => (
                <div 
                  key={branch.id}
                  className={`${styles.branchItem} ${currentConv.activeBranchId === branch.id ? styles.active : ''}`}
                  onClick={() => handleSwitchBranch(branch.id)}
                >
                  <div className={styles.branchIcon}>🌿</div>
                  <div className={styles.branchInfo}>
                    <div className={styles.branchName}>{branch.name}</div>
                    <div className={styles.branchMeta}>{branch.messages.length} messages</div>
                  </div>
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
                  <input
                    type="text"
                    placeholder="Branch name..."
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateBranch()}
                    autoFocus
                    className={styles.newBranchInput}
                  />
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
                      Create
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  className={styles.newBranchBtn}
                  onClick={() => setShowNewBranch(true)}
                >
                  <Plus size={16} />
                  New Branch
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};
