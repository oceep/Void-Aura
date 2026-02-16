
import React, { useState, useEffect } from 'react';

interface LandingPageProps {
  onLogin: () => void;
  onSignUp: () => void;
  onStartChat: () => void;
}

type PageType = 'home' | 'about' | 'features' | 'learn-more';

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onSignUp, onStartChat }) => {
  const [wordIndex, setWordIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [activePage, setActivePage] = useState<PageType>('home');
  const words = ["Nhanh", "Thông minh", "Tối ưu"];

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setWordIndex((prev) => (prev + 1) % words.length);
        setIsAnimating(false);
      }, 500); // Wait for exit animation
    }, 3500); // 3s display + 0.5s transition
    return () => clearInterval(interval);
  }, []);

  const renderContent = () => {
    switch (activePage) {
      case 'about':
        return (
          <div className="w-full max-w-4xl mx-auto text-center animate-fade-up px-6 pt-10">
            <span className="text-blue-400 font-bold tracking-widest text-sm uppercase mb-4 block">Về FoxAI</span>
            <h2 className="text-4xl md:text-6xl font-bold mb-8 text-white">Kiến tạo tương lai hội thoại</h2>
            <p className="text-xl text-gray-400 leading-relaxed mb-12 max-w-2xl mx-auto">
              Oceep được xây dựng với niềm tin rằng AI không chỉ là công cụ, mà là người bạn đồng hành. Chúng tôi tập trung vào việc tạo ra trải nghiệm trò chuyện tự nhiên, thấu hiểu và mang đậm bản sắc cá nhân.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <div className="text-4xl mb-2">🚀</div>
                <h3 className="text-xl font-bold text-white mb-2">Tốc độ</h3>
                <p className="text-sm text-gray-400">Phản hồi tức thì với độ trễ thấp nhất thị trường.</p>
              </div>
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <div className="text-4xl mb-2">🛡️</div>
                <h3 className="text-xl font-bold text-white mb-2">Bảo mật</h3>
                <p className="text-sm text-gray-400">Dữ liệu của bạn được mã hóa và bảo vệ tuyệt đối.</p>
              </div>
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <div className="text-4xl mb-2">❤️</div>
                <h3 className="text-xl font-bold text-white mb-2">Tận tâm</h3>
                <p className="text-sm text-gray-400">Được thiết kế với trải nghiệm người dùng là trọng tâm.</p>
              </div>
            </div>
          </div>
        );
      case 'features':
        return (
          <div className="w-full max-w-5xl mx-auto animate-fade-up px-6 pt-10">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">Sức mạnh không giới hạn</h2>
              <p className="text-xl text-gray-400">Khám phá bộ công cụ toàn diện giúp bạn làm việc hiệu quả hơn gấp 10 lần.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex gap-5 p-6 rounded-3xl bg-gradient-to-br from-blue-900/20 to-black border border-blue-500/20 hover:border-blue-500/40 transition-all group">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition-transform">🧠</div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Mô hình AI Đa dạng</h3>
                  <p className="text-gray-400 leading-relaxed">Tích hợp các mô hình ngôn ngữ hàng đầu. Chuyển đổi linh hoạt giữa chế độ Core, Depth, Apex và thậm chí là Deep Research. Powered by Google Gemini</p>
                </div>
              </div>

              <div className="flex gap-5 p-6 rounded-3xl bg-gradient-to-br from-purple-900/20 to-black border border-purple-500/20 hover:border-purple-500/40 transition-all group">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition-transform">🎨</div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Sáng tạo Hình ảnh</h3>
                  <p className="text-gray-400 leading-relaxed">Biến ý tưởng thành tác phẩm nghệ thuật chỉ trong vài giây với công nghệ tạo ảnh AI tiên tiến nhất.</p>
                </div>
              </div>

              <div className="flex gap-5 p-6 rounded-3xl bg-gradient-to-br from-emerald-900/20 to-black border border-emerald-500/20 hover:border-emerald-500/40 transition-all group">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition-transform">🌐</div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Tìm kiếm Thời gian thực</h3>
                  <p className="text-gray-400 leading-relaxed">Kết nối trực tiếp với Google Search để cung cấp thông tin mới nhất, chính xác nhất kèm trích dẫn nguồn.</p>
                </div>
              </div>

              <div className="flex gap-5 p-6 rounded-3xl bg-gradient-to-br from-pink-900/20 to-black border border-pink-500/20 hover:border-pink-500/40 transition-all group">
                <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition-transform">🎙️</div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Live Voice Chat</h3>
                  <p className="text-gray-400 leading-relaxed">Trò chuyện bằng giọng nói tự nhiên với độ trễ cực thấp. Cảm giác như đang nói chuyện với người thật.</p>
                </div>
              </div>
            </div>
          </div>
        );
      case 'learn-more':
        return (
          <div className="w-full max-w-3xl mx-auto animate-fade-up px-6 pt-10">
            <h2 className="text-4xl font-bold mb-10 text-white text-center">Câu hỏi thường gặp</h2>
            
            <div className="space-y-4">
              <div className="p-6 rounded-2xl bg-[#1a1a1f] border border-white/5 hover:border-white/10 transition-colors">
                <h3 className="text-lg font-bold text-white mb-2">Oceep có miễn phí không?</h3>
                <p className="text-gray-400">Có! Chúng tôi cung cấp gói miễn phí với đầy đủ các tính năng cao cấp, mô hình cao cấp. Không mất phí, không ràng buộc.</p>
              </div>
              
              <div className="p-6 rounded-2xl bg-[#1a1a1f] border border-white/5 hover:border-white/10 transition-colors">
                <h3 className="text-lg font-bold text-white mb-2">Làm thế nào để bắt đầu?</h3>
                <p className="text-gray-400">Rất đơn giản. Chỉ cần nhấn nút "Bắt đầu ngay", đăng nhập bằng tài khoản Email hoặc chế độ khách (giới hạn 5 tin nhắn/ngày và giới hạn rất nhiều tính năng nâng cao) và bạn đã sẵn sàng trò chuyện.</p>
              </div>

              <div className="p-6 rounded-2xl bg-[#1a1a1f] border border-white/5 hover:border-white/10 transition-colors">
                <h3 className="text-lg font-bold text-white mb-2">Chế độ Ẩn danh là gì?</h3>
                <p className="text-gray-400">Khi bật chế độ Ẩn danh (Incognito), mọi cuộc trò chuyện của bạn sẽ không được lưu lại trên máy chủ, đảm bảo sự riêng tư tuyệt đối.</p>
              </div>

              <div className="p-6 rounded-2xl bg-[#1a1a1f] border border-white/5 hover:border-white/10 transition-colors">
                <h3 className="text-lg font-bold text-white mb-2">Tôi có thể tạo Bot riêng không?</h3>
                <p className="text-gray-400">Chắc chắn rồi. Với tính năng "Bot Store", bạn có thể tùy chỉnh tính cách, kiến thức và phong cách trả lời của AI theo ý muốn.</p>
              </div>
            </div>
            
            <div className="mt-12 text-center">
                <button 
                    onClick={onStartChat}
                    className="px-8 py-3 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-colors"
                >
                    Khám phá ngay
                </button>
            </div>
          </div>
        );
      case 'home':
      default:
        return (
          <>
            <div className="mb-8 animate-fade-in group cursor-pointer" onClick={onStartChat}>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-blue-300 backdrop-blur-md hover:bg-white/10 transition-colors">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                    TRỢ LÝ THÔNG MINH CỦA BẠN
                </div>
            </div>

            <h1 className="text-5xl md:text-8xl font-bold tracking-tighter mb-6 max-w-5xl leading-[1.1] animate-fade-up">
                AI Chatbot thực sự <br />
                <div className="h-[1.1em] overflow-hidden relative inline-flex justify-center w-full">
                    <span 
                        className={`text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-white to-purple-400 drop-shadow-[0_0_35px_rgba(59,130,246,0.4)] transition-all duration-300 transform ${
                            isAnimating ? 'opacity-0 translate-y-10' : 'opacity-100 translate-y-0'
                        }`}
                    >
                        {words[wordIndex]}.
                    </span>
                </div>
            </h1>

            <p className="text-xl text-gray-400 max-w-2xl mb-10 leading-relaxed animate-fade-up font-light" style={{animationDelay: '0.1s'}}>
                Oceep không chỉ là AI. Đó là cuộc trò chuyện thấu hiểu, thông minh và phát triển cùng bạn. Khám phá tương lai ngay hôm nay.
            </p>

            <div className="flex flex-col md:flex-row gap-5 w-full max-w-md md:max-w-none justify-center animate-fade-up mb-16" style={{animationDelay: '0.15s'}}>
                <button 
                    onClick={onStartChat}
                    className="px-8 py-4 bg-white text-black font-bold text-lg rounded-full transition-all hover:bg-gray-200 active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                >
                    Bắt đầu ngay
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </button>
                <button onClick={() => setActivePage('learn-more')} className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-lg rounded-full backdrop-blur-sm transition-all flex items-center justify-center">
                    Tìm hiểu thêm
                </button>
            </div>

            {/* HEART SPOT - The addictive element */}
            <div className="w-full max-w-4xl mx-auto mb-20 animate-fade-up" style={{animationDelay: '0.2s'}}>
                <div className="relative p-8 md:p-10 rounded-3xl bg-gradient-to-br from-gray-900/50 to-black/50 border border-white/10 backdrop-blur-md overflow-hidden group hover:border-pink-500/30 transition-colors duration-500">
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl group-hover:bg-pink-500/20 transition-all duration-700"></div>
                    <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-700"></div>
                    
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
                        <div>
                            <h3 className="text-2xl font-bold text-white mb-2 flex items-center justify-center md:justify-start gap-2">
                                Được tạo ra bằng 
                                <span className="text-3xl animate-pulse text-pink-500 drop-shadow-[0_0_10px_rgba(236,72,153,0.8)]">❤️</span> 
                                dành cho bạn
                            </h3>
                            <p className="text-gray-400">Tham gia cùng hàng ngàn người dùng đã tìm thấy người bạn đồng hành AI hoàn hảo.</p>
                        </div>
                        <div className="flex -space-x-3">
                            <div className="w-10 h-10 rounded-full border-2 border-[#1a1a1f] bg-gray-700 overflow-hidden"><img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" /></div>
                            <div className="w-10 h-10 rounded-full border-2 border-[#1a1a1f] bg-gray-700 overflow-hidden"><img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka" alt="User" /></div>
                            <div className="w-10 h-10 rounded-full border-2 border-[#1a1a1f] bg-gray-700 overflow-hidden"><img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Zack" alt="User" /></div>
                            <div className="w-10 h-10 rounded-full border-2 border-[#1a1a1f] bg-gray-800 flex items-center justify-center text-xs font-bold text-white">+2k</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Suggested Prompts */}
            <div className="w-full max-w-6xl px-4 text-left animate-fade-up" style={{animationDelay: '0.25s'}}>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                        <span className="text-2xl">💡</span> Cảm hứng
                    </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <PromptCard 
                        icon="🏖️" color="bg-orange-500/10 text-orange-400"
                        title="Lên lịch trình" 
                        desc="Tìm địa điểm hoàn hảo cho kỳ nghỉ tiếp theo của bạn."
                        onClick={onStartChat}
                    />
                    <PromptCard 
                        icon="🌊" color="bg-blue-500/10 text-blue-400"
                        title="Đại dương" 
                        desc="Khám phá những bí ẩn dưới đáy biển sâu."
                        onClick={onStartChat}
                    />
                    <PromptCard 
                        icon="🎵" color="bg-purple-500/10 text-purple-400"
                        title="Sáng tạo" 
                        desc="Sáng tác bài hát, thơ hoặc truyện ngắn ngay lập tức."
                        onClick={onStartChat}
                    />
                    <PromptCard 
                        icon="🎓" color="bg-emerald-500/10 text-emerald-400"
                        title="Học tập" 
                        desc="Tóm tắt các chủ đề phức tạp chỉ trong vài giây."
                        onClick={onStartChat}
                    />
                </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f12] text-white font-sans selection:bg-blue-500/30 overflow-x-hidden flex flex-col relative scroll-smooth">
      
      {/* Background Ambient Light */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[80vw] h-[60vh] bg-blue-600/10 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vh] bg-teal-500/5 rounded-full blur-[100px]"></div>
          <div className="absolute top-[40%] right-[-5%] w-[30vw] h-[30vh] bg-purple-500/5 rounded-full blur-[100px]"></div>
      </div>

      {/* Navbar */}
      <nav className="relative z-50 w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
        {/* Left: Logo */}
        <div className="flex items-center gap-1 select-none cursor-pointer" onClick={() => setActivePage('home')}>
            <div className="w-8 h-8 animate-breathing">
                <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                    <defs>
                        <radialGradient id="logoGradient" cx="0.3" cy="0.3" r="0.7">
                            <stop offset="0%" stopColor="rgb(220,240,255)" stopOpacity="1" />
                            <stop offset="100%" stopColor="rgb(51, 149, 240)" stopOpacity="1" />
                        </radialGradient>
                    </defs>
                    <circle cx="50" cy="50" r="45" fill="url(#logoGradient)" stroke="rgba(255,255,255,0.7)" strokeWidth="3"/>
                    <path d="M 35 30 A 25 25 0 0 1 60 55" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="5" strokeLinecap="round"/>
                </svg>
            </div>
            <span className="text-2xl font-semibold text-blue-400" style={{ fontFamily: 'Inter, sans-serif' }}>ceep</span>
        </div>

        {/* Center: Nav Items (Absolute Positioning for perfect center) */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
            <button onClick={() => setActivePage('home')} className={`hover:text-white transition-colors ${activePage === 'home' ? 'text-white font-bold' : ''}`}>Trang chủ</button>
            <button onClick={() => setActivePage('about')} className={`hover:text-white transition-colors ${activePage === 'about' ? 'text-white font-bold' : ''}`}>Về chúng tôi</button>
            <button onClick={() => setActivePage('features')} className={`hover:text-white transition-colors ${activePage === 'features' ? 'text-white font-bold' : ''}`}>Tính năng</button>
        </div>

        {/* Right: Auth Buttons */}
        <div className="flex items-center gap-4 ml-auto">
            <button onClick={onLogin} className="hidden md:block text-sm font-semibold text-gray-300 hover:text-white transition-colors">
                Đăng nhập
            </button>
            <button 
                onClick={onSignUp}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-full transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] active:scale-95"
            >
                Đăng ký
            </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 flex-grow flex flex-col items-center justify-center text-center px-4 mt-8 md:mt-0">
        {renderContent()}
      </main>

      <footer className="relative z-10 w-full border-t border-white/5 mt-20 py-8 text-center text-gray-500 text-sm">
        <p>&copy; 2026 Oceep by FoxAI. All rights reserved.</p>
      </footer>
    </div>
  );
};

const PromptCard = ({ icon, color, title, desc, onClick }: any) => (
    <div 
        onClick={onClick}
        className="group p-6 rounded-3xl bg-[#1a1a1f] border border-white/5 hover:border-blue-500/30 hover:bg-[#202026] transition-all cursor-pointer relative overflow-hidden h-full flex flex-col"
    >
        <div className="flex justify-between items-start mb-4">
            <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center text-2xl`}>
                {icon}
            </div>
            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </div>
        </div>
        <h4 className="font-bold text-white mb-2 text-lg group-hover:text-blue-400 transition-colors">{title}</h4>
        <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
    </div>
);
