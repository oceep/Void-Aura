
import React, { useState } from 'react';

interface NicknameModalProps {
  onSave: (name: string) => void;
  t: (key: string) => string;
}

export const NicknameModal: React.FC<NicknameModalProps> = ({ onSave, t }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#1e1e24] w-full max-w-md rounded-2xl shadow-2xl p-8 border border-gray-700 animate-scale-in">
        <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-600/20 rounded-full flex items-center justify-center border border-blue-500/50">
                <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{t('enterNickname')}</h2>
            <p className="text-gray-400 text-sm">Oceep muốn biết nên gọi bạn là gì để trò chuyện thân mật hơn.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('nicknamePlaceholder')}
                    className="w-full bg-black/50 border border-gray-600 rounded-xl px-5 py-4 text-white text-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition-all placeholder-gray-600"
                    autoFocus
                    required
                />
            </div>

            <button 
                type="submit"
                disabled={!name.trim()}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {t('startChatting')}
            </button>
        </form>
      </div>
    </div>
  );
};
