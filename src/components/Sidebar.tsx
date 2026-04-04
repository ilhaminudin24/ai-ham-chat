import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MessageSquarePlus, MessageSquare, Trash2, Search, ChevronRight, MoreHorizontal, FolderPlus, X, FolderInput, Pin, Settings, LogOut, Workflow } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import { SkillsPanel } from './SkillsPanel';
import { ChainsPanel } from './ChainsPanel';
import { ChainEditor } from './ChainEditor';
import type { PromptChain } from '../types/chains';
import { TagChip } from './TagSelector';
import styles from './Sidebar.module.css';
import { supabase } from '../utils/supabase';

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
  const [showChains, setShowChains] = useState(false);
  const [editingChain, setEditingChain] = useState<PromptChain | null>(null);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserEmail(data.user.email || '');
    });
  }, []);

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

  // Filter conversations by search and tag
  const filteredConversations = useMemo(() => {
    let result = conversations;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(conv => 
        conv.title.toLowerCase().includes(query) ||
        conv.messages.some(msg => msg.content.toLowerCase().includes(query))
      );
    }
    if (filterTag) {
      result = result.filter(conv => (conv.tags || []).includes(filterTag));
    }
    return result;
  }, [conversations, searchQuery, filterTag]);

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
          <div className={styles.headerActionsRow}>
            <button className={styles.newChatBtn} onClick={() => { createNewConversation(); setSidebarOpen(false); }}>
              <MessageSquarePlus size={18} />
              <span>New Chat</span>
            </button>
            <button className={styles.mobileCloseBtn} onClick={() => setSidebarOpen(false)}>
              <X size={20} />
            </button>
          </div>
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

        {/* Tag filter bar */}
        {filterTag && (
          <div className={styles.filterBar}>
            <span className={styles.filterLabel}>Filter:</span>
            <TagChip tag={filterTag} />
            <button
              onClick={() => setFilterTag(null)}
              className={styles.filterClearBtn}
              title="Clear filter"
              aria-label="Clear active tag filter"
            >
              <X size={12} />
            </button>
          </div>
        )}

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
                    onClick={() => { setCurrentConversation(conv.id); setSidebarOpen(false); }}
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
                          onClick={() => { setCurrentConversation(conv.id); setSidebarOpen(false); }}
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
                        onClick={() => { setCurrentConversation(conv.id); setSidebarOpen(false); }}
                      >
                        {conv.isPinned && <Pin size={12} className={styles.pinIcon} />}
                        <MessageSquare size={14} />
                        <div className={styles.chatMeta}>
                          <span className={styles.chatTitle}>{conv.title || 'New Chat'}</span>
                          {conv.tags && conv.tags.length > 0 && (
                            <div className={styles.chatTags}>
                              {conv.tags.map(tag => (
                                <span key={tag} onClick={(e) => { e.stopPropagation(); setFilterTag(tag); }}>
                                  <TagChip tag={tag} small />
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
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
          <div className={styles.profileAvatar}>
            {userEmail ? userEmail.substring(0, 1).toUpperCase() : 'U'}
          </div>
          <div className={styles.profileMeta}>
            <div className={styles.profileName}>{userEmail || 'Boss Ilham'}</div>
            <div className={styles.profileStatus}>Online</div>
          </div>

          <div className={styles.footerActions}>
          <button 
            className={styles.skillsBtn}
            onClick={() => setShowChains(true)}
            title="Prompt Chains"
            aria-label="Open prompt chains"
          >
            <Workflow size={18} />
          </button>
          
          <button 
            className={styles.skillsBtn}
            onClick={() => setShowSkills(true)}
            title="Settings & Skills"
            aria-label="Open skills panel"
          >
            <Settings size={18} />
          </button>
          
          <button 
            className={styles.skillsBtn}
            onClick={() => supabase.auth.signOut()}
            title="Log out"
            aria-label="Log out"
          >
            <LogOut size={18} />
          </button>
          </div>
        </div>
      </aside>
      
      <SkillsPanel 
        isOpen={showSkills} 
        onClose={() => setShowSkills(false)}
        onSkillsChange={(skills) => setActiveSkills(skills)}
      />

      <ChainsPanel
        isOpen={showChains}
        onClose={() => setShowChains(false)}
        onEditChain={(chain) => {
          setShowChains(false);
          setEditingChain(chain || null);
        }}
      />

      <ChainEditor
        isOpen={editingChain !== null || (showChains === false && editingChain === null && !isSidebarOpen && !showSkills && false /* hack to trigger new */)}
        chain={editingChain}
        onClose={() => setEditingChain(null)}
      />
    </>
  );
};

export default Sidebar;
