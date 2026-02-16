
import React, { useState, useEffect } from 'react';

export interface WhatsNewModalProps {
  isOpen: boolean;
  onClose: (dontShowAgain: boolean) => void;
  t: (key: string) => string;
}

export const WhatsNewModal: React.FC<WhatsNewModalProps> = ({ isOpen, onClose, t }) => {
  const [dontShowAgain, setDontShowAgain] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isOpen) {
        setShouldRender(true);
        setIsClosing(false);
        // Small delay to allow the pop-in to start before showing staggered items if needed
        const t = setTimeout(() => setShowContent(true), 100);
        return () => clearTimeout(t);
    }
  }, [isOpen]);

  const handleClose = () => {
      setIsClosing(true);
      setTimeout(() => {
          setShouldRender(false);
          setIsClosing(false);
          onClose(dontShowAgain);
      }, 200); // Match animation duration
  };

  if (!shouldRender) return null;

  const features = [
      {
          icon: "👤",
          color: "bg-blue-500/10",
          title: "Chế độ Khách (Guest Mode)",
          desc: "Trải nghiệm nhanh mà không cần đăng nhập (giới hạn 5 tin nhắn/ngày)."
      },
      {
          icon: "🧠",
          color: "bg-purple-500/10",
          title: "Nâng cấp Thinking UI",
          desc: "Hiển thị quá trình suy nghĩ mượt mà hơn, tự động ẩn khi AI trả lời trực tiếp."
      },
      {
          icon: "🔗",
          color: "bg-emerald-500/10",
          title: "Trích dẫn thông minh",
          desc: "Nguồn tham khảo [1], [2] giờ đây có thể bấm vào để xem trực tiếp, tự động lọc bỏ nguồn lỗi."
      },
      {
          icon: "⚡",
          color: "bg-yellow-500/10",
          title: "Tối ưu hóa Tốc độ",
          desc: "Cải thiện độ trễ phản hồi và sửa lỗi hiển thị."
      }
  ];

  return (
    <div className={`fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}>
      <div className={`bg-[#1e1e24] border border-gray-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative ${isClosing ? 'animate-scale-out' : 'animate-pop-in'}`}>
        
        {/* Confetti / Sparkle Decoration */}
        <div className="absolute top-0 right-0 w-full h-full pointer-events-none overflow-hidden z-0">
             <div className="absolute top-[-10%] right-[-10%] w-40 h-40 bg-blue-500/20 rounded-full blur-3xl animate-breathing"></div>
             <div className="absolute bottom-[-10%] left-[-10%] w-40 h-40 bg-purple-500/20 rounded-full blur-3xl animate-breathing" style={{animationDelay: '1s'}}></div>
        </div>

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white relative overflow-hidden z-10">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-2xl animate-spin" style={{animationDuration: '10s'}}></div>
          <h2 className="text-2xl font-bold relative z-10 animate-slide-in-right">{t('whatsNew')} 🎉</h2>
          <p className="text-blue-100 text-sm relative z-10 mt-1 animate-slide-in-right" style={{animationDelay: '0.1s'}}>Version 2.4.8 - Guest & Polish</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 relative z-10">
          {features.map((feature, idx) => (
             <div 
                key={idx} 
                className="flex gap-3 opacity-0 animate-fade-up" 
                style={{ animationDelay: `${0.2 + (idx * 0.1)}s`, animationFillMode: 'forwards' }}
             >
                <div className={`flex-shrink-0 w-10 h-10 rounded-full ${feature.color} flex items-center justify-center text-xl shadow-inner`}>
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-bold text-gray-200">{feature.title}</h3>
                  <p className="text-sm text-gray-400 mt-0.5 leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
             </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 bg-[#25252b] flex items-center justify-between relative z-10">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-400 hover:text-gray-200 transition-colors select-none group">
            <div className="relative">
                <input 
                type="checkbox" 
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="peer sr-only"
                />
                <div className="w-4 h-4 rounded border border-gray-600 bg-gray-800 peer-checked:bg-blue-600 peer-checked:border-blue-500 transition-colors"></div>
                <svg className="absolute top-0.5 left-0.5 w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
            </div>
            <span className="group-hover:text-white transition-colors">{t('dontShowAgain')}</span>
          </label>
          
          <button 
            onClick={handleClose}
            className="px-6 py-2 bg-white text-black font-bold rounded-lg hover:bg-gray-200 active:scale-95 transition-all shadow-lg hover:shadow-white/20"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WhatsNewModal;
