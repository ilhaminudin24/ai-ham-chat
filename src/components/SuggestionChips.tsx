import React, { useRef } from 'react';
import { ChevronRight, Sparkles, FileText, Languages, X } from 'lucide-react';
import styles from './SuggestionChips.module.css';

export interface Suggestion {
  id: string;
  text: string;
  type: 'ai-generated' | 'expand' | 'simplify' | 'translate';
}

interface SuggestionChipsProps {
  suggestions: Suggestion[];
  isOpen: boolean;
  onSuggestionClick: (text: string, type: string) => void;
  onClose?: () => void;
  translateMode?: 'to-en' | 'to-id';
  onTranslateToggle?: () => void;
}

export const SuggestionChips: React.FC<SuggestionChipsProps> = ({
  suggestions,
  isOpen,
  onSuggestionClick,
  onClose,
  translateMode = 'to-en',
  onTranslateToggle
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  if (!isOpen || suggestions.length === 0) return null;

  const aiSuggestions = suggestions.filter(s => s.type === 'ai-generated');
  const fixedChips: Suggestion[] = [
    { id: 'expand', text: '✨ Jelaskan Lebih', type: 'expand' },
    { id: 'simplify', text: '📝 Buat Lebih Simple', type: 'simplify' },
    { id: 'translate', text: translateMode === 'to-en' ? '🇺🇸 Translate EN' : '🇮🇩 Translate ID', type: 'translate' }
  ];

  const handleClick = (suggestion: Suggestion) => {
    if (suggestion.type === 'expand') {
      onSuggestionClick('Jelaskan lebih detail tentang poin-poin penting di atas', 'expand');
    } else if (suggestion.type === 'simplify') {
      onSuggestionClick('Jawab lebih sederhana dan mudah dipahami', 'simplify');
    } else if (suggestion.type === 'translate') {
      const text = translateMode === 'to-en' 
        ? 'Terjemahkan jawaban ini ke Bahasa Inggris' 
        : 'Terjemahkan jawaban ini ke Bahasa Indonesia';
      onSuggestionClick(text, 'translate');
    } else {
      onSuggestionClick(suggestion.text, suggestion.type);
    }
  };

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.header}>
        <span className={styles.label}>💡 Saran Lanjutan</span>
        {onClose && (
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={14} />
          </button>
        )}
      </div>
      
      <div className={styles.chipsContainer}>
        {/* AI-generated suggestions */}
        {aiSuggestions.map((suggestion, index) => (
          <button
            key={suggestion.id}
            className={`${styles.chip} ${styles.aiChip}`}
            onClick={() => handleClick(suggestion)}
            style={{ animationDelay: `${index * 0.08}s` }}
          >
            <Sparkles size={12} className={styles.chipIcon} />
            <span>{suggestion.text}</span>
            <ChevronRight size={12} className={styles.chevron} />
          </button>
        ))}
        
        {/* Fixed chips */}
        {fixedChips.map((chip, index) => (
          <button
            key={chip.id}
            className={`${styles.chip} ${styles.fixedChip}`}
            onClick={() => {
              handleClick(chip);
              if (chip.type === 'translate' && onTranslateToggle) {
                onTranslateToggle();
              }
            }}
            style={{ animationDelay: `${(aiSuggestions.length + index) * 0.08}s` }}
          >
            {chip.type === 'expand' && <FileText size={12} className={styles.chipIcon} />}
            {chip.type === 'simplify' && <FileText size={12} className={styles.chipIcon} />}
            {chip.type === 'translate' && <Languages size={12} className={styles.chipIcon} />}
            <span>{chip.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
