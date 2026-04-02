import React from 'react';
import { X, BarChart3, MessageSquare, Cpu, Clock } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import styles from './UsageStatsPanel.module.css';

interface UsageStatsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UsageStatsPanel: React.FC<UsageStatsPanelProps> = ({ isOpen, onClose }) => {
  const { usageStats, conversations, currentConversationId } = useChatStore();
  
  const currentConv = conversations.find(c => c.id === currentConversationId);
  const convMessages = currentConv?.messages.length || 0;
  
  // Estimate tokens (rough: ~4 chars per token, avg 50 chars per message)
  const estimatedConvTokens = Math.round(convMessages * 50 / 4);
  const estimatedTodayTokens = Object.values(usageStats.dailyStats).slice(-1)[0]?.tokens || 0;
  
  // Format numbers
  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.panel}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <BarChart3 size={20} className={styles.headerIcon} />
            <h2>Usage Statistics</h2>
          </div>
          <button onClick={onClose} className={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>
        
        <div className={styles.content}>
          {/* This Conversation */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>This Conversation</h3>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <MessageSquare size={18} className={styles.statIcon} />
                <div className={styles.statInfo}>
                  <span className={styles.statValue}>{convMessages}</span>
                  <span className={styles.statLabel}>Messages</span>
                </div>
              </div>
              <div className={styles.statCard}>
                <Cpu size={18} className={styles.statIcon} />
                <div className={styles.statInfo}>
                  <span className={styles.statValue}>{formatNumber(estimatedConvTokens)}</span>
                  <span className={styles.statLabel}>Est. Tokens</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Today */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Today</h3>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <MessageSquare size={18} className={styles.statIcon} />
                <div className={styles.statInfo}>
                  <span className={styles.statValue}>
                    {Object.values(usageStats.dailyStats).slice(-1)[0]?.messages || 0}
                  </span>
                  <span className={styles.statLabel}>Messages</span>
                </div>
              </div>
              <div className={styles.statCard}>
                <Cpu size={18} className={styles.statIcon} />
                <div className={styles.statInfo}>
                  <span className={styles.statValue}>
                    {formatNumber(estimatedTodayTokens)}
                  </span>
                  <span className={styles.statLabel}>Est. Tokens</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* All Time */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>All Time</h3>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <MessageSquare size={18} className={styles.statIcon} />
                <div className={styles.statInfo}>
                  <span className={styles.statValue}>{formatNumber(usageStats.totalMessages)}</span>
                  <span className={styles.statLabel}>Total Messages</span>
                </div>
              </div>
              <div className={styles.statCard}>
                <Cpu size={18} className={styles.statIcon} />
                <div className={styles.statInfo}>
                  <span className={styles.statValue}>{formatNumber(usageStats.totalTokens)}</span>
                  <span className={styles.statLabel}>Est. Tokens</span>
                </div>
              </div>
              <div className={styles.statCard}>
                <BarChart3 size={18} className={styles.statIcon} />
                <div className={styles.statInfo}>
                  <span className={styles.statValue}>{usageStats.totalConversations}</span>
                  <span className={styles.statLabel}>Conversations</span>
                </div>
              </div>
              <div className={styles.statCard}>
                <Clock size={18} className={styles.statIcon} />
                <div className={styles.statInfo}>
                  <span className={styles.statValue}>
                    {usageStats.lastUpdated ? new Date(usageStats.lastUpdated).toLocaleDateString() : 'N/A'}
                  </span>
                  <span className={styles.statLabel}>Last Updated</span>
                </div>
              </div>
            </div>
          </div>
          
          <p className={styles.disclaimer}>
            * Token estimates are approximate (1 token ≈ 4 characters)
          </p>
        </div>
      </div>
    </>
  );
};
