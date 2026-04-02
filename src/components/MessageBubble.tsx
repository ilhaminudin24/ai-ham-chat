import React, { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { User, Copy, Check, Bot, Table } from 'lucide-react';
import type { Message } from '../store/chatStore';
import styles from './MessageBubble.module.css';

interface Props {
  message: Message;
}

// Parse markdown table to TSV format for Outlook
const parseTableToTSV = (content: string): string | null => {
  const tableRegex = /\|(.+)\|\n\|[-:\s|]+\|\n((?:\|.+\|\n?)+)/g;
  const match = tableRegex.exec(content);
  
  if (!match) return null;
  
  const headerRow = match[1];
  const dataRows = match[2].trim().split('\n');
  
  // Extract headers
  const headers = headerRow.split('|').map(h => h.trim()).filter(h => h);
  
  // Extract all row data
  const rows = dataRows.map(row => 
    row.split('|').map(cell => cell.trim()).filter(cell => cell)
  );
  
  // Build TSV string (tab-separated)
  const tsvParts: string[] = [];
  tsvParts.push(headers.join('\t'));
  rows.forEach(row => {
    tsvParts.push(row.join('\t'));
  });
  
  return tsvParts.join('\n');
};

// Check if message contains a table
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

export const MessageBubble: React.FC<Props> = ({ message }) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [tableCopied, setTableCopied] = useState(false);
  
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
  
  return (
    <div className={`${styles.messageContainer} ${isUser ? styles.user : styles.ai}`}>
      <div className={`${styles.avatar} ${isUser ? styles.user : ''}`}>
        {isUser ? <User size={18} color="white" /> : <Bot size={20} />}
      </div>
      
      <div className={styles.contentWrapper}>
        <div className={styles.headerRow}>
          <div className={styles.senderName}>{isUser ? 'You' : 'AI-HAM'}</div>
          {!isUser && (
            <div className={styles.copyActions}>
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
            </div>
          )}
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
             <div style={{ whiteSpace: 'pre-wrap' }}>{message.content === '[Image]' ? '' : message.content}</div>
          )}
          
          {message.image && (
             <img src={message.image} alt="Uploaded attachment" className={styles.userImage} />
          )}
        </div>
      </div>
    </div>
  );
};
