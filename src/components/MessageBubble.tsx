import React, { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { User, Copy, Check, Bot, Table, RefreshCw, ChevronDown } from 'lucide-react';
import type { Message } from '../store/chatStore';
import { formatRelativeTime, formatFullDateTime } from '../utils/time';
import styles from './MessageBubble.module.css';

const MODELS = [
  { id: 'minimax/MiniMax-M2.7', display: 'MiniMax M2.7' },
  { id: 'minimax/MiniMax-M2.5', display: 'MiniMax M2.5' },
  { id: 'google-gemini-cli/gemini-3-flash-preview', display: 'Gemini 3 Flash' },
  { id: 'google-gemini-cli/gemini-2.5-flash', display: 'Gemini 2.5 Flash' },
  { id: 'google-gemini-cli/gemini-3.1-pro-preview', display: 'Gemini 3.1 Pro' },
];

interface Props {
  message: Message;
  messageIndex?: number;
  onEdit?: () => void;
  onBranch?: (messageIndex: number) => void;
  isLastAI?: boolean;
  onRegenerate?: (modelId?: string) => void;
  regenerationCount?: number;
  searchQuery?: string;
  highlightRanges?: number[];
}

// Parse markdown table to TSV format for Outlook
const parseTableToTSV = (content: string): string | null => {
  const tableRegex = /\|(.+)\|\n\|[-:\s|]+\|\n((?:\|.+\|\n?)+)/g;
  const match = tableRegex.exec(content);
  
  if (!match) return null;
  
  const headerRow = match[1];
  const dataRows = match[2].trim().split('\n');
  
  const headers = headerRow.split('|').map(h => h.trim()).filter(h => h);
  const rows = dataRows.map(row => 
    row.split('|').map(cell => cell.trim()).filter(cell => cell)
  );
  
  const tsvParts: string[] = [];
  tsvParts.push(headers.join('\t'));
  rows.forEach(row => {
    tsvParts.push(row.join('\t'));
  });
  
  return tsvParts.join('\n');
};

const hasTable = (content: string): boolean => {
  return /\|(.+)\|\n\|[-:\s|]+\|\n((?:\|.+\|\n?)+)/.test(content);
};

const CodeBlock = ({ node, inline, className, children, ...props }: any) => {
  const match = /language-(\w+)/.exec(className || '');
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!inline && match) {
    return (
      <div style={{ margin: '16px 0', borderRadius: '12px', overflow: 'hidden' }}>
        <div className={styles.codeHeader}>
          <span>{match[1]}</span>
          <button onClick={handleCopy} className={styles.copyBtn}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <SyntaxHighlighter
          {...props}
          style={vscDarkPlus as any}
          language={match[1]}
          PreTag="div"
          customStyle={{ margin: 0, borderRadius: '0 0 12px 12px' }}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      </div>
    );
  }

  return (
    <code {...props} className={className} style={{
      backgroundColor: 'var(--bg-input-hover)',
      padding: '2px 6px',
      borderRadius: '4px',
      color: 'var(--accent-hover)'
    }}>
      {children}
    </code>
  );
};

export const MessageBubble: React.FC<Props> = ({ message, messageIndex = 0, onEdit, onBranch, isLastAI, onRegenerate, regenerationCount }) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [tableCopied, setTableCopied] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  
  const containsTable = useMemo(() => hasTable(message.content), [message.content]);
  const tableTSV = useMemo(() => containsTable ? parseTableToTSV(message.content) : null, [message.content, containsTable]);
  
  const handleCopyText = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleCopyTable = () => {
    if (tableTSV) {
      navigator.clipboard.writeText(tableTSV);
      setTableCopied(true);
      setTimeout(() => setTableCopied(false), 2000);
    }
  };

  const handleRegenerateWithModel = (modelId: string) => {
    setShowModelMenu(false);
    if (onRegenerate) onRegenerate(modelId);
  };
  
  return (
    <div className={`${styles.messageContainer} ${isUser ? styles.user : styles.ai}`}>
      <div className={`${styles.avatar} ${isUser ? styles.user : ''}`}>
        {isUser ? <User size={18} color="white" /> : <Bot size={20} />}
      </div>
      
      <div className={styles.contentWrapper}>
        <div className={styles.headerRow}>
          <div className={styles.senderName}>
            {isUser ? 'You' : 'AI-HAM'}
            {message.timestamp && (
              <span 
                className={styles.timestamp}
                title={formatFullDateTime(message.timestamp)}
              >
                {formatRelativeTime(message.timestamp)}
              </span>
            )}
          </div>
          <div className={styles.actions}>
            {!isUser && (
              <>
                {containsTable && (
                  <button onClick={handleCopyTable} className={styles.copyTableBtn} title="Copy table for Excel/Outlook">
                    {tableCopied ? <Check size={14} /> : <Table size={14} />}
                    {tableCopied ? 'Table Copied!' : 'Copy Table'}
                  </button>
                )}
                <button onClick={handleCopyText} className={styles.copyTextBtn} title="Copy for email">
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </>
            )}
            {isUser && onEdit && (
              <button onClick={onEdit} className={styles.editBtn} title="Edit message">
                ✏️
              </button>
            )}
            {isUser && onBranch && (
              <button onClick={() => onBranch(messageIndex)} className={styles.branchBtn} title="Branch from this message">
                🌿
              </button>
            )}
          </div>
        </div>
        
        <div className={styles.textContent}>
          {!isUser ? (
             <ReactMarkdown 
               remarkPlugins={[remarkGfm]}
               components={{ code: CodeBlock }}
             >
               {message.content}
             </ReactMarkdown>
          ) : (
            <>
              {message.content !== '[Image]' && !message.content.match(/^\[\d+ file\(s\)\]$/) && (
                <div style={{ whiteSpace: 'pre-wrap' }}>
                  {message.content.replace(/^\[\d+ file\(s\)\]\s*/, '')}
                </div>
              )}
            </>
          )}
          
          {/* Legacy single image */}
          {message.image && !message.files && (
             <img src={message.image} alt="Uploaded attachment" className={styles.userImage} />
          )}
          
          {/* Multi-file gallery */}
          {message.files && message.files.length > 0 && (
            <div className={styles.fileGallery}>
              {message.files.map(file => (
                <div key={file.id} className={file.isImage ? styles.galleryImageWrap : styles.galleryFileWrap}>
                  {file.isImage ? (
                    <img src={file.dataUrl} alt={file.name} className={styles.galleryImage} />
                  ) : (
                    <div className={styles.galleryFile}>
                      <span className={styles.galleryFileIcon}>📄</span>
                      <span className={styles.galleryFileName}>{file.name}</span>
                      <span className={styles.galleryFileSize}>
                        {file.size < 1024 ? `${file.size} B` : file.size < 1024*1024 ? `${(file.size/1024).toFixed(1)} KB` : `${(file.size/(1024*1024)).toFixed(1)} MB`}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Regenerate area — only on last AI message */}
        {isLastAI && onRegenerate && (
          <div className={styles.regenerateArea}>
            {regenerationCount && regenerationCount > 1 && (
              <span className={styles.regenCount}>
                Response {regenerationCount}
              </span>
            )}
            <div className={styles.regenerateGroup}>
              <button 
                onClick={() => onRegenerate()} 
                className={styles.regenerateBtn}
                title="Regenerate with current model"
              >
                <RefreshCw size={14} />
                Regenerate
              </button>
              <button 
                className={styles.regenerateModelBtn}
                onClick={() => setShowModelMenu(!showModelMenu)}
                title="Regenerate with different model"
              >
                <ChevronDown size={14} />
              </button>
              {showModelMenu && (
                <div className={styles.modelDropdown}>
                  <div className={styles.modelDropdownTitle}>Regenerate with:</div>
                  {MODELS.map(m => (
                    <button
                      key={m.id}
                      className={styles.modelDropdownItem}
                      onClick={() => handleRegenerateWithModel(m.id)}
                    >
                      {m.display}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
