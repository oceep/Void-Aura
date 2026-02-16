
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

interface AuthModalProps {
  onAuthSuccess: (user: any) => void;
  onGuestLogin?: () => void;
  onClose?: () => void;
  t: (key: string) => string;
  initialMode?: 'login' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({ onAuthSuccess, onGuestLogin, onClose, t, initialMode = 'login' }) => {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
      setIsLogin(initialMode === 'login');
  }, [initialMode]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isLogin) {
        // LOGIN LOGIC
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        if (data.user) {
            onAuthSuccess(data.user);
        }
      } else {
        // SIGN UP LOGIC
        if (!nickname.trim()) {
            throw new Error("Vui lòng nhập biệt danh (Nickname).");
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: nickname,
              display_name: nickname,
              name: nickname
            }
          }
        });
        
        if (error) throw error;
        
        // Auto login if session is created immediately (Supabase setting), otherwise show check email
        if (data.session) {
            onAuthSuccess(data.user);
        } else {
            setMessage("Đã gửi link xác nhận đến email. Vui lòng kiểm tra hộp thư (cả mục Spam).");
        }
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      if (err.message === "Failed to fetch") {
          setError("Lỗi kết nối. Vui lòng kiểm tra mạng hoặc thử lại sau.");
      } else {
          setError(err.message || "Đã xảy ra lỗi không xác định.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="bg-[#1e1e24] w-full max-w-sm rounded-2xl shadow-2xl p-5 border border-gray-700 animate-scale-in relative overflow-hidden">
        
        {/* Close Button (Only if onClose is provided) */}
        {onClose && (
            <button 
                onClick={onClose}
                className="absolute top-3 right-3 text-gray-500 hover:text-white transition-colors z-20"
                title="Đóng"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        )}

        {/* Decorative Background */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="text-center mb-4 relative z-10">
            <div className="w-10 h-10 mx-auto mb-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center border border-white/10 shadow-inner">
                {/* Oceep ID Logo - Inline SVG with 'O' */}
                <svg width="24" height="24" viewBox="0 0 100 100">
                    <defs>
                        <radialGradient id="authBubbleGradient" cx="0.3" cy="0.3" r="0.7">
                            <stop offset="0%" style={{stopColor:'rgb(220,240,255)', stopOpacity:1}} />
                            <stop offset="100%" style={{stopColor:'rgb(51, 149, 240)', stopOpacity:1}} />
                        </radialGradient>
                    </defs>
                    <circle cx="50" cy="50" r="45" fill="url(#authBubbleGradient)" stroke="rgba(255,255,255,0.7)" strokeWidth="3"/>
                    <path d="M 35 30 A 25 25 0 0 1 60 55" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="5" strokeLinecap="round"/>
                </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-1 tracking-tight">Oceep ID</h2>
            <p className="text-gray-400 text-xs">{isLogin ? "Đăng nhập để đồng bộ dữ liệu" : "Tạo tài khoản mới"}</p>
        </div>

        <div className="space-y-4 relative z-10">
            <form onSubmit={handleAuth} className="space-y-3">
                {/* Nickname Input (Only for Sign Up) */}
                {!isLogin && (
                    <div className="animate-fade-up">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">Biệt danh</label>
                        <input 
                            type="text" 
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            placeholder="Ví dụ: Mèo Ú..."
                            className="w-full bg-black/40 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition-all placeholder-gray-600"
                            required={!isLogin}
                        />
                    </div>
                )}

                <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">Email</label>
                    <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="email@example.com"
                        className="w-full bg-black/40 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition-all placeholder-gray-600"
                        required
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">Mật khẩu</label>
                    <div className="relative">
                        <input 
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-black/40 border border-gray-600 rounded-lg px-3 py-2 pr-10 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition-all placeholder-gray-600"
                            required
                            minLength={6}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-1"
                            tabIndex={-1}
                            title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                        >
                            {showPassword ? (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>

                {error && <div className="text-red-400 text-xs text-center bg-red-900/20 p-2 rounded-lg border border-red-900/50 animate-fade-in">{error}</div>}
                {message && <div className="text-emerald-400 text-xs text-center bg-emerald-900/20 p-2 rounded-lg border border-emerald-900/50 animate-fade-in">{message}</div>}

                <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-2.5 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm mt-2"
                >
                    {loading && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                    {isLogin ? 'Đăng Nhập' : 'Đăng Ký'}
                </button>
            </form>

            <div className="mt-3 flex flex-col gap-2 text-center relative z-10">
                <button 
                    onClick={() => { 
                        setIsLogin(!isLogin); 
                        setError(null); 
                        setMessage(null); 
                        setNickname('');
                        setShowPassword(false);
                    }}
                    className="text-gray-400 hover:text-white text-xs transition-colors"
                >
                    {isLogin ? "Chưa có tài khoản? " : "Đã có tài khoản? "}
                    <span className="text-blue-400 font-semibold underline decoration-blue-400/30 underline-offset-4">{isLogin ? "Đăng ký ngay" : "Đăng nhập"}</span>
                </button>

                {/* Guest Mode Button */}
                {onGuestLogin && (
                    <div className="pt-2 border-t border-gray-700">
                        <button
                            onClick={onGuestLogin}
                            className="text-xs font-medium text-gray-400 hover:text-white transition-colors flex items-center justify-center gap-1.5 w-full py-1.5 hover:bg-white/5 rounded-lg"
                        >
                            <span>👤</span> Tiếp tục với tư cách Khách
                        </button>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
