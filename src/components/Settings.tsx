import React, { useState } from 'react';
import { X, Volume2, VolumeX, Bot, Trash2, Check, Sun, Moon, Monitor, Brain } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import { MemoryManager } from './MemoryManager';
import styles from './Settings.module.css';

interface SettingsProps {
  onClose: () => void;
}

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

const THEME_OPTIONS: { value: 'dark' | 'light' | 'system'; label: string; icon: React.ReactNode }[] = [
  { value: 'dark', label: 'Dark', icon: <Moon size={18} /> },
  { value: 'light', label: 'Light', icon: <Sun size={18} /> },
  { value: 'system', label: 'System', icon: <Monitor size={18} /> },
];

const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  const {
    settings,
    globalOutputMode,
    setGlobalOutputMode,
    setSoundEnabled,
    setDefaultModel,
    clearAllConversations,
    setTheme,
    setMemoryEnabled,
    setMemorySuggestionsEnabled,
  } = useChatStore();
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

          {/* Output Format */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Output</div>
            <div className={styles.settingItem}>
              <div className={styles.settingInfo}>
                <div className={styles.settingIcon}>
                  <Bot size={20} />
                </div>
                <div>
                  <div className={styles.settingLabel}>Default Output Format</div>
                  <div className={styles.settingDesc}>Choose how AI-HAM formats responses by default.</div>
                </div>
              </div>
              <select
                className={styles.outputSelect}
                value={globalOutputMode}
                onChange={(e) => setGlobalOutputMode(e.target.value as any)}
              >
                <option value="auto">Auto</option>
                <option value="json">JSON</option>
                <option value="table">Table</option>
                <option value="code">Code</option>
              </select>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Memory</div>

            <div className={styles.settingsStack}>
              <div className={styles.settingItem}>
                <div className={styles.settingInfo}>
                  <div className={styles.settingIcon}>
                    <Brain size={20} />
                  </div>
                  <div>
                    <div className={styles.settingLabel}>Persistent Memory</div>
                    <div className={styles.settingDesc}>Let AI-HAM remember trusted context across all conversations.</div>
                  </div>
                </div>
                <button
                  className={`${styles.toggle} ${settings.enableMemory ? styles.on : ''}`}
                  onClick={() => setMemoryEnabled(!settings.enableMemory)}
                >
                  <div className={styles.toggleKnob} />
                </button>
              </div>

              <div className={styles.settingItem}>
                <div className={styles.settingInfo}>
                  <div className={styles.settingIcon}>
                    <Check size={20} />
                  </div>
                  <div>
                    <div className={styles.settingLabel}>Suggested Memory Review</div>
                    <div className={styles.settingDesc}>Capture candidate memories from chat, but require review before they become trusted.</div>
                  </div>
                </div>
                <button
                  className={`${styles.toggle} ${settings.enableMemorySuggestions ? styles.on : ''}`}
                  onClick={() => setMemorySuggestionsEnabled(!settings.enableMemorySuggestions)}
                  disabled={!settings.enableMemory}
                >
                  <div className={styles.toggleKnob} />
                </button>
              </div>
            </div>

            <div className={styles.memoryPanelWrapper}>
              <MemoryManager />
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
                    <span>{model.display}</span>
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
