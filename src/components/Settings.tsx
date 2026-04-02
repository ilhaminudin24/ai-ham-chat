import React, { useState } from 'react';
import { X, Volume2, VolumeX, Bot, Trash2, Check, Sun, Moon, Monitor } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import styles from './Settings.module.css';

interface SettingsProps {
  onClose: () => void;
}

const MODELS = [
  { id: 'minimax/MiniMax-M2.7', name: 'MiniMax M2.7' },
  { id: 'minimax/MiniMax-M2.5', name: 'MiniMax M2.5' },
  { id: 'google-gemini-cli/gemini-3-flash-preview', name: 'Gemini 3 Flash' },
  { id: 'google-gemini-cli/gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'google-gemini-cli/gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro' },
];

const THEME_OPTIONS: { value: 'dark' | 'light' | 'system'; label: string; icon: React.ReactNode }[] = [
  { value: 'dark', label: 'Dark', icon: <Moon size={18} /> },
  { value: 'light', label: 'Light', icon: <Sun size={18} /> },
  { value: 'system', label: 'System', icon: <Monitor size={18} /> },
];

const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  const { settings, setSoundEnabled, setDefaultModel, clearAllConversations, setTheme } = useChatStore();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClearHistory = () => {
    clearAllConversations();
    setShowClearConfirm(false);
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Settings</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.content}>
          {/* Theme Setting */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Appearance</div>
            <div className={styles.themeSelector}>
              {THEME_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  className={`${styles.themeBtn} ${settings.theme === opt.value ? styles.active : ''}`}
                  onClick={() => setTheme(opt.value)}
                >
                  {opt.icon}
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sound Setting */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Sound</div>
            <div className={styles.settingItem}>
              <div className={styles.settingInfo}>
                <div className={styles.settingIcon}>
                  {settings.soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                </div>
                <div>
                  <div className={styles.settingLabel}>Notification Sound</div>
                  <div className={styles.settingDesc}>Play sound when AI responds</div>
                </div>
              </div>
              <button 
                className={`${styles.toggle} ${settings.soundEnabled ? styles.on : ''}`}
                onClick={() => setSoundEnabled(!settings.soundEnabled)}
              >
                <div className={styles.toggleKnob} />
              </button>
            </div>
          </div>

          {/* Default Model */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Model</div>
            <div className={styles.modelList}>
              {MODELS.map((model) => (
                <button
                  key={model.id}
                  className={`${styles.modelItem} ${settings.defaultModel === model.id ? styles.active : ''}`}
                  onClick={() => setDefaultModel(model.id)}
                >
                  <div className={styles.modelInfo}>
                    <Bot size={18} />
                    <span>{model.name}</span>
                  </div>
                  {settings.defaultModel === model.id && (
                    <Check size={18} className={styles.checkIcon} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Clear History */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Data</div>
            {showClearConfirm ? (
              <div className={styles.confirmBox}>
                <p>Delete all conversations? This cannot be undone.</p>
                <div className={styles.confirmActions}>
                  <button 
                    className={styles.cancelBtn}
                    onClick={() => setShowClearConfirm(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    className={styles.deleteBtn}
                    onClick={handleClearHistory}
                  >
                    <Trash2 size={16} /> Delete All
                  </button>
                </div>
              </div>
            ) : (
              <button 
                className={styles.dangerBtn}
                onClick={() => setShowClearConfirm(true)}
              >
                <Trash2 size={18} />
                <span>Clear All Conversations</span>
              </button>
            )}
          </div>

          {/* About */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>About</div>
            <div className={styles.aboutBox}>
              <div className={styles.aboutIcon}>👾</div>
              <div>
                <div className={styles.aboutName}>AI-HAM Chat</div>
                <div className={styles.aboutVersion}>Version 2.0.0</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
