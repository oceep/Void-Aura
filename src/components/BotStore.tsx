import React, { useState, useEffect } from 'react';
import { Bot } from '../types';

export interface BotStoreProps {
  isOpen: boolean;
  onClose: () => void;
  bots: Bot[];
  onSelectBot: (bot: Bot) => void;
  onCreateBot: (bot: Bot) => void;
  onDeleteBot?: (botId: string) => void;
  t: (key: string) => string;
}

export const BotStore: React.FC<BotStoreProps> = ({ isOpen, onClose, bots, onSelectBot, onCreateBot, onDeleteBot, t }) => {
  const [view, setView] = useState<'explore' | 'create'>('explore');
  const [isClosing, setIsClosing] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Creation/Edit Form State
  const [editingBotId, setEditingBotId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newInstruction, setNewInstruction] = useState('');

  useEffect(() => {
    if (isOpen) {
        setShouldRender(true);
        setIsClosing(false);
        setSearchQuery(''); // Reset search on open
    }
  }, [isOpen]);

  const handleClose = () => {
      setIsClosing(true);
      setTimeout(() => {
          setShouldRender(false);
          setIsClosing(false);
          onClose();
      }, 200); // Match animation duration (0.2s)
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newInstruction.trim()) return;

      const newBot: Bot = {
          id: editingBotId || `user-bot-${Date.now()}`, // Keep existing ID if editing
          name: newName.trim() || "Oceep của FoxAI",
          description: newDesc.trim() || "Bot tùy chỉnh bởi người dùng",
          icon: "👤", // Default user bot icon
          systemInstruction: newInstruction,
          isOfficial: false,
          color: "from-gray-700 to-gray-900"
      };

      onCreateBot(newBot);
      
      // Reset
      setView('explore');
      setEditingBotId(null);
      setNewName('');
      setNewDesc('');
      setNewInstruction('');
  };
  
  const handleEditClick = (e: React.MouseEvent, bot: Bot) => {
      e.stopPropagation();
      setEditingBotId(bot.id);
      setNewName(bot.name);
      setNewDesc(bot.description);
      setNewInstruction(bot.systemInstruction);
      setView('create');
  };

  const handleDeleteClick = (e: React.MouseEvent, botId: string) => {
      e.stopPropagation();
      if (confirm("Bạn có chắc chắn muốn xóa Bot này không?")) {
          if (onDeleteBot) onDeleteBot(botId);
      }
  };

  // Filter Logic
  const filteredOfficialBots = bots.filter(b => 
      b.isOfficial && 
      (b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
       b.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredUserBots = bots.filter(b => 
      !b.isOfficial && 
      (b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
       b.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!shouldRender) return null;

  return (
    <div className={`fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}>
      <div className={`bg-[#0f0f12] w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-800 ${isClosing ? 'animate-scale-out' : 'animate-scale-in'}`}>
        
        {/* Header */}
        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#1a1a1f]">
            <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">{t('botStoreTitle')}</h2>
                <p className="text-gray-400 text-sm mt-1">{t('botStoreDesc')}</p>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
            
            {view === 'explore' ? (
                <div className="space-y-8">
                    
                    {/* Search & Actions */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 sticky top-0 bg-[#0f0f12] z-10 py-2">
                        <div className="relative w-full md:w-96 group">
                            <input 
                                type="text"
                                placeholder={t('searchBot')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-[#1e1e24] border border-gray-700 rounded-full px-5 py-2.5 pl-11 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all focus:border-blue-500"
                                autoFocus
                            />
                            <svg className="w-5 h-5 text-gray-400 absolute left-3.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            {searchQuery && (
                                <button 
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-2.5 text-gray-500 hover:text-white"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            )}
                        </div>

                        <button 
                            onClick={() => {
                                setEditingBotId(null);
                                setNewName('');
                                setNewDesc('');
                                setNewInstruction('');
                                setView('create');
                            }}
                            className="px-5 py-2.5 bg-white text-black text-sm font-bold rounded-full hover:bg-gray-200 transition-colors flex items-center gap-2 shadow-lg active:scale-95 w-full md:w-auto justify-center"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                            {t('createBot')}
                        </button>
                    </div>

                    {/* Featured / Official */}
                    <div>
                        {filteredOfficialBots.length > 0 && (
                            <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
                                <span>{t('topPicks')}</span>
                                <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{filteredOfficialBots.length}</span>
                            </h3>
                        )}
                        
                        {filteredOfficialBots.length === 0 && searchQuery && (
                            <div className="text-center py-10 text-gray-500">
                                {t('notFound')} "{searchQuery}"
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredOfficialBots.map(bot => (
                                <div 
                                    key={bot.id}
                                    className="group relative bg-[#1e1e24] hover:bg-[#25252b] border border-gray-800 hover:border-gray-600 rounded-xl p-4 transition-all cursor-pointer flex gap-4 items-start"
                                    onClick={() => {
                                        onSelectBot(bot);
                                        handleClose();
                                    }}
                                >
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-gradient-to-br ${bot.color || 'from-blue-600 to-purple-600'} shadow-lg shrink-0`}>
                                        {bot.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-white truncate">{bot.name}</h4>
                                            {bot.badge && (
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold text-white shadow-lg animate-pulse ${
                                                    bot.badge === 'HOT' ? 'bg-red-600 shadow-red-500/50' : 
                                                    bot.badge === 'PRO' ? 'bg-slate-700 border border-slate-500' :
                                                    'bg-blue-600 shadow-blue-500/50'
                                                }`}>
                                                    {bot.badge}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-400 line-clamp-2 mt-1 mb-2 h-8">{bot.description}</p>
                                        <div className="flex items-center gap-1 text-[10px] text-gray-500 font-medium">
                                            <span>Oceep Official</span>
                                            <svg className="w-3 h-3 text-blue-500 fill-current" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* User Created */}
                    {filteredUserBots.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold text-gray-200 mb-4">{t('yourBots')}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredUserBots.map(bot => (
                                    <div 
                                        key={bot.id}
                                        className="group relative bg-[#1e1e24] hover:bg-[#25252b] border border-gray-800 hover:border-gray-600 rounded-xl p-4 transition-all cursor-pointer flex gap-4 items-start"
                                        onClick={() => {
                                            onSelectBot(bot);
                                            handleClose();
                                        }}
                                    >
                                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-gray-700 shadow-lg shrink-0">
                                            {bot.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-white truncate">{bot.name}</h4>
                                            <p className="text-xs text-gray-400 line-clamp-2 mt-1 mb-2 h-8">{bot.description}</p>
                                            <div className="flex items-center gap-1 text-[10px] text-gray-500 font-medium">
                                                <span>Custom Bot</span>
                                            </div>
                                        </div>
                                        
                                        {/* Edit/Delete Buttons */}
                                        <div className="flex flex-col gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={(e) => handleEditClick(e, bot)}
                                                className="p-1.5 bg-gray-800 hover:bg-blue-600 rounded text-gray-400 hover:text-white transition-colors"
                                                title={t('edit')}
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            </button>
                                            <button 
                                                onClick={(e) => handleDeleteClick(e, bot.id)}
                                                className="p-1.5 bg-gray-800 hover:bg-red-600 rounded text-gray-400 hover:text-white transition-colors"
                                                title={t('delete')}
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="max-w-2xl mx-auto">
                    <button 
                        onClick={() => setView('explore')}
                        className="mb-6 flex items-center text-gray-400 hover:text-white transition-colors"
                    >
                        <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                        {t('back')}
                    </button>
                    
                    <h3 className="text-2xl font-bold text-white mb-6">
                        {editingBotId ? "Chỉnh sửa Bot" : t('createBot')}
                    </h3>
                    
                    <form onSubmit={handleCreateSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">{t('botName')}</label>
                            <input 
                                type="text" 
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                placeholder="Ví dụ: Cố vấn tài chính"
                                className="w-full bg-[#1a1a1f] border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">{t('botDesc')}</label>
                            <input 
                                type="text" 
                                value={newDesc}
                                onChange={e => setNewDesc(e.target.value)}
                                placeholder="Giúp tôi quản lý chi tiêu..."
                                className="w-full bg-[#1a1a1f] border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">{t('botInstruction')} <span className="text-red-500">*</span></label>
                            <textarea 
                                value={newInstruction}
                                onChange={e => setNewInstruction(e.target.value)}
                                placeholder="Nhập hướng dẫn hành vi cho Bot. Ví dụ: Bạn là một chuyên gia tài chính khó tính, luôn nhắc nhở tôi tiết kiệm..."
                                className="w-full bg-[#1a1a1f] border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none h-40 resize-none"
                                required
                            />
                        </div>

                        <button 
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-colors"
                        >
                            {editingBotId ? t('saveChanges') : t('createBot')}
                        </button>
                    </form>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default BotStore;