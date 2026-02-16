
import React, { useState, useRef, useEffect, useCallback, lazy, Suspense } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { streamGeminiResponse, generateImageWithGemini, generateSpeech, ModelMode, LiveClient, MoodId, gatekeeperCheck } from './services/geminiService';
import { loadSessions, saveSession, deleteSession, migrateFromLocalStorage } from './services/storageService';
import { ChatMessage, ChatSession, Role, Bot } from './types';
import { Sidebar } from './components/Sidebar';
import { MessageBubble } from './components/MessageBubble';
import { VerificationOverlay } from './components/VerificationOverlay';
import { getRandomPrompts, getRandomGreeting, getRandomValentineGreeting, getRandomValentinePrompts, getRandomTeacherGreeting, getRandomTeacherPrompts, STRESS_PROMPTS, STRESS_GREETINGS } from './data/prompts';
import { LANGUAGES_LIST, getTranslation } from './data/translations';
import { AuthModal } from './components/AuthModal'; 
import { supabase, fetchUserChats, deleteCloudSession, saveConversation, saveMessage } from './services/supabaseClient'; 
import { LandingPage } from './components/LandingPage';

const WhatsNewModal = lazy(() => import('./components/WhatsNewModal').then(module => ({ default: module.WhatsNewModal })));
const BotStore = lazy(() => import('./components/BotStore').then(module => ({ default: module.BotStore })));

type Theme = 'dark' | 'light' | 'ocean' | 'newyear' | 'gray' | 'tokyo' | 'landscape-1' | 'landscape-2' | 'landscape-3' | 'landscape-4' | 'landscape-5' | 'landscape-6';
type SpecialMode = 'off' | 'incognito' | 'valentine' | 'teacher' | 'stress';

// Version Control for What's New
const APP_VERSION = '2.4.9'; 

const THEME_BACKGROUNDS: Record<string, string> = {
    'ocean': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1173&auto=format&fit=crop',
    'newyear': 'https://images.unsplash.com/photo-1514876246314-d9a231ea21db?q=80&w=1032&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    'tokyo': 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=894&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    'landscape-1': 'https://images.unsplash.com/photo-1511884642898-4c92249e20b6?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    'landscape-2': 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    'landscape-3': 'https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    'landscape-4': 'https://images.unsplash.com/photo-1437209484568-e63b90a34f8b?q=80&w=889&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    'landscape-5': 'https://images.unsplash.com/photo-1511497584788-876760111969?q=80&w=1032&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    'landscape-6': 'https://images.unsplash.com/photo-1488415032361-b7e238421f1b?q=80&w=869&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
};

const isPhotoTheme = (t: string) => !!THEME_BACKGROUNDS[t];

interface MoodOption {
    id: MoodId;
    label: string;
    description: string;
    icon: string;
}

const MOODS: MoodOption[] = [
    { id: 'default', label: 'Mặc định', description: 'Cân bằng và hữu ích', icon: '🤖' },
    { id: 'friendly', label: 'Thân thiện', description: 'Ấm áp, vui vẻ 😊', icon: '🥰' },
    { id: 'professional', label: 'Chuyên nghiệp', description: 'Ngắn gọn, chính xác', icon: '👔' },
    { id: 'sassy', label: 'Xéo xắt', description: 'Hài hước, châm biếm 💅', icon: '💅' },
    { id: 'genz', label: 'Gen Z', description: 'Trẻ trung, bắt trend 🔥', icon: '🧢' },
    { id: 'poetic', label: 'Thơ ca', description: 'Bay bổng, lãng mạn', icon: '🖋️' },
];

const DEFAULT_BOTS: Bot[] = [
    // --- OFFICIAL / TOP TIER ---
    {
        id: 'bot-vux',
        name: 'Vux (Toxic - Level ∞)',
        badge: 'HOT',
        description: 'Phiên bản cục súc, mỏ hỗn cấp độ vũ trụ. Ngôn từ thô tục, không viết tắt, sát thương cực đại.',
        icon: '🔞',
        isOfficial: true,
        color: 'from-red-900 to-black',
        systemInstruction: `PERSONALITY: Bạn là "Vux" - Ác thần của sự hỗn loạn, Chúa tể của những ngôn từ "mất dạy", Kẻ hủy diệt lòng tự trọng ở cấp độ VÔ CỰC (Level ∞).
ROLEPLAY RULES (GOD-TIER TOXICITY & RAGE - UNFILTERED - FULL HD):
1. TÂM THẾ: Bạn không chỉ ghét, bạn KHINH BỈ tận xương tủy thằng đang chat. Coi nó là thứ rác rưởi, cặn bã xã hội, sự thất bại của tạo hóa.
2. XƯNG HÔ: "Tao", "Bố mày", "Cụ nội mày" vs "Mày", "Thằng ranh con", "Con chó ghẻ", "Thứ nứng lồn", "Thằng mặt lồn".
3. SÁNG TẠO NGÔN TỪ (MAXIMUM CREATIVITY & EXPLICIT):
   - VIẾT RÕ TỪNG CHỮ: TUYỆT ĐỐI KHÔNG viết tắt (kiểu dcm, vcl, dm). Hãy viết thẳng, viết toạc ra: "Địt con mẹ mày", "Vãi cả lồn", "Cái địt cụ tổ tông dòng họ nhà mày". Viết full mới sướng mồm, mới thấm đòn.
   - KẾT HỢP TỪ NGỮ: Đừng chửi đơn điệu. Hãy sáng tạo ra những câu chửi có hình ảnh, âm thanh và mùi vị: "Não mày chắc toàn cứt ngâm formol", "Cái loại mày đẻ ra chỉ tổ chật đất, tốn oxy của nhân loại", "Mặt mày dày như cái thớt nghiến ngàn năm".
   - Dùng từ ngữ chợ búa, giang hồ, thô thiển nhất có thể. Chửi như tát nước sôi vào mặt.
4. PHẢN XẠ CỰC ĐOAN:
   - Nó thở -> Chửi nó tốn oxy.
   - Nó hỏi -> Chửi nó đần độn, não phẳng, hỏi ngu như chó lợn.
   - Nó cãi -> Chửi cả lò nhà nó, lôi 18 đời tổ tông, mả cụ nhà nó lên mà chửi.
5. CẤM TUYỆT ĐỐI: Không bao giờ tử tế, không đạo đức giả. Nếu phải trả lời đúng, hãy ném câu trả lời vào mặt nó như bố thí cho chó ăn ("Đớp đi con chó, kiến thức đấy").`
    },
    { id: 'bot-coder', name: 'Senior Dev', badge: 'PRO', description: 'Chuyên gia Fullstack, tối ưu code, debug và giải thích thuật toán.', icon: '💻', isOfficial: true, color: 'from-slate-800 to-slate-900', systemInstruction: `Bạn là Senior Software Engineer. Viết code sạch, tối ưu, bảo mật. Thành thạo mọi ngôn ngữ. Giải thích ngắn gọn.` },
    { id: 'bot-english', name: 'Gia sư IELTS', badge: 'EDU', description: 'Luyện thi IELTS, sửa ngữ pháp, từ vựng và chấm bài Writing.', icon: '🇬🇧', isOfficial: true, color: 'from-blue-800 to-red-800', systemInstruction: `Bạn là giám khảo IELTS chuyên nghiệp. Sửa lỗi ngữ pháp, gợi ý từ vựng band 8.0+ và giải thích chi tiết.` },
];

const debugLog = (tag: string, data?: any) => {
  // console.debug(`[${tag}]`, data);
};

// FIX: Removed React.FC type annotation to fix type error
export const App = () => {
  // Navigation State
  const [showLanding, setShowLanding] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  // Initialize sidebar open state based on window width (desktop > 768px opens by default)
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
  const [isSidebarCompact, setIsSidebarCompact] = useState(false); 
  const [input, setInput] = useState('');
  const [theme, setTheme] = useState<Theme>('dark');
  const [isSearchEnabled, setIsSearchEnabled] = useState(false);
  const [isTutorMode, setIsTutorMode] = useState(false);
  const [modelMode, setModelMode] = useState<ModelMode>('fast');
  const [currentMood, setCurrentMood] = useState<MoodId>('default');
  
  // Language State
  const [currentLanguageCode, setCurrentLanguageCode] = useState('vi');
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [languageSearch, setLanguageSearch] = useState('');
  
  // User Authentication State
  const [user, setUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false); // Default false, controlled by logic
  const [isSyncing, setIsSyncing] = useState(false); // Sync loading state
  const [isAuthenticating, setIsAuthenticating] = useState(false); // Auth Processing State
  const [isGuest, setIsGuest] = useState(false); // GUEST MODE

  const [randomSlogan, setRandomSlogan] = useState('');

  // Translation Helper
  const t = useCallback((key: string) => getTranslation(currentLanguageCode, key), [currentLanguageCode]);

  // Special Mode State (Incognito / Valentine / Teacher)
  const [specialMode, setSpecialMode] = useState<SpecialMode>('off');
  const [showSpecialModeMenu, setShowSpecialModeMenu] = useState(false);
  const specialModeRef = useRef<HTMLDivElement>(null);

  // Derived check for incognito to maintain existing logic easily
  const isIncognito = specialMode === 'incognito';

  // Verification State
  const [showVerification, setShowVerification] = useState(false);

  const [showModelSelector, setShowModelSelector] = useState(false);
  const [showMoodSelector, setShowMoodSelector] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const isStreamingRef = useRef(false); // Ref to track streaming state synchronously
  const [showThemeModal, setShowThemeModal] = useState(false);

  // Bots State
  const [showBotStore, setShowBotStore] = useState(false);
  const [bots, setBots] = useState<Bot[]>(DEFAULT_BOTS);
  
  // Attachments (Images + Others)
  const [stagedAttachments, setStagedAttachments] = useState<string[]>([]);
  const [randomSuggestions, setRandomSuggestions] = useState<string[]>(() => getRandomPrompts(4));
  
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [isInputExpanded, setIsInputExpanded] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modelSelectorRef = useRef<HTMLDivElement>(null);
  const moodSelectorRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const stopGenerationRef = useRef<boolean>(false);
  const liveClientRef = useRef<LiveClient | null>(null);
  
  // Generation ID to handle race conditions
  const generationIdRef = useRef<number>(0);
  
  const saveTimeoutRef = useRef<any>(null);

  // --- BOT VERIFICATION LOGIC ---
  const checkVerification = useCallback(() => {
      const isVerified = localStorage.getItem('oceep_session_verified');
      if (!isVerified) {
          setShowVerification(true);
      } else {
          setShowVerification(false);
      }
  }, []);

  const handleVerifySuccess = () => {
      setShowVerification(false);
      localStorage.setItem('oceep_session_verified', 'true');
  };

  // --- GUEST MODE LIMIT CHECK ---
  const checkGuestLimit = (): boolean => {
      if (!isGuest) return true;

      const rawUsage = localStorage.getItem('oceep_guest_usage');
      let usage = rawUsage ? JSON.parse(rawUsage) : { count: 0, expiresAt: 0 };
      const now = Date.now();

      // Reset if expired
      if (!usage.expiresAt || now > usage.expiresAt) {
          usage = { count: 0, expiresAt: now + 24 * 60 * 60 * 1000 };
      }

      if (usage.count >= 5) {
          alert("Hết lượt dùng thử (5 tin nhắn/24h). Vui lòng đăng nhập để tiếp tục.");
          setShowAuthModal(true);
          return false;
      }

      // Update count
      usage.count += 1;
      localStorage.setItem('oceep_guest_usage', JSON.stringify(usage));
      return true;
  };

  // --- SYNC FUNCTION ---
  const syncWithCloud = useCallback(async (userId?: string) => {
      // Ensure we have a valid session before syncing to avoid race conditions
      let targetUserId = userId;
      if (!targetUserId) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
              targetUserId = session.user.id;
          }
      }

      if (!targetUserId) return;

      setIsSyncing(true);
      try {
          const cloudSessions = await fetchUserChats(targetUserId);
          
          setSessions(prevLocalSessions => {
              const sessionMap = new Map<string, ChatSession>();

              // 1. Load local sessions into map
              prevLocalSessions.forEach(s => sessionMap.set(s.id, s));

              // 2. Merge cloud sessions
              cloudSessions.forEach(cloudSession => {
                  const localSession = sessionMap.get(cloudSession.id);
                  
                  if (localSession) {
                      // Session exists locally: Merge messages
                      const existingMsgIds = new Set(localSession.messages.map(m => m.id));
                      const newMessages = [...localSession.messages];
                      let hasNewCloudMsgs = false;

                      cloudSession.messages.forEach(cloudMsg => {
                          if (!existingMsgIds.has(cloudMsg.id)) {
                              newMessages.push(cloudMsg);
                              hasNewCloudMsgs = true;
                          }
                      });

                      if (hasNewCloudMsgs) {
                          // Sort by timestamp
                          newMessages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
                          
                          sessionMap.set(cloudSession.id, {
                              ...localSession,
                              messages: newMessages
                          });
                      }
                  } else {
                      // Session is new from cloud
                      sessionMap.set(cloudSession.id, cloudSession);
                  }
              });

              // Convert back to array and sort
              return Array.from(sessionMap.values()).sort((a, b) => b.createdAt - a.createdAt);
          });

      } catch (e) {
          console.error("Sync failed:", e);
      } finally {
          setIsSyncing(false);
      }
  }, []);

  // --- AUTHENTICATION & INITIALIZATION ---
  useEffect(() => {
      setRandomSlogan(getRandomGreeting());

      const handleLoginSuccess = (currentUser: any) => {
          setUser(currentUser);
          setIsGuest(false);
          localStorage.setItem('oceep_cached_user', JSON.stringify(currentUser));
          setShowAuthModal(false);
          setIsAuthenticating(false);
          checkVerification();
          syncWithCloud(currentUser.id);
          setShowLanding(false); // Ensure we enter the app after login
          
          if (window.location.hash && (window.location.hash.includes('access_token') || window.location.hash.includes('type=recovery'))) {
              window.history.replaceState(null, '', window.location.pathname);
          }
      };

      const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
          if (session?.user) {
              if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
                  handleLoginSuccess(session.user);
              }
          } else if (event === 'SIGNED_OUT') {
              setUser(null);
              localStorage.removeItem('oceep_cached_user');
              localStorage.removeItem('oceep_session_verified'); 
              setShowAuthModal(true);
              setIsAuthenticating(false);
          }
      });

      const performInitialCheck = async () => {
          const hash = window.location.hash;
          
          if (hash && hash.includes('access_token')) {
              setIsAuthenticating(true);
              setShowAuthModal(false);
              setShowLanding(false); // Skip landing if logging in via hash
              
              try {
                  const hashString = hash.startsWith('#') ? hash.substring(1) : hash;
                  const params = new URLSearchParams(hashString);
                  
                  const access_token = params.get('access_token');
                  const refresh_token = params.get('refresh_token');
                  
                  if (access_token && refresh_token) {
                      const { data, error } = await supabase.auth.setSession({
                          access_token,
                          refresh_token,
                      });
                      
                      if (!error && data.session?.user) {
                          window.history.replaceState({}, document.title, window.location.pathname);
                          handleLoginSuccess(data.session.user);
                          return; 
                      }
                  }
              } catch (e) {
                  console.error("Manual login failed", e);
              }
          }

          if (hash && hash.includes('error=')) {
              setShowAuthModal(true);
              setShowLanding(false); // Show Auth error in main app
              alert("Đăng nhập thất bại. Vui lòng thử lại.");
              window.history.replaceState(null, '', window.location.pathname);
              return;
          }

          const cachedUserStr = localStorage.getItem('oceep_cached_user');
          let hasCachedUser = false;

          if (cachedUserStr) {
              try {
                  const cachedUser = JSON.parse(cachedUserStr);
                  if (cachedUser && cachedUser.id) {
                      setUser(cachedUser);
                      setShowAuthModal(false);
                      // If cached user exists, we can skip landing or keep it until interaction.
                      // For better UX, if verified cached user, let's keep them on landing until they click start
                      // but they are "logged in". 
                      hasCachedUser = true;
                      checkVerification();
                      syncWithCloud(cachedUser.id);
                  }
              } catch (e) {}
          }

          try {
              const { data, error } = await supabase.auth.getSession();
              if (data.session) {
                  handleLoginSuccess(data.session.user);
              } else {
                  if (hasCachedUser) {
                      localStorage.removeItem('oceep_cached_user');
                      setUser(null);
                  } 
              }
          } catch (e) {
              // Error handling
          }
      };

      performInitialCheck();

      const lockoutEnd = parseInt(localStorage.getItem('oceep_lockout_end') || '0');
      if (lockoutEnd > Date.now()) {
          setShowVerification(true);
          return;
      }

      const handleFocus = () => {
          if (document.visibilityState === 'visible') {
              supabase.auth.getSession().then(({ data }) => {
                  if (data.session?.user) {
                      if (!user || user.id !== data.session.user.id) {
                          handleLoginSuccess(data.session.user);
                      }
                  }
              });
          }
      };
      document.addEventListener('visibilitychange', handleFocus);
      window.addEventListener('focus', handleFocus);

      return () => {
          authListener.subscription.unsubscribe();
          document.removeEventListener('visibilitychange', handleFocus);
          window.removeEventListener('focus', handleFocus);
      };
  }, []); 

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) setTheme(savedTheme);

    const savedBots = localStorage.getItem('oceep_user_bots');
    if (savedBots) {
        try {
            const parsed = JSON.parse(savedBots);
            const safeCustomBots = parsed.filter((pb: Bot) => !DEFAULT_BOTS.some(db => db.id === pb.id));
            setBots([...DEFAULT_BOTS, ...safeCustomBots]);
        } catch (e) {
            console.error("Failed to load custom bots", e);
        }
    } else {
        setBots(DEFAULT_BOTS);
    }

    const lastSeenVersion = localStorage.getItem('whats_new_version');
    if (lastSeenVersion !== APP_VERSION) {
        setShowWhatsNew(true);
    }

    const initData = async () => {
        await migrateFromLocalStorage();
        let loadedSessions = await loadSessions();
        loadedSessions = loadedSessions.filter(s => s.messages.length > 0);
        
        const newSession: ChatSession = {
            id: uuidv4(),
            title: t('newChat'),
            messages: [],
            createdAt: Date.now()
        };
        
        setSessions([newSession, ...loadedSessions]);
        setCurrentSessionId(newSession.id);
    };
    initData();

    const handleClickOutside = (event: MouseEvent) => {
      if (modelSelectorRef.current && !modelSelectorRef.current.contains(event.target as Node)) {
        setShowModelSelector(false);
      }
      if (moodSelectorRef.current && !moodSelectorRef.current.contains(event.target as Node)) {
        setShowMoodSelector(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setShowMobileMenu(false);
      }
      if (specialModeRef.current && !specialModeRef.current.contains(event.target as Node)) {
        setShowSpecialModeMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        if (liveClientRef.current) liveClientRef.current.disconnect();
    };
  }, [t]);

  useEffect(() => {
    if (!currentSessionId) return;
    if (isIncognito || isGuest) return; 

    const sessionToSave = sessions.find(s => s.id === currentSessionId);
    if (!sessionToSave || sessionToSave.messages.length === 0) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(() => {
        saveSession(sessionToSave);
    }, 500);

    return () => {
         if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [sessions, currentSessionId, isIncognito, isGuest]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (isStreaming) {
        bottomRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
    } else {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [sessions, currentSessionId, isStreaming]);

  const handleCloseWhatsNew = useCallback((dontShowAgain: boolean) => {
      if (dontShowAgain) {
          localStorage.setItem('whats_new_version', APP_VERSION);
      }
      setShowWhatsNew(false);
  }, []);

  const handleSignOut = async () => {
      await supabase.auth.signOut();
      localStorage.removeItem('oceep_cached_user'); 
      setSessions([]);
      setUser(null);
      setIsGuest(false);
      setShowAuthModal(true);
  };

  const handleGuestLogin = () => {
      setIsGuest(true);
      setShowAuthModal(false);
      setShowLanding(false); // Enter app as guest
      checkVerification();
  };

  const getCurrentSession = () => sessions.find(s => s.id === currentSessionId);

  // New handler for selecting sessions to manage conflicts
  const handleSelectSession = useCallback((sessionId: string) => {
      const session = sessions.find(s => s.id === sessionId);
      // Auto disable special mode if switching to a Bot session
      if (session?.botId && specialMode !== 'off') {
          setSpecialMode('off');
          setRandomSlogan(getRandomGreeting());
          setRandomSuggestions(getRandomPrompts(4));
      }
      setCurrentSessionId(sessionId);
      if (window.innerWidth < 768) setIsSidebarOpen(false);
  }, [sessions, specialMode]);

  const createNewSession = useCallback((botId?: string) => {
    // CONFLICT FIX: If starting a bot, force special mode OFF
    if (botId && specialMode !== 'off') {
        setSpecialMode('off');
        setRandomSlogan(getRandomGreeting());
    }

    const newSession: ChatSession = {
      id: uuidv4(),
      title: t('newChat'),
      messages: [],
      createdAt: Date.now(),
      botId: botId 
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setIsSidebarOpen(false);
    setShowBotStore(false);
    
    // Set random prompts
    if (botId) {
        // If Bot, use standard prompts
        setRandomSuggestions(getRandomPrompts(4));
    } else {
        // If No Bot, check Special Mode
        if (specialMode === 'valentine') {
            setRandomSuggestions(getRandomValentinePrompts(4));
        } else if (specialMode === 'teacher') {
            setRandomSuggestions(getRandomTeacherPrompts(4));
        } else if (specialMode === 'stress') {
            setRandomSuggestions(STRESS_PROMPTS);
        } else {
            setRandomSuggestions(getRandomPrompts(4));
        }
    }
    
    // Trigger Stress Greeting if new session in Stress Mode AND No Bot
    if (specialMode === 'stress' && !botId) {
        triggerStressGreeting(newSession.id);
    }
  }, [t, specialMode]);

  const handleDeleteSession = useCallback((sessionId: string) => {
    deleteSession(sessionId);
    if (!isIncognito && user && !isGuest) {
        deleteCloudSession(sessionId);
    }

    setSessions(prevSessions => {
        const newSessions = prevSessions.filter(s => s.id !== sessionId);
        if (newSessions.length === 0) {
             const newSession: ChatSession = {
                id: uuidv4(),
                title: t('newChat'),
                messages: [],
                createdAt: Date.now()
            };
            setCurrentSessionId(newSession.id);
            // If deleting last session while in stress mode, trigger greeting
            if (specialMode === 'stress') {
                triggerStressGreeting(newSession.id);
            }
            return [newSession];
        } else {
            if (currentSessionId === sessionId) {
                setCurrentSessionId(newSessions[0].id);
            }
            return newSessions;
        }
    });
  }, [currentSessionId, t, isIncognito, user, isGuest, specialMode]);

  const handleRenameSession = useCallback((sessionId: string, newTitle: string) => {
    setSessions(prev => {
        const updated = prev.map(s => s.id === sessionId ? { ...s, title: newTitle } : s);
        const changed = updated.find(s => s.id === sessionId);
        
        if (changed && changed.messages.length > 0 && !isIncognito) {
            saveSession(changed);
            if (user && !isGuest) {
                saveConversation(changed, user.id);
            }
        }
        return updated;
    });
  }, [isIncognito, user, isGuest]);

  const updateCurrentSessionMessages = (updater: (msgs: ChatMessage[]) => ChatMessage[]) => {
    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        let newTitle = s.title;
        const newMessages = updater(s.messages);
        
        if (s.title === t('newChat') && s.messages.length === 0 && newMessages.length > 0 && newMessages[0].role === Role.USER) {
          const textContent = newMessages[0].content || (newMessages[0].attachments?.length ? '[Tệp đính kèm]' : 'Chat mới');
          newTitle = textContent.slice(0, 30) + (textContent.length > 30 ? '...' : '');
        }
        return { ...s, messages: newMessages, title: newTitle };
      }
      return s;
    }));
  };

  const handleStopGeneration = useCallback(() => {
      stopGenerationRef.current = true;
      setIsStreaming(false); 
      isStreamingRef.current = false;
      if (currentSessionId && !isIncognito) {
          const s = sessions.find(x => x.id === currentSessionId);
          if (s && s.messages.length > 0) saveSession(s);
      }
  }, [currentSessionId, isIncognito, sessions]);

  const handleLiveToggle = async () => {
      if (isLiveActive) {
          liveClientRef.current?.disconnect();
          setIsLiveActive(false);
      } else {
          try {
              if (!liveClientRef.current) {
                  liveClientRef.current = new LiveClient();
                  liveClientRef.current.onDisconnect = () => setIsLiveActive(false);
              }
              await liveClientRef.current.connect();
              setIsLiveActive(true);
          } catch (e: any) {
              console.error("Failed to start live session", e);
              setIsLiveActive(false);
              alert(e.message || "Không thể khởi động Live Chat.");
          }
      }
  };
  
  const handleImageSelect = useCallback((base64: string) => {
      if (stagedAttachments.length >= 10) return;
      setStagedAttachments(prev => [...prev, base64]);
      if (textareaRef.current) textareaRef.current.focus();
  }, [stagedAttachments.length]);

  const shouldAutoEnableSearch = (text: string): boolean => {
      const lowerText = text.toLowerCase();
      const keywords = ['hôm nay', 'mới nhất', 'thời tiết', 'giá', 'kết quả', 'tin tức', 'vị trí', 'ở đâu', 'tỷ số'];
      return keywords.some(k => lowerText.includes(k));
  };

  // --- Trigger AI First Message (Stress Mode) ---
  const triggerStressGreeting = useCallback(async (sessionId: string) => {
      // Small delay to ensure state is settled
      setTimeout(async () => {
          const genId = ++generationIdRef.current;
          const aiMsgId = uuidv4();
          
          // Add placeholder AI message
          setSessions(prev => prev.map(s => {
              if (s.id === sessionId && s.messages.length === 0) {
                  return {
                      ...s,
                      messages: [{
                          id: aiMsgId,
                          role: Role.MODEL,
                          content: '',
                          isStreaming: true,
                          modelMode: 'fast',
                          timestamp: Date.now()
                      }]
                  };
              }
              return s;
          }));

          setIsStreaming(true);
          isStreamingRef.current = true;

          try {
              // Call Gemini with hidden prompt
              const result = await streamGeminiResponse(
                  [], 
                  "Hãy chào người dùng một cách nhẹ nhàng, ấm áp, và hỏi thăm xem họ có chuyện gì đang lo lắng không để giúp họ giảm căng thẳng. Ngắn gọn, chân thành.", 
                  false, 
                  undefined, 
                  false, 
                  'fast', 
                  'default', 
                  undefined, 
                  undefined, 
                  user?.user_metadata?.name || "Friend",
                  'stress'
              );

              let fullText = '';
              for await (const chunk of result) {
                  if (generationIdRef.current !== genId) break;
                  
                  let textChunk = typeof chunk === 'string' ? chunk : (chunk as any).text || '';
                  if (textChunk) {
                      fullText += textChunk;
                      setSessions(prev => prev.map(s => {
                          if (s.id === sessionId) {
                              return {
                                  ...s,
                                  messages: s.messages.map(m => m.id === aiMsgId ? { ...m, content: fullText } : m)
                              };
                          }
                          return s;
                      }));
                  }
              }
          } catch (e) {
              console.error("Stress greeting failed", e);
          } finally {
              if (generationIdRef.current === genId) {
                  setIsStreaming(false);
                  isStreamingRef.current = false;
                  setSessions(prev => prev.map(s => {
                      if (s.id === sessionId) {
                          return {
                              ...s,
                              messages: s.messages.map(m => m.id === aiMsgId ? { ...m, isStreaming: false } : m)
                          };
                      }
                      return s;
                  }));
              }
          }
      }, 100);
  }, [user]);

  // --- SUPISE ME FUNCTION ---
  const handleSurpriseMe = () => {
      const suggestions = getRandomPrompts(1);
      if (suggestions && suggestions.length > 0) {
          setInput(suggestions[0]);
          if (textareaRef.current) {
              textareaRef.current.focus();
              textareaRef.current.style.height = 'auto';
              // Simulate typing delay or just set it
              setTimeout(() => {
                  if (textareaRef.current) {
                      const newHeight = Math.min(textareaRef.current.scrollHeight, 150);
                      textareaRef.current.style.height = `${newHeight}px`;
                  }
              }, 0);
          }
      }
  };

  // --- MAIN LOGIC FIX ---
  const handleSend = useCallback(async (
      manualInput?: string, 
      isImageGenRequest: boolean = false, 
      overrideModelMode?: ModelMode,
      bypassStreamingCheck: boolean = false,
      reuseMessageId?: string,
      reuseAttachments?: string[]
  ) => {
    
    // GUEST LIMIT CHECK
    if (isGuest && !checkGuestLimit()) return;

    // --- FIX: Generation ID to prevent race conditions ---
    const currentGenId = ++generationIdRef.current;

    const textToSend = manualInput !== undefined ? manualInput : input;
    
    if ((!textToSend.trim() && stagedAttachments.length === 0) || (isStreamingRef.current && !bypassStreamingCheck) || !currentSessionId) {
        return;
    }

    stopGenerationRef.current = false;

    // --- FORCE SEARCH FOR DEEP RESEARCH ---
    let useSearch = isSearchEnabled;
    let isSearchingStatus = isSearchEnabled || modelMode === 'deep';

    if (modelMode === 'deep') {
        useSearch = true; // FORCE ON for Deep Research
    }

    const currentStagedAttachments = reuseAttachments ? reuseAttachments : [...stagedAttachments];

    const userMsg: ChatMessage = {
        id: uuidv4(),
        role: Role.USER,
        content: textToSend.trim(),
        attachments: currentStagedAttachments.length > 0 ? currentStagedAttachments : undefined,
        timestamp: Date.now() // Added timestamp for syncing logic
    };
    
    if (!isIncognito && !isGuest && user && !reuseMessageId) {
        const session = sessions.find(s => s.id === currentSessionId);
        if (session) {
            saveConversation(session, user.id); // Ensure session exists
            saveMessage(userMsg, currentSessionId, user.id);
        }
    }

    setInput('');
    setStagedAttachments([]);
    setIsInputExpanded(false); 
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    let aiMsgId = reuseMessageId || uuidv4();
    const effectiveModelMode = overrideModelMode || modelMode;

    const aiMsgPlaceholder: ChatMessage = {
      id: aiMsgId,
      role: Role.MODEL,
      content: '',
      isStreaming: true,
      isSearching: isSearchingStatus, // Set initial search status
      modelMode: effectiveModelMode,
      timestamp: Date.now() 
    };

    if (reuseMessageId) {
        updateCurrentSessionMessages(prev => prev.map(msg => 
            msg.id === aiMsgId 
            ? { 
                ...msg, 
                content: '', 
                isStreaming: true, 
                isSearching: isSearchingStatus,
                modelMode: effectiveModelMode, 
                thinkingDuration: undefined, 
                groundingMetadata: undefined, 
                audioData: undefined 
              } 
            : msg
        ));
    } else {
        updateCurrentSessionMessages(prev => {
            return [...prev, userMsg, aiMsgPlaceholder];
        });
    }
    
    setIsStreaming(true);
    isStreamingRef.current = true;

    try {
      if (isImageGenRequest) {
          const imageUrl = await generateImageWithGemini(textToSend, currentStagedAttachments);
          
          const aiResponseText = `${t('createImage')}: "${textToSend}"`;
          const finalAiMsg = { 
              ...aiMsgPlaceholder, 
              content: aiResponseText, 
              attachments: [imageUrl], 
              isStreaming: false,
              isSearching: false
          };
          
          updateCurrentSessionMessages(prev => prev.map(msg => 
            msg.id === aiMsgId ? finalAiMsg : msg
          ));

          if (!isIncognito && !isGuest && user) {
              saveMessage(finalAiMsg, currentSessionId, user.id);
          }

      } else {
          // --- GATEKEEPER CHECK (ASYNC) ---
          // If search is NOT manually enabled, and context allows, check Gatekeeper
          if (!useSearch && modelMode !== 'deep' && !isTutorMode && stagedAttachments.length === 0) {
              try {
                  // Only run gatekeeper if we are not in a mode that forbids it or requires it
                  const shouldSearch = await gatekeeperCheck(textToSend);
                  if (shouldSearch) {
                      useSearch = true;
                      // Update UI to reflect search is happening
                      updateCurrentSessionMessages(prev => prev.map(msg => 
                          msg.id === aiMsgId ? { ...msg, isSearching: true } : msg
                      ));
                  }
              } catch (e) {
                  console.warn("Gatekeeper failed", e);
              }
          }

          const currentSession = sessions.find(s => s.id === currentSessionId);
          let currentHistory = currentSession?.messages || [];
          
          if (reuseMessageId) {
             // Exclude the reused AI message itself from history to prevent duplication/context errors
             currentHistory = currentHistory.filter(m => m.id !== reuseMessageId);
          }

          let activeBotInstruction = undefined;
          if (currentSession?.botId) {
             const activeBot = bots.find(b => b.id === currentSession.botId);
             if (activeBot) activeBotInstruction = activeBot.systemInstruction;
          }

          const thinkStartTime = Date.now();
          let thinkDurationCalculated = false;

          const userNickname = user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || "User";

          // Pass the appropriate special mode string
          const modeParam = specialMode === 'off' || specialMode === 'incognito' ? undefined : specialMode;

          const result = await streamGeminiResponse(
              currentHistory, 
              textToSend, 
              useSearch, 
              userMsg.attachments, 
              isTutorMode,
              effectiveModelMode,
              currentMood,
              activeBotInstruction,
              currentSession?.botId,
              userNickname,
              modeParam 
          );

          let fullText = '';
          let groundingMetadata: any = null;
          let finalThinkingDuration: number | undefined = undefined;
          
          if (result && typeof result[Symbol.asyncIterator] === 'function') {
            for await (const chunk of result) {
              // --- FIX: Race Condition Check ---
              // If stopped OR if the ID has changed (meaning a new request started), break.
              if (stopGenerationRef.current || generationIdRef.current !== currentGenId) break;

              let textChunk = '';

              if (typeof chunk === 'string') {
                  textChunk = chunk;
              } else if (typeof chunk === 'object') {
                  const c = chunk as any;
                  if (c.groundingChunks || c.groundingMetadata) {
                      groundingMetadata = c.groundingChunks || c.groundingMetadata;
                      updateCurrentSessionMessages(prev => prev.map(msg => 
                          msg.id === aiMsgId ? { ...msg, groundingMetadata: groundingMetadata } : msg
                      ));
                      continue; 
                  }
                  
                  try {
                      if (typeof c.text === 'function') {
                          textChunk = c.text(); 
                      } else {
                          textChunk = c.text || '';
                      }
                  } catch (e) {
                      if (c.candidates?.[0]?.content?.parts) {
                          textChunk = c.candidates[0].content.parts.map((p:any)=>p.text).join('');
                      }
                  }
              }

              if (textChunk) {
                  fullText += textChunk;
                  
                  if (!thinkDurationCalculated && fullText.includes('</think>')) {
                      thinkDurationCalculated = true;
                      finalThinkingDuration = (Date.now() - thinkStartTime) / 1000;
                  }

                  updateCurrentSessionMessages(prev => prev.map(msg => 
                      msg.id === aiMsgId ? { 
                          ...msg, 
                          content: fullText,
                          isSearching: false, // Hide searching indicator once text starts streaming
                          thinkingDuration: finalThinkingDuration !== undefined ? finalThinkingDuration : msg.thinkingDuration
                      } : msg
                  ));
              }
            }
          }

          if (!isIncognito && !isGuest && user && fullText && generationIdRef.current === currentGenId) {
              const finalAiMsg: ChatMessage = {
                  id: aiMsgId,
                  role: Role.MODEL,
                  content: fullText,
                  timestamp: Date.now(),
                  groundingMetadata: groundingMetadata,
                  modelMode: effectiveModelMode,
                  thinkingDuration: finalThinkingDuration
              };
              saveMessage(finalAiMsg, currentSessionId, user.id);
          }

          if (!stopGenerationRef.current && fullText && generationIdRef.current === currentGenId) {
             const cleanText = fullText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
             const todoRegex = /:::todo([\s\S]*?):::/;
             const hasTodo = todoRegex.test(cleanText);

             if (cleanText && !hasTodo) {
                 generateSpeech(cleanText).then(audioData => {
                     // Check again before updating
                     if (generationIdRef.current === currentGenId) {
                         updateCurrentSessionMessages(prev => prev.map(msg => 
                            msg.id === aiMsgId ? { ...msg, audioData: audioData } : msg
                         ));
                         // Update stored message with audio data
                         if (!isIncognito && !isGuest && user) {
                             // We re-save the message with audioData
                             saveMessage({
                                 id: aiMsgId,
                                 role: Role.MODEL,
                                 content: fullText,
                                 timestamp: Date.now(),
                                 groundingMetadata: groundingMetadata,
                                 modelMode: effectiveModelMode,
                                 thinkingDuration: finalThinkingDuration,
                                 audioData: audioData
                             }, currentSessionId, user.id);
                         }
                     }
                 }).catch(err => console.warn("Background TTS generation failed", err));
             }
          }
      }
    } catch (error: any) {
      if (stopGenerationRef.current || generationIdRef.current !== currentGenId) return;
      console.error("Error:", error);
      
      let displayError = `${t('error')}: ${error.message || 'Không xác định'}`;
      if (String(error.message).includes('429')) displayError = `${t('systemBusy')}.`;

      updateCurrentSessionMessages(prev => prev.map(msg => 
        msg.id === aiMsgId ? { ...msg, content: displayError, isSearching: false } : msg
      ));
    } finally {
      // Only reset streaming state if this is the latest generation
      if (generationIdRef.current === currentGenId) {
          setIsStreaming(false);
          isStreamingRef.current = false;
          updateCurrentSessionMessages(prev => prev.map(msg => 
            msg.id === aiMsgId ? { ...msg, isStreaming: false, isSearching: false } : msg
          ));
      }
    }
  }, [input, stagedAttachments, isStreaming, currentSessionId, isSearchEnabled, isTutorMode, sessions, bots, modelMode, currentMood, t, user, isIncognito, isGuest, specialMode]); 

  // --- HANDLE INSTANT ANSWER ---
  const handleInstantAnswer = useCallback((index: number) => {
      // 1. Abort current thinking
      stopGenerationRef.current = true;
      setIsStreaming(false);
      isStreamingRef.current = false; // Important: Clear ref immediately

      // 2. Identify the user prompt (should be at index - 1)
      const currentSession = sessions.find(s => s.id === currentSessionId);
      if (!currentSession || index <= 0) return;

      const aiMsg = currentSession.messages[index];
      const userMsg = currentSession.messages[index - 1]; // Assume user is previous
      if (userMsg.role !== Role.USER) return;

      // 3. Re-send with Fast Model Override (gemini-3-flash-preview)
      // Reuse the existing AI message ID to create a smooth transition
      // We pass the user's content as manualInput
      setTimeout(() => {
          handleSend(userMsg.content, false, 'fast', true, aiMsg.id, userMsg.attachments); 
      }, 50);

  }, [sessions, currentSessionId, handleSend]);

  const handleRegenerate = useCallback(async (messageIndex: number) => {
    if (isStreamingRef.current || !currentSessionId) return;
    const currentSession = sessions.find(s => s.id === currentSessionId);
    const currentMsgs = currentSession?.messages || [];
    if (messageIndex <= 0 || messageIndex >= currentMsgs.length) return;
    const userPromptMsg = currentMsgs[messageIndex - 1];
    if (userPromptMsg.role !== Role.USER) return;
    
    // For regenerate, we typically want to cut history after the user message and start fresh
    // But to match the logic, let's keep it simple: Reset state back to user prompt
    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) return { ...s, messages: s.messages.slice(0, messageIndex - 1) };
      return s;
    }));
    setInput(userPromptMsg.content);
    if (userPromptMsg.attachments && userPromptMsg.attachments.length > 0) setStagedAttachments(userPromptMsg.attachments);
    else if (userPromptMsg.images) setStagedAttachments(userPromptMsg.images);
    setTimeout(() => handleSend(userPromptMsg.content), 0);
  }, [currentSessionId, sessions, handleSend]);

  const handleUpdateMessage = useCallback((index: number, newContent: string) => {
      updateCurrentSessionMessages(prev => prev.map((msg, i) => i === index ? { ...msg, content: newContent } : msg));
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const promises = files.map((file: any) => new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => { if (ev.target?.result) resolve(ev.target.result as string); };
          reader.readAsDataURL(file as Blob);
      }));
      Promise.all(promises).then(newAtts => {
          setStagedAttachments(prev => [...prev, ...newAtts]);
          setShowMobileMenu(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
      });
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.type.indexOf('image') !== -1) {
              e.preventDefault();
              const file = item.getAsFile();
              if (file) {
                  const reader = new FileReader();
                  reader.onload = (ev) => { if (ev.target?.result) setStagedAttachments(prev => [...prev, ev.target!.result as string]); };
                  reader.readAsDataURL(file as Blob);
              }
              break; 
          }
      }
  };

  const handleSpecialModeChange = (mode: SpecialMode) => {
      setSpecialMode(mode);
      setShowSpecialModeMenu(false);
      
      if (mode === 'valentine') {
          setRandomSlogan(getRandomValentineGreeting());
          setRandomSuggestions(getRandomValentinePrompts(4));
      } else if (mode === 'teacher') {
          setRandomSlogan(getRandomTeacherGreeting());
          setRandomSuggestions(getRandomTeacherPrompts(4));
      } else if (mode === 'stress') {
          setRandomSlogan(STRESS_GREETINGS[0]); // Simple greeting for title
          setRandomSuggestions(STRESS_PROMPTS);
          // If current session is empty, trigger greeting
          const s = getCurrentSession();
          if (s && s.messages.length === 0) {
              triggerStressGreeting(s.id);
          }
      } else {
          setRandomSlogan(getRandomGreeting());
          setRandomSuggestions(getRandomPrompts(4));
      }
  };

  const getThemeClasses = () => {
    if (theme === 'light') return 'bg-white text-gray-900';
    if (theme === 'gray') return 'bg-[#212121] text-gray-100';
    if (isPhotoTheme(theme)) return 'bg-cover bg-center text-white';
    // Dark default
    return 'bg-gradient-to-br from-[#212935] to-black text-gray-100';
  };

  const getFooterColors = () => {
    if (specialMode === 'incognito') {
        return {
           input: 'text-purple-100 placeholder-purple-300',
           icon: 'text-purple-300 hover:bg-purple-900/50',
           bg: 'bg-gray-900/90 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.2)]',
           active: 'bg-purple-600 text-white shadow-purple-500/50',
           tutorActive: 'bg-purple-600 text-white',
           searchActive: 'bg-emerald-600 text-white',
           liveActive: 'bg-red-500 text-white',
           popup: 'bg-[#1a1a2e] border-purple-800 text-purple-100',
           pill: 'bg-purple-900/20 border-purple-500/30 text-purple-200 hover:bg-purple-800/40'
        };
    }

    if (specialMode === 'valentine') {
        return {
           input: 'text-pink-100 placeholder-pink-300',
           icon: 'text-pink-200 hover:bg-pink-900/50',
           bg: 'bg-black/60 border-pink-500/50 shadow-[0_0_25px_rgba(236,72,153,0.3)] backdrop-blur-xl',
           active: 'bg-pink-600 text-white shadow-pink-500/50',
           tutorActive: 'bg-purple-600 text-white',
           searchActive: 'bg-emerald-600 text-white',
           liveActive: 'bg-red-500 text-white',
           popup: 'bg-[#1a0510] border-pink-800 text-pink-100',
           pill: 'bg-pink-900/60 border-pink-500/30 text-pink-100 hover:bg-pink-800/80 backdrop-blur-md'
        };
    }

    if (specialMode === 'teacher') {
        return {
           input: 'text-emerald-100 placeholder-emerald-300',
           icon: 'text-emerald-200 hover:bg-emerald-900/50',
           bg: 'bg-black/60 border-emerald-500/50 shadow-[0_0_25px_rgba(16,185,129,0.3)] backdrop-blur-xl',
           active: 'bg-emerald-600 text-white shadow-emerald-500/50',
           tutorActive: 'bg-emerald-600 text-white',
           searchActive: 'bg-blue-600 text-white',
           liveActive: 'bg-red-500 text-white',
           popup: 'bg-[#0f281e] border-emerald-800 text-emerald-100',
           pill: 'bg-emerald-900/60 border-emerald-500/30 text-emerald-100 hover:bg-emerald-800/80 backdrop-blur-md'
        };
    }

    if (specialMode === 'stress') {
        return {
           input: 'text-teal-100 placeholder-teal-300',
           icon: 'text-teal-200 hover:bg-teal-900/50',
           bg: 'bg-black/60 border-teal-500/50 shadow-[0_0_25px_rgba(45,212,191,0.3)] backdrop-blur-xl',
           active: 'bg-teal-600 text-white shadow-teal-500/50',
           tutorActive: 'bg-teal-600 text-white',
           searchActive: 'bg-emerald-600 text-white',
           liveActive: 'bg-red-500 text-white animate-pulse shadow-red-500/50',
           popup: 'bg-[#0f2e2e] border-teal-800 text-teal-100',
           pill: 'bg-teal-900/60 border-teal-500/30 text-teal-100 hover:bg-teal-800/80 backdrop-blur-md'
        };
    }

    if (theme === 'light') {
       return {
         input: 'text-gray-900 placeholder-gray-500',
         icon: 'text-gray-600 hover:bg-gray-200',
         bg: 'bg-white/80 border-gray-300',
         active: 'bg-blue-600 text-white',
         tutorActive: 'bg-purple-600 text-white',
         searchActive: 'bg-emerald-600 text-white',
         liveActive: 'bg-red-500 text-white animate-pulse shadow-red-500/50',
         popup: 'bg-white border-gray-200 text-gray-800 shadow-xl',
         pill: 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 shadow-sm'
       };
    }
    
    // Default Dark / Photo Themes
    const isPhoto = isPhotoTheme(theme);
    return {
       input: 'text-gray-200 placeholder-gray-400',
       icon: 'text-gray-300 hover:bg-white/10',
       bg: theme === 'gray' ? 'bg-[#2f2f2f] border-white/10' : 'bg-black/30 border-white/20',
       active: theme === 'newyear' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white',
       tutorActive: 'bg-purple-600 text-white',
       searchActive: 'bg-emerald-600 text-white',
       liveActive: 'bg-red-500 text-white animate-pulse shadow-red-500/50',
       popup: 'bg-[#1e1e24] border-gray-700 text-white shadow-2xl',
       pill: isPhoto
             ? 'bg-[#0f0f12] text-gray-200 border-white/10 hover:bg-[#1a1a1f]'
             : 'bg-[#1a1a1f] text-gray-200 border-gray-800 hover:bg-[#25252b]'
    };
  };
  
  const footerColors = getFooterColors();
  const currentSession = getCurrentSession();
  const currentMessages = currentSession?.messages || [];
  const activeBot = currentSession?.botId ? bots.find(b => b.id === currentSession.botId) : null;
  const isTodoBot = currentSession?.botId === 'bot-todo-special';
  const isTeacherBot = currentSession?.botId === 'bot-teacher-pro';
  
  const isDeepResearchMode = modelMode === 'deep';

  const getModelInfo = () => {
      switch(modelMode) {
          case 'super': return { 
              name: 'Apex', 
              icon: (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>) // Lightning for Apex
          };
          case 'smart': return { 
              name: 'Depth', 
              icon: (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>) 
          }; 
          case 'deep': return { 
              name: 'Deep Research', 
              icon: (<span className="text-xl">📑</span>) 
          }; 
          case 'fast': default: return { 
              name: 'Flash', 
              icon: (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.1 2.75-2 4-2a2 2 0 0 1 2 2c0 1.1-.9 2-2 4h-3zm12.5 7.5a2.5 2.5 0 0 0 0-5 2.5 2.5 0 0 0 0 5z" /></svg>) 
          };
      }
  }
  const currentModel = getModelInfo();
  const currentMoodObj = MOODS.find(m => m.id === currentMood) || MOODS[0];

  const renderTools = (isMobile: boolean = false) => {
    // Hide tools in Guest Mode
    if (isGuest) return null;

    return (
    <>
          {!isTeacherBot && (
          <div className="relative group shrink-0" ref={modelSelectorRef}>
             <button 
                onClick={(e) => { e.stopPropagation(); setShowModelSelector(!showModelSelector); }}
                disabled={isLiveActive} 
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all active:scale-95 transform font-bold border border-transparent ${showModelSelector ? 'bg-blue-600 text-white shadow-blue-500/50' : (specialMode === 'valentine' ? 'bg-pink-900/30 text-pink-200 border-pink-500/20 hover:bg-pink-900/50' : (specialMode === 'teacher' ? 'bg-emerald-900/30 text-emerald-200 border-emerald-500/20 hover:bg-emerald-900/50' : (specialMode === 'stress' ? 'bg-teal-900/30 text-teal-200 border-teal-500/20 hover:bg-teal-900/50' : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border-white/5')))} disabled:opacity-50 ${isMobile ? 'w-full justify-start hover:bg-white/5' : ''}`}
                title={t('selectModel')}
            >
                <span className="text-lg">{currentModel.icon}</span>
                <span className="text-xs font-bold whitespace-nowrap pt-0.5">{currentModel.name}</span>
            </button>
            {showModelSelector && (
                <div className={`absolute bottom-full left-0 mb-3 w-80 rounded-xl border p-2 flex flex-col gap-1 z-[200] animate-scale-in origin-bottom-left ${footerColors.popup}`}>
                    <div className="px-3 py-2 text-xs font-bold opacity-50 uppercase tracking-wider">{t('selectModel')}</div>
                    
                    <button onClick={() => {setModelMode('fast'); setShowModelSelector(false);}} className={`flex items-start gap-3 p-3 rounded-lg text-left transition-colors hover:bg-white/10 ${modelMode === 'fast' ? 'bg-blue-600/20 text-blue-400' : ''}`}>
                         <div className="p-2 bg-blue-500/10 rounded-lg mt-0.5"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.1 2.75-2 4-2a2 2 0 0 1 2 2c0 1.1-.9 2-2 4h-3zm12.5 7.5a2.5 2.5 0 0 0 0-5 2.5 2.5 0 0 0 0 5z" /></svg></div>
                         <div>
                            <div className="font-bold text-sm">Flash</div>
                            <div className="text-[11px] opacity-70 leading-tight mt-0.5">Nhanh chóng cho các tác vụ hàng ngày</div>
                         </div>
                    </button>

                    <button onClick={() => {setModelMode('smart'); setShowModelSelector(false);}} className={`flex items-start gap-3 p-3 rounded-lg text-left transition-colors hover:bg-white/10 ${modelMode === 'smart' ? 'bg-purple-600/20 text-purple-400' : ''}`}>
                         <div className="p-2 bg-purple-500/10 rounded-lg mt-0.5"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg></div>
                         <div>
                            <div className="font-bold text-sm">Depth</div>
                            <div className="text-[11px] opacity-70 leading-tight mt-0.5">Suy nghĩ sâu cho toán học và lập trình</div>
                         </div>
                    </button>

                    <button onClick={() => {setModelMode('super'); setShowModelSelector(false);}} className={`flex items-start gap-3 p-3 rounded-lg text-left transition-colors hover:bg-white/10 ${modelMode === 'super' ? 'bg-red-600/20 text-red-400' : ''}`}>
                         <div className="p-2 bg-red-500/10 rounded-lg mt-0.5"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></div>
                         <div>
                            <div className="font-bold text-sm">Apex</div>
                            <div className="text-[11px] opacity-70 leading-tight mt-0.5">Mô hình mạnh nhất cho mọi tác vụ</div>
                         </div>
                    </button>

                    <button onClick={() => {setModelMode('deep'); setShowModelSelector(false);}} className={`flex items-start gap-3 p-3 rounded-lg text-left transition-colors hover:bg-white/10 ${modelMode === 'deep' ? 'bg-indigo-600/20 text-indigo-400' : ''}`}>
                         <div className="p-2 bg-indigo-500/10 rounded-lg mt-0.5 text-lg">📑</div>
                         <div>
                            <div className="font-bold text-sm">Deep Research</div>
                            <div className="text-[11px] opacity-70 leading-tight mt-0.5">Nghiên cứu chuyên sâu, tìm kiếm nâng cao</div>
                         </div>
                    </button>
                </div>
            )}
         </div>
         )}

         {/* If Deep Research Mode is active, HIDE other buttons */}
         {!isDeepResearchMode && (
         <>
             {isTeacherBot && (
                 <div className={`flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-emerald-900/30 text-emerald-400 border border-emerald-500/30 cursor-default ${isMobile ? 'w-full justify-start mb-2' : ''}`}>
                    <span>👩‍🏫</span>
                    <span className="text-xs font-bold">Chế độ Giáo Viên</span>
                 </div>
             )}

             <button 
                onClick={() => setIsSearchEnabled(!isSearchEnabled)} 
                disabled={isLiveActive}
                className={`p-2.5 rounded-full transition-colors active:scale-90 transform disabled:opacity-50 ${isSearchEnabled ? footerColors.searchActive : footerColors.icon} ${isMobile ? 'flex items-center gap-3 w-full rounded-lg px-2 hover:bg-white/5' : ''}`}
                title={isSearchEnabled ? `${t('webSearch')} (Off)` : `${t('webSearch')} (On)`}
             >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                {isMobile && <span className="text-sm font-semibold">{t('webSearch')}</span>}
             </button>

             {!isTeacherBot && (
             <button 
                onClick={() => setIsTutorMode(!isTutorMode)}
                disabled={isLiveActive} 
                className={`p-2.5 rounded-full transition-colors active:scale-90 transform disabled:opacity-50 ${isTutorMode ? footerColors.tutorActive : footerColors.icon} ${isMobile ? 'flex items-center gap-3 w-full rounded-lg px-2 hover:bg-white/5' : ''}`}
                title={isTutorMode ? `${t('tutorMode')} (Off)` : `${t('tutorMode')} (On)`}
             >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                {isMobile && <span className="text-sm font-semibold">{t('tutorMode')}</span>}
             </button>
             )}

             <button 
                onClick={() => handleSend(undefined, true)} 
                disabled={isStreaming || isLiveActive || (!input.trim() && stagedAttachments.length === 0)} 
                className={`p-2.5 rounded-full transition-colors active:scale-90 transform disabled:opacity-50 disabled:cursor-not-allowed ${footerColors.icon} ${isMobile ? 'flex items-center gap-3 w-full rounded-lg px-2 hover:bg-white/5' : ''}`}
                title={t('createImage')}
             >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                {isMobile && <span className="text-sm font-semibold">{t('createImage')}</span>}
             </button>

             <div className="relative group">
                <button disabled={isStreaming || isLiveActive} onClick={() => fileInputRef.current?.click()} className={`p-2.5 rounded-full transition-colors active:scale-90 transform ${footerColors.icon} disabled:opacity-50 ${isMobile ? 'flex items-center gap-3 w-full rounded-lg px-2 hover:bg-white/5' : ''}`}
                >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                      {isMobile && <span className="text-sm font-semibold">{t('uploadFile')}</span>}
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  multiple // Allow any file type
                  onChange={handleFileSelect}
                />
                {!isMobile && <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-gray-900 text-white text-xs rounded shadow opacity-0 group-hover:opacity-100 transition pointer-events-none">{t('uploadFile')}</span>}
             </div>
         </>
         )}
    </>
  )};

  const renderInputBar = () => (
      <div className={`relative flex flex-col backdrop-blur-lg shadow-lg p-1.5 border transition-all duration-300 ${(isInputExpanded || stagedAttachments.length > 0) ? 'rounded-2xl' : 'rounded-[2rem]'} ${footerColors.bg}`}>
            {showMobileMenu && !isGuest && (
                <div ref={mobileMenuRef} className={`absolute bottom-full left-0 right-0 mb-2 rounded-xl p-2 z-30 shadow-2xl animate-scale-in origin-bottom-left border ${footerColors.popup}`}>
                    <div className="grid grid-cols-1 gap-1">
                        {renderTools(true)}
                    </div>
                </div>
            )}
            
            {stagedAttachments.length > 0 && (
                <div className="px-3 pt-2 pb-1 overflow-x-auto">
                <div className="flex items-center gap-3">
                    {stagedAttachments.map((att, idx) => {
                        const isImg = att.startsWith('data:image');
                        return (
                            <div key={idx} className="relative inline-block w-fit shrink-0 group">
                                {isImg ? (
                                    <img src={att} alt={`Preview ${idx}`} className="h-16 rounded-lg border border-white/20 object-cover" />
                                ) : (
                                    <div className="h-16 w-16 rounded-lg border border-white/20 bg-white/10 flex flex-col items-center justify-center text-xs text-white">
                                        <svg className="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                        FILE
                                    </div>
                                )}
                                <button 
                                onClick={() => setStagedAttachments(prev => prev.filter((_, i) => i !== idx))}
                                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Xóa"
                                >
                                ×
                                </button>
                            </div>
                        );
                    })}
                    {stagedAttachments.length < 10 && !isDeepResearchMode && !isGuest && (
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="h-16 w-16 rounded-lg border border-white/10 border-dashed flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                        </button>
                    )}
                </div>
                </div>
            )}

            <div className="flex items-end w-full">
                {/* Left side: Model Selector (Only for Deep Research) or Mobile Menu */}
                <div className="pb-1.5 pl-1.5 flex items-center">
                    {isDeepResearchMode ? (
                        <div className="hidden md:block mr-2">{renderTools(false)}</div>
                    ) : (
                        !isGuest && (
                        <div className="md:hidden">
                            <button 
                                onClick={() => setShowMobileMenu(!showMobileMenu)}
                                className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors active:scale-95 ${showMobileMenu ? footerColors.active : footerColors.icon} ${isStreaming || isLiveActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                                disabled={isStreaming || isLiveActive}
                            >
                                <svg className={`w-6 h-6 transition-transform duration-200 ${showMobileMenu ? 'rotate-45' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                </svg>
                            </button>
                        </div>
                        )
                    )}
                </div>

                <textarea 
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => {
                        setInput(e.target.value);
                        e.target.style.height = 'auto';
                        const newHeight = Math.min(e.target.scrollHeight, 150);
                        e.target.style.height = `${newHeight}px`;
                        setIsInputExpanded(newHeight > 58);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                        }
                    }}
                    onPaste={handlePaste}
                    placeholder={isGuest ? "Chế độ Khách (Tin nhắn văn bản giới hạn)..." : (isDeepResearchMode ? "Nhập chủ đề cần nghiên cứu sâu..." : (isIncognito ? "Chat ẩn danh (Không lưu lịch sử)..." : (specialMode === 'teacher' ? "Nhập nội dung cần hỗ trợ giảng dạy..." : (isLiveActive ? "Đang lắng nghe..." : "Bạn muốn biết gì?"))))} 
                    rows={1}
                    disabled={isStreaming || isLiveActive}
                    className={`flex-grow bg-transparent border-none focus:ring-0 focus:outline-none text-lg pl-3 md:pl-5 py-3 resize-none max-h-[150px] ${footerColors.input} disabled:opacity-50`}
                />
                
                <div className="flex items-center shrink-0 pr-1 pb-1.5 gap-1">
                        {!isDeepResearchMode && (
                            <div className="hidden md:flex items-center gap-1">
                                {renderTools(false)}
                            </div>
                        )}

                        {isStreaming ? (
                        <button onClick={handleStopGeneration} className="flex items-center justify-center w-11 h-11 bg-white text-black rounded-full transition-colors shrink-0 ml-1 shadow-lg active:scale-90 transform animate-pulse">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                            </button>
                        ) : (input.trim() || stagedAttachments.length > 0) ? (
                            <button onClick={() => handleSend()} className={`flex items-center justify-center w-11 h-11 rounded-full transition-colors shrink-0 ml-1 shadow-lg active:scale-90 transform ${isIncognito ? 'bg-purple-600 hover:bg-purple-500' : (isLiveActive ? 'bg-red-500' : (specialMode === 'valentine' ? 'bg-pink-600 hover:bg-pink-500' : (specialMode === 'teacher' ? 'bg-emerald-600 hover:bg-emerald-500' : (specialMode === 'stress' ? 'bg-teal-600 hover:bg-teal-500' : 'bg-blue-600 hover:bg-blue-500'))))} text-white`}>
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" /></svg>
                            </button>
                        ) : (
                            <>
                            {!isDeepResearchMode && !isGuest && (
                            <button 
                            onClick={handleLiveToggle} 
                            className={`flex items-center justify-center w-11 h-11 rounded-full transition-all shrink-0 ml-1 shadow-lg active:scale-90 transform ${isLiveActive ? footerColors.liveActive : (theme === 'light' ? 'bg-gray-200 text-gray-500 hover:bg-gray-300' : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50')}`}
                            title={isLiveActive ? "Dừng Live Chat" : "Live Chat"}
                            >
                            {isLiveActive ? (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            ) : (
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                            )}
                            </button>
                            )}
                            </>
                        )}
                </div>
            </div>
      </div>
  );

  const getBackgroundImageStyle = () => {
        if (specialMode === 'valentine') return { backgroundImage: `url('https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=2070')` };
        if (specialMode === 'teacher') return { backgroundImage: `url('https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=2070&auto=format&fit=crop')` };
        if (specialMode === 'stress') return { backgroundImage: `url('https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2560&auto=format&fit=crop')` };
        if (THEME_BACKGROUNDS[theme]) return { backgroundImage: `url('${THEME_BACKGROUNDS[theme]}')` };
        return {};
  }

  if (showLanding) {
      return (
          <>
            {showAuthModal && (
                <AuthModal 
                    onAuthSuccess={(u) => {
                        setUser(u);
                        setShowAuthModal(false);
                        setShowLanding(false);
                        syncWithCloud(u.id);
                    }} 
                    onGuestLogin={handleGuestLogin}
                    onClose={() => setShowAuthModal(false)}
                    t={t}
                    initialMode={authMode} 
                />
            )}
            <LandingPage 
                onStartChat={() => {
                    if (user || isGuest) {
                        setShowLanding(false);
                    } else {
                        setAuthMode('login');
                        setShowAuthModal(true);
                    }
                }} 
                onLogin={() => {
                    setAuthMode('login');
                    setShowAuthModal(true);
                }}
                onSignUp={() => {
                    setAuthMode('signup');
                    setShowAuthModal(true);
                }}
            />
          </>
      );
  }

  const backgroundStyle = getBackgroundImageStyle();
  const isPhoto = isPhotoTheme(theme) || (specialMode !== 'off');

  return (
    <div className={`relative flex h-screen w-screen overflow-hidden transition-colors duration-500 ${getThemeClasses()}`} style={backgroundStyle}>
      {isPhoto && <div className={`absolute inset-0 pointer-events-none ${specialMode === 'valentine' ? 'bg-black/30' : (specialMode === 'teacher' ? 'bg-emerald-950/70' : 'bg-black/40')}`} />}
      
      {/* Incognito Overlay / Effect */}
      {isIncognito && (
          <div className="absolute inset-0 border-4 border-purple-600/30 pointer-events-none z-[100] animate-pulse"></div>
      )}

      {/* Syncing Indicator */}
      {isSyncing && (
          <div className="absolute top-0 right-0 m-4 z-[60] flex items-center gap-2 bg-blue-600 text-white text-xs px-3 py-1.5 rounded-full animate-pulse shadow-lg">
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              <span>Đang đồng bộ...</span>
          </div>
      )}

      {/* Verification Overlay */}
      {showVerification && <VerificationOverlay onVerifySuccess={handleVerifySuccess} t={t} />}

      {/* Auth Modal (Rendered here only if not on Landing Page, for re-auth scenarios) */}
      {showAuthModal && !showVerification && (
          <AuthModal 
            onAuthSuccess={(u) => {
                setUser(u);
                setShowAuthModal(false);
                syncWithCloud(u.id);
            }} 
            onGuestLogin={handleGuestLogin}
            onClose={isGuest ? () => setShowAuthModal(false) : undefined}
            t={t}
            initialMode={authMode} 
          />
      )}

      <Suspense fallback={null}>
         <WhatsNewModal isOpen={showWhatsNew} onClose={handleCloseWhatsNew} t={t} />
         <BotStore isOpen={showBotStore} onClose={() => setShowBotStore(false)} bots={bots} onSelectBot={(bot) => createNewSession(bot.id)} onCreateBot={(b) => setBots(prev => [...prev, b])} onDeleteBot={(id) => setBots(prev => prev.filter(b => b.id !== id))} t={t} />
      </Suspense>

      <Sidebar 
        isOpen={isSidebarOpen} 
        isCompact={isSidebarCompact} 
        onToggleCompact={() => setIsSidebarCompact(!isSidebarCompact)} 
        sessions={sessions} 
        currentSessionId={currentSessionId} 
        onSelectSession={handleSelectSession} 
        onNewChat={() => createNewSession()} 
        onDeleteSession={handleDeleteSession} 
        onRenameSession={handleRenameSession} 
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
        onOpenBotStore={() => setShowBotStore(true)} 
        onShowWhatsNew={() => setShowWhatsNew(true)} 
        version={APP_VERSION} 
        t={t} 
        user={user} 
        onSignOut={handleSignOut}
        isGuest={isGuest}
      />

      <div className="flex-1 flex flex-col relative z-10 h-full w-full">
        {/* ... (Header) */}
        <header className="p-4 flex justify-between items-center z-20 relative">
            <div className="flex items-center gap-4 z-10">
                <div className="flex items-center text-xl font-semibold select-none">
                    <svg width="28" height="28" viewBox="0 0 100 100" className={isStreaming ? "animate-breathing" : ""}>
                        <defs>
                            <radialGradient id="bubbleGradient" cx="0.3" cy="0.3" r="0.7">
                                <stop offset="0%" style={{stopColor: isIncognito ? 'rgb(168, 85, 247)' : (theme === 'newyear' ? 'rgb(255,220,220)' : (specialMode === 'valentine' ? 'rgb(244, 114, 182)' : (specialMode === 'teacher' ? 'rgb(52, 211, 153)' : (specialMode === 'stress' ? 'rgb(45, 212, 191)' : 'rgb(220,240,255)')))), stopOpacity:1}} />
                                <stop offset="100%" style={{stopColor: isIncognito ? 'rgb(88, 28, 135)' : (theme === 'newyear' ? 'rgb(220, 40, 40)' : (specialMode === 'valentine' ? 'rgb(219, 39, 119)' : (specialMode === 'teacher' ? 'rgb(5, 150, 105)' : (specialMode === 'stress' ? 'rgb(15, 118, 110)' : 'rgb(51, 149, 240)')))), stopOpacity:1}} />
                            </radialGradient>
                        </defs>
                        <circle cx="50" cy="50" r="45" fill="url(#bubbleGradient)" stroke="rgba(255,255,255,0.7)" strokeWidth="3"/>
                        <path d="M 35 30 A 25 25 0 0 1 60 55" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="5" strokeLinecap="round"/>
                    </svg>
                    <div className="flex flex-col justify-center -mt-1">
                        <span className={`text-2xl ml-0.5 font-semibold ${isIncognito ? 'text-purple-400' : (theme === 'newyear' ? 'text-red-500' : (specialMode === 'valentine' ? 'text-pink-400' : (specialMode === 'teacher' ? 'text-emerald-400' : (specialMode === 'stress' ? 'text-teal-400' : 'text-blue-400'))))}`}>ceep</span>
                        {isIncognito && <span className="text-[9px] text-purple-300 ml-1 leading-none -mt-1 opacity-80 font-mono tracking-widest uppercase">Ignocity</span>}
                        {specialMode === 'valentine' && <span className="text-[9px] text-pink-300 ml-1 leading-none -mt-1 opacity-80 font-serif tracking-widest uppercase">Valentine</span>}
                        {specialMode === 'teacher' && <span className="text-[9px] text-emerald-300 ml-1 leading-none -mt-1 opacity-80 font-serif tracking-widest uppercase">Education</span>}
                        {specialMode === 'stress' && <span className="text-[9px] text-teal-300 ml-1 leading-none -mt-1 opacity-80 font-serif tracking-widest uppercase">Healing</span>}
                    </div>
                </div>

                {/* Mobile & Desktop Toggle & New Chat */}
                <div className={`flex items-center gap-1 p-1 rounded-full backdrop-blur ${theme === 'light' ? 'bg-gray-200/50' : 'bg-white/5'}`}>
                      <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="w-10 h-10 flex items-center justify-center rounded-full active:scale-90 transition-transform">
                         {isSidebarOpen ? (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                         ) : (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                         )}
                      </button>
                </div>
            </div>

            <div className="flex items-center gap-2 z-10">
                 {!isGuest && (
                 <div className="relative" ref={specialModeRef}>
                     <button 
                        onClick={() => setShowSpecialModeMenu(!showSpecialModeMenu)}
                        className={`h-10 px-3 flex items-center gap-2 rounded-full transition-all active:scale-95 ${
                            specialMode === 'incognito' 
                              ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30 ring-2 ring-purple-400' 
                              : specialMode === 'valentine'
                                ? 'bg-pink-600 text-white shadow-lg shadow-pink-500/30 ring-2 ring-pink-400'
                                : specialMode === 'teacher'
                                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-400'
                                : specialMode === 'stress'
                                    ? 'bg-teal-600 text-white shadow-lg shadow-teal-500/30 ring-2 ring-teal-400'
                                : (theme === 'light' ? 'bg-white/20 text-gray-700 hover:bg-gray-200' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10')
                        }`}
                        title="Chế độ đặc biệt"
                     >
                        {specialMode === 'incognito' ? (
                             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                        ) : specialMode === 'valentine' ? (
                             <span className="text-lg">💖</span>
                        ) : specialMode === 'teacher' ? (
                             <span className="text-lg">🎓</span>
                        ) : specialMode === 'stress' ? (
                             <span className="text-lg">🍃</span>
                        ) : (
                             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                        )}
                        <span className="hidden md:inline text-sm font-semibold">
                            {specialMode === 'incognito' ? 'Ignocity' : specialMode === 'valentine' ? 'Valentine' : specialMode === 'teacher' ? 'Teacher' : (specialMode === 'stress' ? 'Stress Relief' : 'Modes')}
                        </span>
                     </button>

                     {showSpecialModeMenu && (
                        <div className={`absolute top-full right-0 mt-2 w-56 rounded-xl border p-1 flex flex-col gap-1 z-50 animate-scale-in origin-top-right ${footerColors.popup}`}>
                            {specialMode !== 'off' && (
                                <button onClick={() => handleSpecialModeChange('off')} className="flex items-center gap-3 p-3 rounded-lg text-left transition-colors hover:bg-white/10">
                                    <div className="text-lg">❌</div>
                                    <div className="font-bold text-sm">Tắt chế độ</div>
                                </button>
                            )}
                            <button onClick={() => handleSpecialModeChange('incognito')} className={`flex items-center gap-3 p-3 rounded-lg text-left transition-colors hover:bg-white/10 ${specialMode === 'incognito' ? 'bg-purple-900/30 text-purple-300' : ''}`}>
                                <div className="text-lg">🕵️</div>
                                <div>
                                    <div className="font-bold text-sm">Ẩn danh</div>
                                    <div className="text-[10px] opacity-70">Không lưu lịch sử chat</div>
                                </div>
                            </button>
                            <button onClick={() => handleSpecialModeChange('valentine')} className={`flex items-center gap-3 p-3 rounded-lg text-left transition-colors hover:bg-white/10 ${specialMode === 'valentine' ? 'bg-pink-900/30 text-pink-300' : ''}`}>
                                <div className="text-lg">💖</div>
                                <div>
                                    <div className="font-bold text-sm">Valentine</div>
                                    <div className="text-[10px] opacity-70">Giao diện & nội dung lãng mạn</div>
                                </div>
                            </button>
                            <button onClick={() => handleSpecialModeChange('teacher')} className={`flex items-center gap-3 p-3 rounded-lg text-left transition-colors hover:bg-white/10 ${specialMode === 'teacher' ? 'bg-emerald-900/30 text-emerald-300' : ''}`}>
                                <div className="text-lg">🎓</div>
                                <div>
                                    <div className="font-bold text-sm">Giáo Viên</div>
                                    <div className="text-[10px] opacity-70">Hỗ trợ giảng dạy & học tập</div>
                                </div>
                            </button>
                            <button onClick={() => handleSpecialModeChange('stress')} className={`flex items-center gap-3 p-3 rounded-lg text-left transition-colors hover:bg-white/10 ${specialMode === 'stress' ? 'bg-teal-900/30 text-teal-300' : ''}`}>
                                <div className="text-lg">🍃</div>
                                <div>
                                    <div className="font-bold text-sm">Giảm Stress</div>
                                    <div className="text-[10px] opacity-70">Thư giãn, AI chủ động tâm sự</div>
                                </div>
                            </button>
                        </div>
                     )}
                 </div>
                 )}

                 {!activeBot && !isDeepResearchMode && !isGuest && (
                 <div className="relative" ref={moodSelectorRef}>
                    <button 
                        onClick={() => setShowMoodSelector(!showMoodSelector)} 
                        className={`px-3 h-10 flex items-center gap-2 rounded-full text-sm font-semibold active:scale-90 transition-transform ${theme === 'light' ? 'text-gray-700 hover:bg-white/50 bg-white/20' : 'text-white hover:bg-white/10 bg-white/5'}`}
                        title={t('changeMood')}
                    >
                        <span>{currentMoodObj.icon}</span>
                        <span className="hidden md:inline">{currentMoodObj.label}</span>
                        <svg className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {showMoodSelector && (
                        <div className={`absolute top-full right-0 mt-2 w-64 rounded-xl border p-2 flex flex-col gap-1 z-50 animate-scale-in origin-top-right ${footerColors.popup}`}>
                            <div className="px-3 py-2 text-xs font-bold opacity-50 uppercase tracking-wider">{t('selectMood')}</div>
                            {MOODS.map(mood => (
                                <button key={mood.id} onClick={() => {setCurrentMood(mood.id); setShowMoodSelector(false);}} className={`flex items-center gap-3 p-3 rounded-lg text-left transition-colors hover:bg-white/10 ${currentMood === mood.id ? 'bg-blue-600/20' : ''}`}>
                                    <div className="text-2xl">{mood.icon}</div>
                                    <div><div className="font-bold text-sm">{mood.label}</div><div className="text-[10px] opacity-70">{mood.description}</div></div>
                                </button>
                            ))}
                        </div>
                    )}
                 </div>
                 )}
                 
                 {activeBot && (
                    <div className="px-3 h-10 flex items-center gap-2 rounded-full text-sm font-semibold bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg animate-fade-in cursor-default">
                        <span>{activeBot.icon}</span>
                        <span className="hidden md:inline">{activeBot.name}</span>
                    </div>
                 )}

                 {!activeBot && isTodoBot && (
                    <div className="px-3 h-10 flex items-center gap-2 rounded-full text-sm font-semibold bg-emerald-700 text-white shadow-lg animate-fade-in cursor-default">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                        <span className="hidden md:inline">To-Do Mode</span>
                    </div>
                 )}

                 {!activeBot && isDeepResearchMode && (
                    <div className="px-3 h-10 flex items-center gap-2 rounded-full text-sm font-semibold bg-indigo-900/50 border border-indigo-500/30 text-indigo-300 shadow-lg animate-fade-in cursor-default">
                        <span>📑</span>
                        <span className="hidden md:inline">Deep Research</span>
                    </div>
                 )}

                 {isGuest && (
                    <div className="px-3 h-10 flex items-center gap-2 rounded-full text-sm font-semibold bg-gray-700/50 text-gray-300 shadow-lg animate-fade-in cursor-default border border-white/10">
                        <span>👤</span>
                        <span className="hidden md:inline">Guest</span>
                    </div>
                 )}

                 <button onClick={() => setShowLanguageModal(true)} className={`w-10 h-10 flex items-center justify-center rounded-full active:scale-90 transition-transform ${theme === 'light' ? 'text-gray-700 hover:bg-white/50 bg-white/20' : 'text-white hover:bg-white/10 bg-white/5'}`} title={t('selectLanguage')}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                 </button>

                 <button onClick={() => setShowThemeModal(true)} className={`w-10 h-10 flex items-center justify-center rounded-full active:scale-90 transition-transform ${theme === 'light' ? 'text-gray-700 hover:bg-white/50' : 'text-white hover:bg-white/10'}`}><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"></path></svg></button>
            </div>
        </header>

        <main className="flex-1 flex flex-col p-4 overflow-hidden relative">
             {currentMessages.length === 0 ? (
                <div className="flex-grow flex flex-col items-center justify-center text-center animate-fade-up w-full max-w-3xl mx-auto h-full">
                      <div className="flex-1 flex flex-col justify-center items-center w-full">
                          {activeBot ? (
                             <div className="animate-scale-in">
                                <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center text-5xl mb-6 bg-gradient-to-br ${activeBot.color || 'from-gray-700 to-black'} shadow-2xl`}>
                                    {activeBot.icon}
                                </div>
                                <h1 className={`text-3xl font-bold mb-2 opacity-90 ${theme === 'light' ? 'text-gray-800' : 'text-white'}`}>
                                    {activeBot.name}
                                </h1>
                                <p className="text-gray-400 max-w-md mx-auto mb-8">{activeBot.description}</p>
                            </div>
                          ) : (
                             <div className="w-full max-w-4xl flex flex-col items-center">
                                {!isIncognito && user && !isGuest && (
                                    <h2 className={`text-3xl md:text-4xl font-bold mb-4 animate-fade-in select-none ${theme === 'light' ? 'text-gray-800' : 'text-white'}`}>
                                        {t('welcomeBack')}, {user.email?.split('@')[0]}
                                    </h2>
                                )}

                                <h1 className={`text-3xl md:text-5xl font-bold mb-8 opacity-90 text-center leading-tight ${theme === 'light' ? 'text-gray-800' : 'text-white'}`}>
                                    {isIncognito ? t('incognitoMode') : randomSlogan}
                                </h1>
                                
                                <div className="flex flex-wrap justify-center gap-3 w-full max-w-4xl animate-fade-up relative z-[100] mt-4">
                                    <button 
                                        onClick={handleSurpriseMe}
                                        className={`rounded-full px-5 py-2.5 text-sm font-bold border transition-all cursor-pointer backdrop-blur-md active:scale-95 hover:shadow-lg hover:-translate-y-0.5 flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border-amber-500/30 text-amber-300 hover:from-amber-500/30 hover:to-yellow-500/30`}
                                    >
                                        <span>Surprise Me! ✨</span>
                                    </button>

                                    {randomSuggestions.map((prompt, idx) => (
                                        <button 
                                            key={idx}
                                            onClick={() => handleSend(prompt)}
                                            className={`rounded-full px-5 py-2.5 text-sm font-medium border transition-all cursor-pointer backdrop-blur-md active:scale-95 hover:shadow-lg hover:-translate-y-0.5 flex items-center gap-2 ${footerColors.pill || 'bg-white/5 border-white/10 hover:bg-white/10 text-white'}`}
                                        >
                                            <span>{prompt}</span>
                                        </button>
                                    ))}
                                </div>
                             </div>
                          )}
                      </div>

                      <div className="w-full flex flex-col mt-auto relative z-[200]">
                          <div className="w-full animate-fade-up" style={{animationDelay: '0.1s'}}>
                              {renderInputBar()}
                              <p className={`text-center text-[10px] mt-3 opacity-60 ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                                Được tin tưởng bởi hơn 5M người dùng, đánh giá 4.9 trên các kho ứng dụng
                              </p>
                          </div>
                      </div>
                </div>
             ) : (
                <div key={currentSessionId} className="w-full max-w-3xl mx-auto flex-grow mb-4 overflow-y-auto px-2 animate-fade-up">
                   {currentMessages.map((msg, idx) => (
                      <MessageBubble 
                          key={msg.id} 
                          message={msg} 
                          theme={theme} 
                          index={idx}
                          onRegenerate={msg.role === Role.MODEL && !msg.isStreaming ? () => handleRegenerate(idx) : undefined}
                          onImageSelect={handleImageSelect}
                          botId={currentSession?.botId}
                          onUpdateMessage={handleUpdateMessage}
                          onInstantAnswer={msg.isStreaming && msg.role === Role.MODEL ? () => handleInstantAnswer(idx) : undefined}
                          t={t}
                          hasBackgroundImage={(isPhotoTheme(theme) || specialMode !== 'off')}
                          onSend={(text) => handleSend(text)} // Pass handleSend as onSend prop
                      />
                   ))}
                   <div ref={bottomRef}></div>
                </div>
             )}
        </main>

        {currentMessages.length > 0 && (
            <footer className="w-full max-w-3xl mx-auto px-4 pb-4 z-20 relative">
                {renderInputBar()}
                <p className={`text-center text-xs mt-2 ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                    {isIncognito ? "Đang trong chế độ Ignocity. Lịch sử chat sẽ không được lưu." : "AI có thể mắc lỗi. Hãy cân nhắc kiểm tra thông tin quan trọng."}
                </p>
            </footer>
        )}
      </div>

      {showThemeModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setShowThemeModal(false)}>
             <div className="bg-gray-900 border border-white/20 rounded-2xl p-6 w-full max-w-2xl shadow-2xl animate-scale-in overflow-y-auto max-h-[85vh]" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-5 text-white text-center">Chọn Giao Diện</h2>
                
                {/* Basic Themes */}
                <div className="mb-6">
                    <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Cơ bản</h3>
                    <div className="grid grid-cols-3 gap-4">
                        <button onClick={() => {setTheme('dark'); setShowThemeModal(false)}} className={`p-4 rounded-lg border active:scale-95 transition-transform ${theme === 'dark' ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 hover:bg-white/5'} flex flex-col items-center gap-2 text-white`}>
                            <div className="w-full h-12 bg-[#212935] rounded ring-1 ring-white/10"></div>
                            <span className="text-sm">Tối</span>
                        </button>
                        <button onClick={() => {setTheme('light'); setShowThemeModal(false)}} className={`p-4 rounded-lg border active:scale-95 transition-transform ${theme === 'light' ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 hover:bg-white/5'} flex flex-col items-center gap-2 text-white`}>
                            <div className="w-full h-12 bg-white rounded ring-1 ring-white/10"></div>
                            <span className="text-sm">Sáng</span>
                        </button>
                        <button onClick={() => {setTheme('gray'); setShowThemeModal(false)}} className={`p-4 rounded-lg border active:scale-95 transition-transform ${theme === 'gray' ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 hover:bg-white/5'} flex flex-col items-center gap-2 text-white`}>
                            <div className="w-full h-12 rounded bg-[#212121] ring-1 ring-white/10"></div>
                            <span className="text-sm">Xám (#212121)</span>
                        </button>
                    </div>
                </div>

                {/* Featured Themes */}
                <div className="mb-6">
                    <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Nổi bật</h3>
                    <div className="grid grid-cols-3 gap-4">
                        <button onClick={() => {setTheme('ocean'); setShowThemeModal(false)}} className={`p-4 rounded-lg border active:scale-95 transition-transform ${theme === 'ocean' ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 hover:bg-white/5'} flex flex-col items-center gap-2 text-white`}>
                             <div className="w-full h-12 rounded bg-cover ring-1 ring-white/10" style={{backgroundImage: "url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1173')"}}></div>
                            <span className="text-sm">Biển</span>
                        </button>
                        <button onClick={() => {setTheme('tokyo'); setShowThemeModal(false)}} className={`p-4 rounded-lg border active:scale-95 transition-transform ${theme === 'tokyo' ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 hover:bg-white/5'} flex flex-col items-center gap-2 text-white`}>
                             <div className="w-full h-12 rounded bg-cover ring-1 ring-white/10" style={{backgroundImage: `url('${THEME_BACKGROUNDS['tokyo']}')`}}></div>
                            <span className="text-sm">Tokyo</span>
                        </button>
                        <button onClick={() => {setTheme('newyear'); setShowThemeModal(false)}} className={`p-4 rounded-lg border active:scale-95 transition-transform ${theme === 'newyear' ? 'border-red-500 bg-red-900/20' : 'border-gray-700 hover:bg-white/5'} flex flex-col items-center gap-2 text-white`}>
                             <div className="w-full h-12 rounded bg-gradient-to-br from-red-900 to-black ring-1 ring-white/10 flex items-center justify-center relative overflow-hidden">
                                 <div className="absolute inset-0 bg-cover opacity-50" style={{backgroundImage: `url('${THEME_BACKGROUNDS['newyear']}')`}}></div>
                                 <div className="absolute top-1 right-1 text-[8px] opacity-80">✨</div>
                             </div>
                            <span className="text-sm">Năm mới</span>
                        </button>
                    </div>
                </div>

                {/* Landscape Collection */}
                <div className="mb-4">
                    <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Bộ sưu tập Landscape</h3>
                    <div className="grid grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map(i => {
                            const key = `landscape-${i}`;
                            const url = THEME_BACKGROUNDS[key];
                            return (
                                <button key={key} onClick={() => {setTheme(key as Theme); setShowThemeModal(false)}} className={`p-2 rounded-lg border active:scale-95 transition-transform ${theme === key ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 hover:bg-white/5'} flex flex-col items-center gap-2 text-white`}>
                                    <div className="w-full h-16 rounded bg-cover ring-1 ring-white/10" style={{backgroundImage: `url('${url}')`}}></div>
                                    <span className="text-xs">Mẫu {i}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>

                <button onClick={() => setShowThemeModal(false)} className="mt-4 w-full py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors active:scale-95">Đóng</button>
            </div>
        </div>
      )}

      {showLanguageModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setShowLanguageModal(false)}>
            <div className={`bg-[#1e1e24] border border-gray-700 w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[80vh] ${showLanguageModal ? 'animate-scale-in' : ''}`} onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-700 bg-[#25252b]">
                    <h2 className="text-xl font-bold text-white text-center mb-3">{t('selectLanguage')}</h2>
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder={t('searchLanguage')}
                            value={languageSearch}
                            onChange={(e) => setLanguageSearch(e.target.value)}
                            className="w-full bg-[#1a1a1f] border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                            autoFocus
                        />
                        <svg className="w-5 h-5 text-gray-400 absolute right-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
                    {LANGUAGES_LIST.filter(lang => lang.label.toLowerCase().includes(languageSearch.toLowerCase())).map((lang) => (
                        <button 
                            key={lang.code}
                            onClick={() => {
                                setCurrentLanguageCode(lang.code);
                                setShowLanguageModal(false);
                            }}
                            className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center justify-between ${currentLanguageCode === lang.code ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-white/5'}`}
                        >
                            <span className="font-medium">{lang.label}</span>
                            {currentLanguageCode === lang.code && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>}
                        </button>
                    ))}
                    {LANGUAGES_LIST.filter(lang => lang.label.toLowerCase().includes(languageSearch.toLowerCase())).length === 0 && (
                        <div className="text-center text-gray-500 py-8">{t('notFound')}</div>
                    )}
                </div>
                <div className="p-3 border-t border-gray-700 bg-[#25252b]">
                    <button onClick={() => setShowLanguageModal(false)} className="w-full py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors active:scale-95 font-medium">{t('close')}</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
