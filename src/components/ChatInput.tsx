import React, { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, X } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import { sendChatRequest } from '../utils/api';
import styles from './ChatInput.module.css';

const ChatInput: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { 
    currentConversationId, 
    isStreaming,
    selectedModel,
    inputText,
    setInputText
  } = useChatStore();

  // Use inputText from store as the text state
  const text = inputText;

  const handleInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  };

  useEffect(() => {
    handleInput(); // Re-calculate height on text change
  }, [text]);

  // Sync text changes to store
  const handleTextChange = (newText: string) => {
    setInputText(newText);
  };

  const handleSend = async () => {
    if ((!text.trim() && !image) || isStreaming) return;

    let convId = currentConversationId;
    
    // Create new conversation on the fly if none selected
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
    
    // Clear input
    setInputText('');
    setImage(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    // Fetch conversation after adding user message to send full context API
    const currentConv = useChatStore.getState().conversations.find(c => c.id === convId);
    if (currentConv) {
      await sendChatRequest(convId, currentConv.messages, selectedModel);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
            placeholder={isStreaming ? "AI-HAM is typing..." : "Message AI-HAM..."}
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            rows={1}
          />
          
          <button 
            className={styles.sendBtn} 
            disabled={(!text.trim() && !image) || isStreaming}
            onClick={handleSend}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
