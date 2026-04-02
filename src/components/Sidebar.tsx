import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MessageSquarePlus, MessageSquare, Trash2, Bot, Search, ChevronRight, MoreHorizontal, FolderPlus, X, FolderInput, Pin, Settings } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import { SkillsPanel } from './SkillsPanel';
import styles from './Sidebar.module.css';

const Sidebar: React.FC = () => {
  const { 
    conversations, 
    currentConversationId, 
    isSidebarOpen, 
    setSidebarOpen, 
    createNewConversation, 
    setCurrentConversation,
    deleteConversation,
    searchQuery,
    setSearchQuery,
    folders,
    moveToFolder,
    createFolder,
    deleteFolder,
    togglePin,
    setActiveSkills
  } = useChatStore();
  
  const [showSkills, setShowSkills] = useState(false);

  const [expandedFolders, setExpandedFolders] = useState<string[]>(['today', 'work', 'personal']);
  const [showFolderMenu, setShowFolderMenu] = useState<string | null>(null);
  const [showMoveMenu, setShowMoveMenu] = useState<string | null>(null);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const moveMenuRef = useRef<HTMLDivElement>(null);

  // Close move menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moveMenuRef.current && !moveMenuRef.current.contains(e.target as Node)) {
        setShowMoveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter conversations by search
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const query = searchQuery.toLowerCase();
    return conversations.filter(conv => 
      conv.title.toLowerCase().includes(query) ||
      conv.messages.some(msg => msg.content.toLowerCase().includes(query))
    );
  }, [conversations, searchQuery]);

  // Group conversations by folder
  const groupedConversations = useMemo(() => {
    const groups: Record<string, typeof conversations> = {
      uncategorized: [],
      ...folders.reduce((acc, f) => ({ ...acc, [f.id]: [] }), {})
    };
    
    filteredConversations.forEach(conv => {
      if (conv.folderId) {
        groups[conv.folderId] = groups[conv.folderId] || [];
        groups[conv.folderId].push(conv);
      } else {
        groups.uncategorized.push(conv);
      }
    });
    
    return groups;
  }, [filteredConversations, folders]);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => 
      prev.includes(folderId) 
        ? prev.filter(id => id !== folderId)
        : [...prev, folderId]
    );
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      createFolder(newFolderName.trim());
      setNewFolderName('');
      setShowNewFolderInput(false);
    }
  };

  const handleMoveToFolder = (convId: string, folderId: string | null) => {
    moveToFolder(convId, folderId);
    setShowMoveMenu(null);
  };

  return (
    <>
      <div 
        className={`${styles.sidebarOverlay} ${isSidebarOpen ? styles.open : ''}`} 
        onClick={() => setSidebarOpen(false)}
      />
      <aside className={`${styles.sidebarContainer} ${isSidebarOpen ? styles.open : ''}`}>
        <div className={styles.sidebarHeader}>
          <button className={styles.newChatBtn} onClick={createNewConversation}>
            <MessageSquarePlus size={18} />
            <span>New Chat</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className={styles.searchContainer}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              className={styles.clearSearch}
              onClick={() => setSearchQuery('')}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Search Results or Folder View */}
        <div className={styles.chatList}>
          {searchQuery ? (
            // Search Results
            <>
              {filteredConversations.length === 0 ? (
                <div className={styles.emptyState}>
                  <Search size={24} />
                  <p>No chats found</p>
                </div>
              ) : (
                filteredConversations.map(conv => (
                  <div 
                    key={conv.id} 
                    className={`${styles.chatItem} ${conv.id === currentConversationId ? styles.active : ''}`}
                    onClick={() => setCurrentConversation(conv.id)}
                  >
                    {conv.isPinned && <Pin size={12} className={styles.pinIcon} />}
                    <MessageSquare size={16} />
                    <span className={styles.chatTitle}>{conv.title || 'New Chat'}</span>
                    <div className={styles.itemActions}>
                      <button 
                        className={`${styles.pinBtn} ${conv.isPinned ? styles.pinned : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePin(conv.id);
                        }}
                        title={conv.isPinned ? 'Unpin' : 'Pin'}
                      >
                        <Pin size={12} />
                      </button>
                      <button 
                        className={styles.moveBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMoveMenu(showMoveMenu === conv.id ? null : conv.id);
                        }}
                        title="Move to folder"
                      >
                        <FolderInput size={12} />
                      </button>
                      {showMoveMenu === conv.id && (
                        <div className={styles.moveMenu}>
                          {folders.map(f => (
                            <button 
                              key={f.id} 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveToFolder(conv.id, f.id);
                              }}
                            >
                              {f.icon} {f.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button 
                      className={styles.deleteBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(conv.id);
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </>
          ) : (
            // Folder View
            <>
              {folders.map(folder => (
                <div key={folder.id} className={styles.folderGroup}>
                  <div 
                    className={styles.folderHeader}
                    onClick={() => toggleFolder(folder.id)}
                  >
                    <ChevronRight 
                      size={14} 
                      className={`${styles.chevron} ${expandedFolders.includes(folder.id) ? styles.expanded : ''}`}
                    />
                    <span className={styles.folderIcon}>{folder.icon}</span>
                    <span className={styles.folderName}>{folder.name}</span>
                    <span className={styles.folderCount}>
                      {groupedConversations[folder.id]?.length || 0}
                    </span>
                    <div className={styles.folderActions}>
                      <button 
                        className={styles.folderActionBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowFolderMenu(showFolderMenu === folder.id ? null : folder.id);
                        }}
                      >
                        <MoreHorizontal size={14} />
                      </button>
                      {showFolderMenu === folder.id && (
                        <div className={styles.folderMenu}>
                          <button onClick={() => deleteFolder(folder.id)}>
                            <Trash2 size={12} /> Delete Folder
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {expandedFolders.includes(folder.id) && (
                    <div className={styles.folderChats}>
                      {groupedConversations[folder.id]?.map(conv => (
                        <div 
                          key={conv.id} 
                          className={`${styles.chatItem} ${conv.id === currentConversationId ? styles.active : ''}`}
                          onClick={() => setCurrentConversation(conv.id)}
                        >
                          <MessageSquare size={14} />
                          <span className={styles.chatTitle}>{conv.title || 'New Chat'}</span>
                          <div className={styles.itemActions} ref={showMoveMenu === conv.id ? moveMenuRef : null}>
                            <button 
                              className={styles.moveBtn}
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowMoveMenu(showMoveMenu === conv.id ? null : conv.id);
                              }}
                              title="Move to folder"
                            >
                              <FolderInput size={12} />
                            </button>
                            {showMoveMenu === conv.id && (
                              <div className={styles.moveMenu}>
                                {folders.map(f => (
                                  <button 
                                    key={f.id} 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMoveToFolder(conv.id, f.id);
                                    }}
                                  >
                                    {f.icon} {f.name}
                                  </button>
                                ))}
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveToFolder(conv.id, null);
                                  }}
                                >
                                  <X size={12} /> Remove
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {(!groupedConversations[folder.id] || groupedConversations[folder.id].length === 0) && (
                        <div className={styles.emptyFolder}>No chats</div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Uncategorized Chats */}
              <div className={styles.folderGroup}>
                <div 
                  className={styles.folderHeader}
                  onClick={() => toggleFolder('uncategorized')}
                >
                  <ChevronRight 
                    size={14} 
                    className={`${styles.chevron} ${expandedFolders.includes('uncategorized') ? styles.expanded : ''}`}
                  />
                  <span className={styles.folderIcon}>📋</span>
                  <span className={styles.folderName}>All Chats</span>
                  <span className={styles.folderCount}>{groupedConversations.uncategorized?.length || 0}</span>
                </div>
                {expandedFolders.includes('uncategorized') && (
                  <div className={styles.folderChats}>
                    {groupedConversations.uncategorized?.map(conv => (
                      <div 
                        key={conv.id} 
                        className={`${styles.chatItem} ${conv.id === currentConversationId ? styles.active : ''}`}
                        onClick={() => setCurrentConversation(conv.id)}
                      >
                        {conv.isPinned && <Pin size={12} className={styles.pinIcon} />}
                        <MessageSquare size={14} />
                        <span className={styles.chatTitle}>{conv.title || 'New Chat'}</span>
                        <div className={styles.itemActions}>
                          <button 
                            className={`${styles.pinBtn} ${conv.isPinned ? styles.pinned : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePin(conv.id);
                            }}
                            title={conv.isPinned ? 'Unpin' : 'Pin'}
                          >
                            <Pin size={12} />
                          </button>
                          <button 
                            className={styles.moveBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowMoveMenu(showMoveMenu === conv.id ? null : conv.id);
                            }}
                            title="Move to folder"
                          >
                            <FolderInput size={12} />
                          </button>
                          {showMoveMenu === conv.id && (
                            <div className={styles.moveMenu}>
                              {folders.map(f => (
                                <button 
                                  key={f.id} 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveToFolder(conv.id, f.id);
                                  }}
                                >
                                  {f.icon} {f.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <button 
                          className={styles.deleteBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteConversation(conv.id);
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* New Folder Button */}
              {showNewFolderInput ? (
                <div className={styles.newFolderInput}>
                  <input
                    type="text"
                    placeholder="Folder name..."
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                    autoFocus
                  />
                  <button onClick={handleCreateFolder}>Add</button>
                  <button onClick={() => setShowNewFolderInput(false)}>Cancel</button>
                </div>
              ) : (
                <button 
                  className={styles.newFolderBtn}
                  onClick={() => setShowNewFolderInput(true)}
                >
                  <FolderPlus size={16} />
                  <span>New Folder</span>
                </button>
              )}
            </>
          )}
        </div>

        <div className={styles.sidebarFooter}>
          <div className={styles.avatar}>
            <Bot size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>AI-HAM</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Online</div>
          </div>
          <button 
            className={styles.skillsBtn}
            onClick={() => setShowSkills(true)}
            title="Skills Manager"
          >
            <Settings size={18} />
          </button>
        </div>
      </aside>
      
      <SkillsPanel 
        isOpen={showSkills} 
        onClose={() => setShowSkills(false)}
        onSkillsChange={(skills) => setActiveSkills(skills)}
      />
    </>
  );
};

export default Sidebar;
