import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Trash2, MessageSquarePlus, Bot, FileText, Download, Terminal, HelpCircle } from 'lucide-react';
import styles from './SlashCommandPalette.module.css';

export interface SlashCommand {
  name: string;
  description: string;
  icon: React.ReactNode;
  argHint?: string;
}

const COMMANDS: SlashCommand[] = [
  { name: '/clear', description: 'Clear current conversation messages', icon: <Trash2 size={16} /> },
  { name: '/new', description: 'Start a new conversation', icon: <MessageSquarePlus size={16} /> },
  { name: '/model', description: 'Switch model', icon: <Bot size={16} />, argHint: '<model name>' },
  { name: '/template', description: 'Open template browser', icon: <FileText size={16} /> },
  { name: '/export', description: 'Export current chat as markdown', icon: <Download size={16} /> },
  { name: '/system', description: 'Set custom system prompt', icon: <Terminal size={16} />, argHint: '<prompt>' },
  { name: '/help', description: 'Show all available commands', icon: <HelpCircle size={16} /> },
];

interface SlashCommandPaletteProps {
  isOpen: boolean;
  query: string; // Current text after "/"
  onSelect: (command: string, args?: string) => void;
  onClose: () => void;
}

export const SlashCommandPalette: React.FC<SlashCommandPaletteProps> = ({ isOpen, query, onSelect, onClose }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Fuzzy filter
  const filtered = useMemo(() => {
    if (!query) return COMMANDS;
    const q = query.toLowerCase();
    return COMMANDS.filter(cmd => 
      cmd.name.toLowerCase().includes(q) || 
      cmd.description.toLowerCase().includes(q)
    );
  }, [query]);

  // Reset selection on query change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation (handled by parent ChatInput forwarding keys)
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && filtered.length > 0) {
        e.preventDefault();
        onSelect(filtered[selectedIndex].name);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Tab' && filtered.length > 0) {
        e.preventDefault();
        onSelect(filtered[selectedIndex].name);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex, onSelect, onClose]);

  // Auto-scroll to selected item
  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.children[selectedIndex] as HTMLElement;
      if (selected) selected.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen || filtered.length === 0) return null;

  return (
    <div className={styles.palette}>
      <div className={styles.list} ref={listRef}>
        {filtered.map((cmd, idx) => (
          <button
            key={cmd.name}
            className={`${styles.item} ${idx === selectedIndex ? styles.selected : ''}`}
            onClick={() => onSelect(cmd.name)}
            onMouseEnter={() => setSelectedIndex(idx)}
          >
            <div className={styles.itemIcon}>{cmd.icon}</div>
            <div className={styles.itemContent}>
              <div className={styles.itemName}>
                {cmd.name}
                {cmd.argHint && <span className={styles.argHint}>{cmd.argHint}</span>}
              </div>
              <div className={styles.itemDesc}>{cmd.description}</div>
            </div>
          </button>
        ))}
      </div>
      <div className={styles.footer}>
        <span><kbd>↑↓</kbd> Navigate</span>
        <span><kbd>↵</kbd> Select</span>
        <span><kbd>Esc</kbd> Close</span>
      </div>
    </div>
  );
};

export { COMMANDS };
