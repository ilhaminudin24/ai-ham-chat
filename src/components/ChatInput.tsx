import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, X, Square, FileText, Paperclip } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import type { FileAttachment } from '../store/chatStore';
import { sendChatRequest } from '../utils/api';
import { SlashCommandPalette } from './SlashCommandPalette';
import { formatConversationAsMarkdown, copyToClipboard } from '../utils/clipboard';
import styles from './ChatInput.module.css';

const MODELS = [
  { id: 'minimax/MiniMax-M2.7', display: 'MiniMax M2.7' },
  { id: 'minimax/MiniMax-M2.5', display: 'MiniMax M2.5' },
  { id: 'google-gemini-cli/gemini-3-flash-preview', display: 'Gemini 3 Flash' },
  { id: 'google-gemini-cli/gemini-2.5-flash', display: 'Gemini 2.5 Flash' },
  { id: 'google-gemini-cli/gemini-3.1-pro-preview', display: 'Gemini 3.1 Pro' },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;
const ACCEPTED_TYPES = 'image/*,.pdf,.txt,.md,.json,.csv,.js,.ts,.py,.html,.css';

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface ChatInputProps {
  onShowTemplates?: () => void;
  onShowToast?: (msg: string) => void;
  isDragOver?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onShowTemplates, onShowToast }) => {
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { 
    currentConversationId, 
    isStreaming,
    selectedModel,
    inputText,
    setInputText,
    stopStreaming,
    conversations,
    createNewConversation,
    setSelectedModel,
    clearConversationMessages,
    setConversationSystemPrompt
  } = useChatStore();

  const text = inputText;
  const isSlashActive = text.startsWith('/');
  const slashQuery = isSlashActive ? text.slice(1).split(' ')[0] : '';

  const handleInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  };

  useEffect(() => { handleInput(); }, [text]);

  const handleTextChange = (newText: string) => setInputText(newText);

  // ---- File Processing ----
  const processFile = useCallback((file: File): Promise<FileAttachment | null> => {
    return new Promise((resolve) => {
      if (file.size > MAX_FILE_SIZE) {
        onShowToast?.(`File "${file.name}" exceeds ${formatFileSize(MAX_FILE_SIZE)} limit`);
        resolve(null);
        return;
      }

      const isImage = file.type.startsWith('image/');
      const reader = new FileReader();
      reader.onload = (evt) => {
        resolve({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          type: file.type,
          size: file.size,
          dataUrl: evt.target?.result as string,
          isImage,
        });
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }, [onShowToast]);

  const addFiles = useCallback(async (fileList: FileList | File[]) => {
    const fileArray = Array.from(fileList);
    const remaining = MAX_FILES - files.length;
    if (remaining <= 0) {
      onShowToast?.(`Maximum ${MAX_FILES} files allowed`);
      return;
    }
    const toProcess = fileArray.slice(0, remaining);
    if (fileArray.length > remaining) {
      onShowToast?.(`Only ${remaining} more file(s) can be added (max ${MAX_FILES})`);
    }

    const processed = await Promise.all(toProcess.map(processFile));
    const valid = processed.filter(Boolean) as FileAttachment[];
    if (valid.length > 0) {
      setFiles(prev => [...prev, ...valid]);
    }
  }, [files.length, processFile, onShowToast]);

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  // ---- File Upload Handler ----
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ---- Drag & Drop ----
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  // ---- Clipboard Paste (Ctrl+V) ----
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    
    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    
    if (imageFiles.length > 0) {
      e.preventDefault(); // prevent pasting image as text
      addFiles(imageFiles);
    }
  }, [addFiles]);

  // ---- Slash Commands ----
  const executeSlashCommand = (commandName: string) => {
    const currentConv = conversations.find(c => c.id === currentConversationId);
    const fullText = text.trim();
    const argStart = fullText.indexOf(' ');
    const args = argStart > 0 ? fullText.slice(argStart + 1).trim() : '';

    switch (commandName) {
      case '/clear':
        if (currentConversationId) {
          clearConversationMessages(currentConversationId);
          onShowToast?.('Conversation cleared!');
        }
        break;
      case '/new':
        createNewConversation();
        break;
      case '/model': {
        if (args) {
          const matchedModel = MODELS.find(m => 
            m.display.toLowerCase().includes(args.toLowerCase()) ||
            m.id.toLowerCase().includes(args.toLowerCase())
          );
          if (matchedModel) {
            setSelectedModel(matchedModel.id);
            onShowToast?.(`Switched to ${matchedModel.display}`);
          } else {
            onShowToast?.('Model not found. Try: ' + MODELS.map(m => m.display).join(', '));
          }
        } else {
          setInputText('/model ');
          return;
        }
        break;
      }
      case '/template':
        onShowTemplates?.();
        break;
      case '/export':
        if (currentConv) {
          const md = formatConversationAsMarkdown(currentConv.title, currentConv.messages);
          copyToClipboard(md);
          onShowToast?.('Conversation exported to clipboard!');
        }
        break;
      case '/system': {
        if (args && currentConversationId) {
          setConversationSystemPrompt(currentConversationId, args);
          onShowToast?.('System prompt set!');
        } else {
          setInputText('/system ');
          return;
        }
        break;
      }
      case '/help':
        onShowToast?.('Commands: /clear /new /model /template /export /system /help');
        break;
    }
    setInputText('');
  };

  const handleSlashSelect = (commandName: string) => {
    if (commandName === '/model' || commandName === '/system') {
      setInputText(commandName + ' ');
      textareaRef.current?.focus();
    } else {
      setInputText(commandName);
      setTimeout(() => executeSlashCommand(commandName), 0);
    }
  };

  // ---- Send ----
  const handleSend = async () => {
    if ((!text.trim() && files.length === 0) || isStreaming) return;

    if (text.startsWith('/')) {
      const commandName = '/' + text.trim().split(' ')[0].slice(1);
      executeSlashCommand(commandName);
      return;
    }

    let convId = currentConversationId;
    if (!convId) {
      useChatStore.getState().createNewConversation();
      convId = useChatStore.getState().currentConversationId;
    }
    if (!convId) return;

    const hasFiles = files.length > 0;
    const contentLabel = text.trim() || (hasFiles ? `[${files.length} file(s)]` : '[Image]');

    const userMessage = {
      role: 'user' as const,
      content: contentLabel,
      files: hasFiles ? files : undefined,
    };

    useChatStore.getState().addMessage(convId, userMessage);
    
    setInputText('');
    setFiles([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const currentConv = useChatStore.getState().conversations.find(c => c.id === convId);
    if (currentConv) {
      await sendChatRequest(convId, currentConv.messages, selectedModel);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isSlashActive && !text.includes(' ')) {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Tab') return;
      if (e.key === 'Enter') return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasContent = text.trim() || files.length > 0;

  return (
    <div 
      className={`${styles.inputContainer} ${isDragActive ? styles.dragActive : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragActive && (
        <div className={styles.dragOverlay}>
          <Paperclip size={32} />
          <span>Drop files here</span>
        </div>
      )}

      <div className={styles.inputWrapper}>
        
        {/* Slash Command Palette */}
        <SlashCommandPalette
          isOpen={isSlashActive && !text.includes(' ')}
          query={slashQuery}
          onSelect={handleSlashSelect}
          onClose={() => setInputText('')}
        />

        {/* Multi-File Preview Gallery */}
        {files.length > 0 && (
          <div className={styles.filePreviewGallery}>
            {files.map(file => (
              <div key={file.id} className={styles.filePreviewItem}>
                {file.isImage ? (
                  <img src={file.dataUrl} alt={file.name} className={styles.filePreviewImg} />
                ) : (
                  <div className={styles.filePreviewDoc}>
                    <FileText size={20} />
                    <span className={styles.filePreviewExt}>
                      {file.name.split('.').pop()?.toUpperCase() || 'FILE'}
                    </span>
                  </div>
                )}
                <div className={styles.filePreviewMeta}>
                  <span className={styles.filePreviewName} title={file.name}>
                    {file.name.length > 12 ? file.name.slice(0, 10) + '…' : file.name}
                  </span>
                  <span className={styles.filePreviewSize}>{formatFileSize(file.size)}</span>
                </div>
                <button className={styles.fileRemoveBtn} onClick={() => removeFile(file.id)}>
                  <X size={12} />
                </button>
              </div>
            ))}
            {files.length < MAX_FILES && (
              <button 
                className={styles.addMoreBtn} 
                onClick={() => fileInputRef.current?.click()}
                title="Add more files"
              >
                +
              </button>
            )}
          </div>
        )}

        <div className={styles.inputBox}>
          <div className={styles.toolsWrapper}>
             <button 
               className={`${styles.toolBtn} ${files.length > 0 ? styles.active : ''}`}
               onClick={() => fileInputRef.current?.click()}
               title="Attach files (images, documents)"
               disabled={isStreaming}
             >
               <Paperclip size={20} />
             </button>
             <input 
               type="file" 
               ref={fileInputRef} 
               accept={ACCEPTED_TYPES}
               multiple
               style={{ display: 'none' }} 
               onChange={handleFileUpload}
             />
          </div>
          
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            placeholder={isStreaming ? "AI-HAM is responding..." : "Message AI-HAM... (type / for commands)"}
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            disabled={isStreaming}
            rows={1}
          />
          
          {isStreaming ? (
            <button 
              className={`${styles.sendBtn} ${styles.stopBtn}`}
              onClick={stopStreaming}
              title="Stop generating (Esc)"
            >
              <Square size={16} />
            </button>
          ) : (
            <button 
              className={styles.sendBtn} 
              disabled={!hasContent}
              onClick={handleSend}
            >
              <Send size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
