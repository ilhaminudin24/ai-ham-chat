import React from 'react';
import { X, Keyboard } from 'lucide-react';
import styles from './ShortcutsHelp.module.css';

interface ShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

const shortcuts = [
  { keys: ['⌘', 'K'], description: 'Quick switcher - search conversations' },
  { keys: ['⌘', 'N'], description: 'New conversation' },
  { keys: ['⌘', 'Shift', 'C'], description: 'Copy last AI response' },
  { keys: ['⌘', '/'], description: 'Show keyboard shortcuts' },
  { keys: ['Esc'], description: 'Close modal / Cancel' },
  { keys: ['Enter'], description: 'Send message' },
  { keys: ['Shift', 'Enter'], description: 'New line in message' },
];

export const ShortcutsHelp: React.FC<ShortcutsHelpProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <Keyboard size={20} className={styles.headerIcon} />
            <h3>Keyboard Shortcuts</h3>
          </div>
          <button onClick={onClose} className={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>
        <div className={styles.body}>
          {shortcuts.map((shortcut, index) => (
            <div key={index} className={styles.shortcutRow}>
              <span className={styles.description}>{shortcut.description}</span>
              <div className={styles.keys}>
                {shortcut.keys.map((key, i) => (
                  <React.Fragment key={i}>
                    <kbd className={styles.key}>{key}</kbd>
                    {i < shortcut.keys.length - 1 && <span className={styles.plus}>+</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
