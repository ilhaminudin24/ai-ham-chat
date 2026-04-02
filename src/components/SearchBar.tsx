import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react';
import styles from './SearchBar.module.css';

interface SearchBarProps {
  isOpen: boolean;
  onClose: () => void;
  messages: { role: string; content: string }[];
  onHighlight: (matchIndices: { msgIndex: number; matches: number[] }[], currentMatch: number) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ isOpen, onClose, messages, onHighlight }) => {
  const [query, setQuery] = useState('');
  const [currentMatchIdx, setCurrentMatchIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Compute all matches
  const allMatches = useCallback(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const results: { msgIndex: number; charIndex: number }[] = [];
    messages.forEach((msg, msgIndex) => {
      const text = msg.content.toLowerCase();
      let idx = text.indexOf(q);
      while (idx !== -1) {
        results.push({ msgIndex, charIndex: idx });
        idx = text.indexOf(q, idx + 1);
      }
    });
    return results;
  }, [query, messages]);

  const matches = allMatches();
  const totalMatches = matches.length;

  // Notify parent about current highlights
  useEffect(() => {
    if (!query.trim()) {
      onHighlight([], -1);
      return;
    }
    // Group matches by msgIndex
    const grouped: Record<number, number[]> = {};
    matches.forEach(m => {
      if (!grouped[m.msgIndex]) grouped[m.msgIndex] = [];
      grouped[m.msgIndex].push(m.charIndex);
    });
    const matchIndices = Object.entries(grouped).map(([msgIndex, charIndices]) => ({
      msgIndex: Number(msgIndex),
      matches: charIndices
    }));
    onHighlight(matchIndices, currentMatchIdx);
  }, [query, currentMatchIdx, messages]);

  // Focus on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setCurrentMatchIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      onHighlight([], -1);
    }
  }, [isOpen]);

  const goToNext = () => {
    if (totalMatches > 0) setCurrentMatchIdx((currentMatchIdx + 1) % totalMatches);
  };

  const goToPrev = () => {
    if (totalMatches > 0) setCurrentMatchIdx((currentMatchIdx - 1 + totalMatches) % totalMatches);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) goToPrev();
      else goToNext();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.searchBar}>
      <Search size={16} className={styles.icon} />
      <input
        ref={inputRef}
        className={styles.input}
        placeholder="Search in conversation..."
        value={query}
        onChange={(e) => { setQuery(e.target.value); setCurrentMatchIdx(0); }}
        onKeyDown={handleKeyDown}
      />
      {query && (
        <span className={styles.matchCount}>
          {totalMatches > 0 ? `${currentMatchIdx + 1} of ${totalMatches}` : 'No matches'}
        </span>
      )}
      <div className={styles.navBtns}>
        <button onClick={goToPrev} disabled={totalMatches === 0} title="Previous (Shift+Enter)">
          <ChevronUp size={16} />
        </button>
        <button onClick={goToNext} disabled={totalMatches === 0} title="Next (Enter)">
          <ChevronDown size={16} />
        </button>
      </div>
      <button className={styles.closeBtn} onClick={onClose}>
        <X size={16} />
      </button>
    </div>
  );
};
