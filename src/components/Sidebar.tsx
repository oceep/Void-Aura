
import React, { useState, useEffect, useRef, memo } from 'react';
import { ChatSession } from '../types';

interface SidebarProps {
  isOpen: boolean;
  isCompact?: boolean;
  onToggleCompact?: () => void;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: (botId?: string) => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, newTitle: string) => void;
  onToggleSidebar: () => void;
  onOpenBotStore: () => void;
  onShowWhatsNew: () => void;
  version: string;
  t: (key: string) => string;
  user: any; // Passed from App
  onSignOut: () => void;
  isGuest?: boolean;
}

const SidebarComponent: React.FC<SidebarProps> = ({
  isOpen,
  isCompact = false,
  onToggleCompact,
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onRenameSession,
  onToggleSidebar,
  onOpenBotStore,
  onShowWhatsNew,
  version,
  t,
  user,
  onSignOut,
  isGuest = false
}) => {
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingSessionId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingSessionId]);

  const startEditing = (e: React.MouseEvent, session: ChatSession) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditTitle(session.title);
  };

  const saveTitle = () => {
    if (editingSessionId && editTitle.trim()) {
      const session = sessions.find(s => s.id === editingSessionId);
      let finalTitle = editTitle.trim();
      
      // Enforce [To-Do] prefix for To-Do sessions
      if (session && session.title.startsWith('[To-Do]')) {
          if (!finalTitle.startsWith('[To-Do]')) {
              // Strip any existing brackets to avoid [To-Do] [To-Do] if user messed up partially
              const cleanTitle = finalTitle.replace(/^\[To-Do\]\s*/i, '');
              finalTitle = `[To-Do] ${cleanTitle}`;
          }
      }

      onRenameSession(editingSessionId, finalTitle);
    }
    setEditingSessionId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveTitle();
    if (e.key === 'Escape') setEditingSessionId(null);
  };

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-20 transition-opacity md:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onToggleSidebar}
      />

      {/* Sidebar Content */}
      <aside 
        className={`fixed md:relative z-30 flex flex-col h-full bg-[#0f0f12]/95 backdrop-blur-xl border-r border-white/5 transition-[width,transform] duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${isCompact ? 'w-[80px]' : 'w-[280px]'}`}
      >
        <div className={`p-4 flex-shrink-0 flex flex-col gap-2 ${isCompact ? 'items-center' : ''}`}>
           {/* Primary New Chat Button - Blue Pill (Thicker & Bolder) */}
           <button
                onClick={() => {
                  onNewChat();
                  if (window.innerWidth < 768) onToggleSidebar();
                }}
                className={`flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full transition-all shadow-lg shadow-blue-900/20 active:scale-95 ${
                  isCompact ? 'w-12 h-12 justify-center p-0' : 'w-full px-6 py-4 justify-center'
                }`}
                title={t('newChat')}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                {!isCompact && <span className="font-bold text-base">{t('newChat')}</span>}
           </button>

           {/* Secondary Actions - Ghost Style */}
          {!isGuest && (
          <div className={`flex flex-col gap-1 mt-2 ${isCompact ? 'items-center' : ''}`}>
              <button
                onClick={() => {
                  onOpenBotStore();
                  if (window.innerWidth < 768) onToggleSidebar();
                }}
                className={`flex items-center gap-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200 font-medium ${
                  isCompact ? 'w-10 h-10 justify-center p-0' : 'w-full px-4 py-3 justify-start'
                }`}
                title={t('exploreBots')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                {!isCompact && <span>{t('exploreBots')}</span>}
              </button>
          </div>
          )}
        </div>

        {/* Visual Separator */}
        <div className="mx-4 h-px bg-white/5 my-1"></div>

        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1 scrollbar-hide">
          {!isCompact && (
             <div className="text-[11px] font-bold text-gray-500 px-4 py-2 uppercase tracking-widest opacity-60">{t('history')}</div>
          )}
          
          {sessions.length === 0 && !isCompact && (
            <div className="text-xs text-gray-600 px-4 py-2 italic text-center">{t('noHistory')}</div>
          )}
          
          {sessions.map(session => (
            <div 
                key={session.id} 
                className={`group relative flex items-center rounded-xl transition-all duration-200 cursor-pointer border border-transparent ${
                  currentSessionId === session.id 
                  ? 'bg-white/10 text-white shadow-inner' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                } ${isCompact ? 'justify-center py-3' : ''}`}
                title={isCompact ? session.title : undefined}
                onClick={() => {
                   onSelectSession(session.id);
                   if (window.innerWidth < 768) onToggleSidebar();
                }}
            >
                {editingSessionId === session.id && !isCompact ? (
                  <input 
                    ref={editInputRef}
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={saveTitle}
                    onKeyDown={handleKeyDown}
                    className="flex-1 bg-black/50 text-white text-sm px-3 py-2 mx-2 rounded border border-blue-500/50 focus:outline-none focus:border-blue-500"
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <>
                     {isCompact ? (
                        <div className="relative">
                            <svg className={`w-5 h-5 ${currentSessionId === session.id ? 'text-blue-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                            {currentSessionId === session.id && <div className="absolute -right-1 -top-1 w-2 h-2 bg-blue-500 rounded-full"></div>}
                        </div>
                     ) : (
                        <span 
                           className={`flex-1 text-left px-4 py-3 text-sm truncate pr-16 transition-colors`}
                        >
                           {session.title.startsWith('[To-Do]') ? <span className="text-emerald-400 font-medium">{session.title}</span> : session.title}
                        </span>
                     )}
                  </>
                )}
                
                {/* Actions (Only show in full mode) */}
                {editingSessionId !== session.id && !isCompact && (
                  <div className="absolute right-2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900/90 rounded-md shadow-lg border border-white/5">
                    <button 
                      onClick={(e) => startEditing(e, session)}
                      className="p-1.5 rounded-md text-gray-500 hover:text-blue-400 hover:bg-white/10 transition-colors"
                      title={t('edit')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                    </button>
                    <button 
                      onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(session.id);
                      }}
                      className="p-1.5 rounded-md text-gray-500 hover:text-red-400 hover:bg-white/10 transition-colors"
                      title={t('delete')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                  </div>
                )}
            </div>
          ))}
        </div>

        {/* User Info & Footer */}
        <div className="border-t border-white/5 bg-[#0a0a0c]">
            {user ? (
                <div className={`p-3 flex items-center ${isCompact ? 'justify-center' : 'justify-between gap-2'}`}>
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                            {user.email?.charAt(0).toUpperCase()}
                        </div>
                        {!isCompact && (
                            <div className="flex flex-col truncate">
                                <span className="text-xs text-white font-medium truncate">{user.email?.split('@')[0]}</span>
                                <span className="text-[10px] text-gray-500 truncate">{user.email}</span>
                            </div>
                        )}
                    </div>
                    {!isCompact && (
                        <button 
                            onClick={onSignOut}
                            className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-white/5 rounded transition-colors"
                            title="Đăng xuất"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        </button>
                    )}
                </div>
            ) : isGuest ? (
                <div className="p-3">
                    <button 
                        onClick={onSignOut}
                        className={`w-full py-2 bg-white/5 hover:bg-white/10 text-blue-400 text-xs font-bold rounded-lg border border-white/5 flex items-center justify-center gap-2 transition-colors ${isCompact ? 'px-0' : 'px-4'}`}
                    >
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                       {!isCompact && "Đăng nhập"}
                    </button>
                </div>
            ) : null}

            <div className={`flex p-3 items-center ${isCompact ? 'justify-center' : 'justify-between'} border-t border-white/5`}>
                {!isCompact && (
                    <button 
                    onClick={onShowWhatsNew}
                    className="text-[10px] text-gray-600 hover:text-blue-400 transition-colors font-mono ml-2 tracking-widest uppercase"
                    title="Xem thông tin cập nhật"
                    >
                    v{version}
                    </button>
                )}
                <button 
                onClick={onToggleCompact}
                className={`p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors ${isCompact ? 'w-full flex justify-center' : ''}`}
                title={isCompact ? "Mở rộng Sidebar" : "Thu gọn Sidebar"}
                >
                {isCompact ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path></svg>
                ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path></svg>
                )}
                </button>
            </div>
        </div>
      </aside>
    </>
  );
};

export const Sidebar = memo(SidebarComponent);
