import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { User, Copy, Check, Bot } from 'lucide-react';
import type { Message } from '../store/chatStore';
import styles from './MessageBubble.module.css';

interface Props {
  message: Message;
}

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
  
  return (
    <div className={`${styles.messageContainer} ${isUser ? styles.user : styles.ai}`}>
      <div className={`${styles.avatar} ${isUser ? styles.user : ''}`}>
        {isUser ? <User size={18} color="white" /> : <Bot size={20} />}
      </div>
      
      <div className={styles.contentWrapper}>
        <div className={styles.senderName}>{isUser ? 'You' : 'AI-HAM'}</div>
        
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
