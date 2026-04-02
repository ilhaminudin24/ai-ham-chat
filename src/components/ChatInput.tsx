import React, { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, X, Square } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
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

interface ChatInputProps {
  onShowTemplates?: () => void;
  onShowToast?: (msg: string) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ onShowTemplates, onShowToast }) => {
  const [image, setImage] = useState<string | null>(null);
  
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

  // Use inputText from store as the text state
  const text = inputText;

  // Detect slash commands
  const isSlashActive = text.startsWith('/');
  const slashQuery = isSlashActive ? text.slice(1).split(' ')[0] : '';

  const handleInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  };

  useEffect(() => {
    handleInput();
  }, [text]);

  const handleTextChange = (newText: string) => {
    setInputText(newText);
  };

  // Execute slash command
  const executeSlashCommand = (commandName: string) => {
    const currentConv = conversations.find(c => c.id === currentConversationId);
    const fullText = text.trim();
    // Extract args after command
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
          // If no args, set input to "/model " so user can type model name
          setInputText('/model ');
          return; // Don't clear input
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
    // If command needs args, fill in the command
    if (commandName === '/model' || commandName === '/system') {
      setInputText(commandName + ' ');
      textareaRef.current?.focus();
    } else {
      setInputText(commandName);
      // Execute immediately for no-arg commands
      setTimeout(() => executeSlashCommand(commandName), 0);
    }
  };

  const handleSend = async () => {
    if ((!text.trim() && !image) || isStreaming) return;

    // Check if it's a slash command
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

    const userMessage = {
      role: 'user' as const,
      content: text.trim() || '[Image]',
      image: image || null
    };

    useChatStore.getState().addMessage(convId, userMessage);
    
    setInputText('');
    setImage(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const currentConv = useChatStore.getState().conversations.find(c => c.id === convId);
    if (currentConv) {
      await sendChatRequest(convId, currentConv.messages, selectedModel);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Don't handle Enter/arrows if slash palette is open (palette handles them)
    if (isSlashActive && !text.includes(' ')) {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Tab') return;
      if (e.key === 'Enter') return; // Let palette handle
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setImage(evt.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={styles.inputContainer}>
      <div className={styles.inputWrapper}>
        
        {/* Slash Command Palette */}
        <SlashCommandPalette
          isOpen={isSlashActive && !text.includes(' ')}
          query={slashQuery}
          onSelect={handleSlashSelect}
          onClose={() => setInputText('')}
        />

        {/* Image Preview Area */}
        {image && (
          <div className={styles.imagePreviewWrapper}>
            <div className={styles.imagePreview}>
              <img src={image} alt="Upload preview" />
              <button className={styles.removeImgBtn} onClick={() => setImage(null)}>
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        <div className={styles.inputBox}>
          <div className={styles.toolsWrapper}>
             <button 
               className={`${styles.toolBtn} ${image ? styles.active : ''}`}
               onClick={() => fileInputRef.current?.click()}
               title="Upload Image"
               disabled={isStreaming}
             >
               <ImageIcon size={20} />
             </button>
             <input 
               type="file" 
               ref={fileInputRef} 
               accept="image/*" 
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
              disabled={!text.trim() && !image}
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
