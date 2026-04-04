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
// MiniMax
  { id: 'minimax/MiniMax-M2.7', display: 'MiniMax M2.7' },
  { id: 'minimax/MiniMax-M2.5', display: 'MiniMax M2.5' },
  // Google Gemini
  { id: 'google-gemini-cli/gemini-3-flash-preview', display: 'Gemini 3 Flash' },
  { id: 'google-gemini-cli/gemini-2.5-flash', display: 'Gemini 2.5 Flash' },
  { id: 'google-gemini-cli/gemini-3.1-pro-preview', display: 'Gemini 3.1 Pro' },
  // GitHub Copilot
  { id: 'github-copilot/gpt-5-mini', display: 'GPT-5 Mini' },
  { id: 'github-copilot/gpt-4.1', display: 'GPT-4.1' },
  { id: 'github-copilot/claude-haiku-4.5', display: 'Claude Haiku 4.5' },
  { id: 'github-copilot/claude-opus-4.6', display: 'Claude Opus 4.6' },
  { id: 'github-copilot/claude-sonnet-4.6', display: 'Claude Sonnet 4.6' },
  { id: 'github-copilot/gpt-5.4', display: 'GPT-5.4' },
  { id: 'github-copilot/gpt-5.3-codex', display: 'GPT-5.3 Codex' },
  { id: 'github-copilot/grok-code-fast-1', display: 'Grok Code Fast' },
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const vscDarkPlusStyle = vscDarkPlus as any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CodeBlock = ({ inline, className, children, ...props }: any) => {
  const match = /language-(\w+)/.exec(className || '');
  const [copied, setCopied] = useState(false);
  const codeString = String(children).replace(/\n$/, '');
  
  let isValidJson: boolean | null = null;
  if (match && match[1] === 'json') {
    try {
      JSON.parse(codeString);
      isValidJson = true;
    } catch {
      isValidJson = false;
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!inline && match) {
    return (
      <div style={{ margin: '16px 0', borderRadius: '12px', overflow: 'hidden' }}>
        <div className={styles.codeHeader}>
          <div className={styles.codeLangGroup}>
            <span>{match[1]}</span>
            {isValidJson === true && <span className={styles.jsonValidBadge}>✅ Valid JSON</span>}
            {isValidJson === false && <span className={styles.jsonInvalidBadge} title="Syntax error: invalid JSON format">❌ Invalid JSON</span>}
          </div>
          <button onClick={handleCopy} className={styles.copyBtn} aria-label={`Copy ${match[1]} code block`}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : (match[1] === 'json' ? 'Copy as JSON' : 'Copy')}
          </button>
        </div>
        <SyntaxHighlighter
          {...props}
          style={vscDarkPlusStyle}
          language={match[1]}
          PreTag="div"
          customStyle={{ margin: 0, borderRadius: '0 0 12px 12px' }}
        >
          {codeString}
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
                  <button onClick={handleCopyTable} className={styles.copyTableBtn} title="Copy table for Excel/Outlook" aria-label="Copy table as tabular data">
                    {tableCopied ? <Check size={14} /> : <Table size={14} />}
                    {tableCopied ? 'Table Copied!' : 'Copy as Table'}
                  </button>
                )}
                 <button onClick={handleCopyText} className={styles.copyTextBtn} title="Copy for email" aria-label="Copy message text">
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </>
            )}
            {isUser && onEdit && (
               <button onClick={onEdit} className={styles.editBtn} title="Edit message" aria-label="Edit message">
                ✏️
              </button>
            )}
            {isUser && onBranch && (
               <button onClick={() => onBranch(messageIndex)} className={styles.branchBtn} title="Branch from this message" aria-label="Create branch from this message">
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
                  aria-label="Regenerate with current model"
                >
                <RefreshCw size={14} />
                Regenerate
              </button>
                <button 
                  className={styles.regenerateModelBtn}
                  onClick={() => setShowModelMenu(!showModelMenu)}
                  title="Regenerate with different model"
                  aria-label="Choose model for regeneration"
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
