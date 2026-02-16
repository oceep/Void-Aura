
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
                            <stop offset="0%" style={{stopColor:'rgb(220,240,255)', stopOpacity:1