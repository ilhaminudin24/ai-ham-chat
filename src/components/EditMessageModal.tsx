import React, { useState, useEffect } from 'react';
import { X, RefreshCw } from 'lucide-react';
import styles from './EditMessageModal.module.css';

interface EditMessageModalProps {
  isOpen: boolean;
  originalContent: string;
  onClose: () => void;
  onSave: (newContent: string) => void;
}

export const EditMessageModal: React.FC<EditMessageModalProps> = ({ isOpen, originalContent, onClose, onSave }) => {
  const [content, setContent] = useState('');

  useEffect(() => {
    if (isOpen) {
      setContent(originalContent);
    }
  }, [isOpen, originalContent]);

  const handleSave = () => {
    if (content.trim()) {
      onSave(content.trim());
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) {
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <RefreshCw size={18} className={styles.headerIcon} />
            <h3>Edit & Resend</h3>
          </div>
          <button onClick={onClose} className={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>
        <div className={styles.body}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Edit your message..."
            className={styles.textarea}
            autoFocus
            rows={5}
          />
          <div className={styles.hint}>
            Press <kbd>⌘</kbd> + <kbd>Enter</kbd> to save and resend
          </div>
        </div>
        <div className={styles.footer}>
          <button onClick={onClose} className={styles.cancelBtn}>Cancel</button>
          <button onClick={handleSave} disabled={!content.trim()} className={styles.saveBtn}>
            Save & Resend
          </button>
        </div>
      </div>
    </>
  );
};
