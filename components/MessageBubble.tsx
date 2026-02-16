
import React, { useState, useEffect, useRef, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { ChatMessage, Role } from '../types';
import { generateSpeech, playPCMData } from '../services/geminiService';
import { InteractiveTodo, TodoData } from './InteractiveTodo';
import { WeatherCard, WeatherData } from './WeatherCard';
import { LocationCard, LocationData } from './LocationCard';
import { LocationMap } from './LocationMap';
import { 
    StockCard, StockData, 
    CurrencyCard, CurrencyData, 
    SportCard, SportData, 
    FlightCard, FlightData, 
    CalcCard, CalcData,
    TimeCard, TimeData
} from './SearchCards';

interface MessageBubbleProps {
  message: ChatMessage;
  theme: string;
  index: number;
  onRegenerate?: (index: number) => void;
  onImageSelect?: (base64: string) => void;
  botId?: string;
  onInstantAnswer?: () => void;
  onUpdateMessage?: (index: number, newContent: string) => void;
  t: (key: string) => string;
  hasBackgroundImage?: boolean;
  onSend?: (text: string) => void;
}

const CodeBlock = ({ inline, className, children, theme }: any) => {
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1].toLowerCase() : 'text';
  const codeString = String(children).replace(/\n$/, '');

  const isRunnable = language === 'html' || language === 'xml';

  const handleCopy = () => {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([codeString], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    const extensionMap: Record<string, string> = {
      javascript: 'js', python: 'py', html: 'html', css: 'css',
      json: 'json', typescript: 'ts', java: 'java', cpp: 'cpp',
      c: 'c', csharp: 'cs', go: 'go', rust: 'rs', php: 'php',
      ruby: 'rb', shell: 'sh', bash: 'sh', sql: 'sql', md: 'md'
    };
    
    const ext = extensionMap[language] || 'txt';
    a.href = url;
    a.download = `code_snippet.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (inline) {
    return (
      <code className={`font-mono rounded px-1 py-0.5 ${theme === 'light' ? 'bg-gray-200 text-red-600' : 'bg-gray-700/50'}`} >
        {children}
      </code>
    );
  }

  return (
    <div className={`my-4 rounded-lg overflow-hidden bg-[#1e1e1e] border border-gray-700 shadow-xl w-full text-white transition-all duration-300`}>
      <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-gray-700 shrink-0">
        <span className="text-xs text-gray-400 font-mono font-bold uppercase">{language}</span>
        <div className="flex gap-2">
           {isRunnable && (
               <button 
                  onClick={() => setShowPreview(!showPreview)}
                  className={`text-xs flex items-center gap-1 transition-colors ${showPreview ? 'text-green-400' : 'text-gray-400 hover:text-white'}`}
                  title={showPreview ? "Đóng Preview" : "Chạy code (Preview)"}
               >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  {showPreview ? 'Close' : 'Run'}
               </button>
           )}
           <button 
              onClick={handleDownload}
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
              title="Download"
           >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
           </button>
           <button 
              onClick={handleCopy}
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
           >
              {copied ? (
                 <>
                   <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                   Copied
                 </>
              ) : (
                 <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    Copy
                 </>
              )}
           </button>
        </div>
      </div>
      
      <div className={`flex flex-col ${showPreview && isRunnable ? 'lg:flex-row h-[500px] lg:h-[600px]' : ''}`}>
          <div className={`overflow-auto bg-[#1e1e1e] ${showPreview && isRunnable ? 'w-full lg:w-1/2 h-1/2 lg:h-full border-b lg:border-b-0 lg:border-r border-gray-700' : ''}`}>
            <div className="p-4">
               <code className="font-mono text-sm text-gray-200 whitespace-pre leading-8">{children}</code>
            </div>
          </div>

          {showPreview && isRunnable && (
              <div className="w-full lg:w-1/2 h-1/2 lg:h-full flex flex-col bg-white">
                  <div className="flex items-center justify-between px-3 py-2 bg-[#2d2d35] border-b border-gray-700 text-white shrink-0">
                      <span className="text-xs font-bold text-gray-300 uppercase flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                          Browser Preview
                      </span>
                  </div>
                  <iframe 
                      srcDoc={codeString} 
                      className="w-full h-full border-0 block bg-white" 
                      sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
                      allow="accelerometer; camera; encrypted-media; display-capture; geolocation; gyroscope; microphone; midi; clipboard-read; clipboard-write; web-share"
                      title="Code Preview"
                  />
              </div>
          )}
      </div>
    </div>
  );
};

interface ThinkingBlockProps {
    content: string;
    theme: string;
    isStreaming?: boolean;
    timestamp?: number;
    duration?: number;
    onInstantAnswer?: () => void;
    t: (k:string)=>string;
}

const ThinkingBlock = ({ content, theme, isStreaming, timestamp, duration, onInstantAnswer, t }: ThinkingBlockProps) => {
    const [isOpen, setIsOpen] = useState(true);
    const [elapsed, setElapsed] = useState<number>(0);

    const isThinkingActive = isStreaming && !duration;

    useEffect(() => {
        if (duration !== undefined) {
            setElapsed(duration);
            return;
        }
        if (isStreaming && timestamp) {
            setElapsed((Date.now() - timestamp) / 1000);
            const interval = setInterval(() => {
                setElapsed((Date.now() - timestamp) / 1000);
            }, 100);
            return () => clearInterval(interval);
        }
    }, [isStreaming, timestamp, duration]);

    const formatTime = (sec: number) => {
        if (sec < 60) return `${sec.toFixed(1)}s`;
        const m = Math.floor(sec / 60);
        const s = (sec % 60).toFixed(1);
        return `${m}m ${s}s`;
    };

    return (
        <div className="mb-2 w-full">
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between py-2 transition-all duration-200 group select-none cursor-pointer hover:opacity-80`}
            >
                <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={theme === 'light' ? 'text-black' : 'text-white'}>
                      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
                      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
                    </svg>
                    <span className={`font-semibold text-base ${
                        isThinkingActive
                        ? (theme === 'light' 
                            ? 'bg-gradient-to-r from-blue-600 via-blue-900 to-blue-600 bg-[length:200%_auto] animate-shimmer bg-clip-text text-transparent'
                            : 'bg-gradient-to-r from-blue-400 via-blue-700 to-blue-400 bg-[length:200%_auto] animate-shimmer bg-clip-text text-transparent')
                        : (theme === 'light' ? 'text-blue-600' : 'text-blue-400')
                    }`}>
                        {t('showThinking')}
                    </span>
                    <span className={`text-sm font-mono opacity-80 ${theme === 'light' ? 'text-blue-600' : 'text-blue-400'}`}>
                        ({formatTime(elapsed)})
                    </span>
                </div>
                
                <div className="flex items-center gap-3">
                    {/* Instant Answer Button */}
                    {isStreaming && !duration && onInstantAnswer && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onInstantAnswer(); }}
                            className="text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-full transition-all active:scale-95 shadow-md z-10"
                            title="Trả lời ngay"
                        >
                            Trả lời lập tức
                        </button>
                    )}

                    <svg 
                        className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} ${theme === 'light' ? 'text-black' : 'text-white'}`} 
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>

            {isOpen && (
                 <div className={`mt-1 pl-8 py-2 border-l-2 border-gray-500/30 bg-transparent ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'} text-base leading-relaxed animate-fade-in`}>
                    {(!content && isStreaming) ? (
                        "..."
                    ) : (
                        <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            components={{
                                p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                                strong: ({node, ...props}) => <strong className={`${theme === 'light' ? 'text-blue-600' : 'text-blue-400'} font-bold`} {...props} />,
                                code: (props) => <CodeBlock {...props} theme={theme} />
                            }}
                        >
                            {content}
                        </ReactMarkdown>
                    )}
                </div>
            )}
        </div>
    );
};

interface CodeExecutionBlockProps {
    code: string;
    theme: string;
    isStreaming?: boolean;
    timestamp?: number;
    duration?: number;
}

const CodeExecutionBlock = ({ code, theme, isStreaming, timestamp, duration }: CodeExecutionBlockProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [elapsed, setElapsed] = useState<number>(0);
    const isExecutionActive = isStreaming && !duration;

    useEffect(() => {
        if (duration !== undefined) {
            setElapsed(duration);
            return;
        }
        if (isStreaming && timestamp) {
            setElapsed((Date.now() - timestamp) / 1000);
            const interval = setInterval(() => {
                setElapsed((Date.now() - timestamp) / 1000);
            }, 100);
            return () => clearInterval(interval);
        }
    }, [isStreaming, timestamp, duration]);

    const formatTime = (sec: number) => {
        if (sec < 60) return `${sec.toFixed(1)}s`;
        const m = Math.floor(sec / 60);
        const s = (sec % 60).toFixed(1);
        return `${m}m ${s}s`;
    };

    return (
        <div className="mb-2 w-full">
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between py-2 transition-all duration-200 group select-none cursor-pointer hover:opacity-80`}
            >
                <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={theme === 'light' ? 'text-black' : 'text-white'}>
                        <polyline points="16 18 22 12 16 6"></polyline>
                        <polyline points="8 6 2 12 8 18"></polyline>
                    </svg>
                    <span className={`font-semibold text-base ${
                        isExecutionActive
                        ? (theme === 'light' 
                            ? 'bg-gradient-to-r from-purple-600 via-purple-900 to-purple-600 bg-[length:200%_auto] animate-shimmer bg-clip-text text-transparent'
                            : 'bg-gradient-to-r from-purple-400 via-purple-700 to-purple-400 bg-[length:200%_auto] animate-shimmer bg-clip-text text-transparent')
                        : (theme === 'light' ? 'text-purple-600' : 'text-purple-400')
                    }`}>
                        {isExecutionActive ? "Đang Thực Thi Mã" : `Đã Thực Thi Mã trong ${formatTime(elapsed)}`}
                    </span>
                </div>
                
                <div className="flex items-center gap-3">
                    <svg 
                        className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} ${theme === 'light' ? 'text-black' : 'text-white'}`} 
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>

            {isOpen && (
                 <div className="mt-1 pl-8 py-2 border-l-2 border-purple-500/30 animate-fade-in">
                    <CodeBlock className="language-python" theme={theme}>
                        {code}
                    </CodeBlock>
                </div>
            )}
        </div>
    );
};

const GlobeIcon = ({ className }: { className?: string }) => (
    <svg className={className || "w-3.5 h-3.5 opacity-60"} fill="none" viewBox="0 0 24 24" stroke="currentColor">
       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const Favicon = ({ url, className }: { url?: string, className?: string }) => {
    const [attempt, setAttempt] = useState(0);
    
    if (!url) return <GlobeIcon className={className} />;
  
    let hostname = '';
    try {
      hostname = new URL(url).hostname;
    } catch {
      return <GlobeIcon className={className} />;
    }
  
    const getSrc = (index: number) => {
        if (index === 0) return `https://favicon.vemetric.com/${url}`;
        if (index === 1) return `https://icons.duckduckgo.com/ip3/${hostname}.ico`;
        if (index === 2) return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
        return null;
    };

    const src = getSrc(attempt);
  
    if (!src) {
      return <GlobeIcon className={className} />;
    }
  
    return (
      <img 
        src={src} 
        alt="" 
        className={className} 
        onError={() => setAttempt(prev => prev + 1)} 
      />
    );
};

const SourceChip: React.FC<{ chunk: any, index: number, theme: string }> = ({ chunk, index, theme }) => {
    const uri = chunk.web?.uri || '';
    let hostname = '';
    try {
        hostname = new URL(uri).hostname;
    } catch (e) {
        hostname = 'Unknown';
    }

    return (
        <a 
            href={uri} 
            target="_blank" 
            rel="noopener noreferrer"
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all hover:scale-105 active:scale-95 group ${
                theme === 'light'
                ? 'bg-white border-gray-200 hover:border-blue-300 shadow-sm'
                : 'bg-[#1a1a1f] border-gray-800 hover:border-blue-500/50'
            }`}
            title={chunk.web?.title || hostname}
        >
            <div className="w-5 h-5 rounded flex items-center justify-center bg-gray-200 overflow-hidden shrink-0">
                <Favicon url={uri} className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col min-w-0">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${theme === 'light' ? 'text-gray-500' : 'text-gray-500'}`}>Source {index + 1}</span>
                <span className={`text-xs truncate max-w-[150px] font-medium ${theme === 'light' ? 'text-gray-800' : 'text-gray-200'}`}>
                    {chunk.web?.title || hostname}
                </span>
            </div>
        </a>
    );
};

const MessageBubbleComponent: React.FC<MessageBubbleProps> = ({ message, theme, index, onRegenerate, onImageSelect, botId, onUpdateMessage, onInstantAnswer, t, hasBackgroundImage, onSend }) => {
  const isUser = message.role === Role.USER;
  const [msgCopied, setMsgCopied] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingSpeech, setIsLoadingSpeech] = useState(false);
  const stopAudioRef = useRef<(() => void) | null>(null);

  const fullContent = message.content || '';
  
  const thinkRegex = /<think>([\s\S]*?)($|<\/think>)/g;
  
  const thinkMatches = [...fullContent.matchAll(thinkRegex)];
  const thinkingContentFull = thinkMatches.map(m => m[1]).join('\n\n').trim();
  
  // New Logic: Check for Code Execution inside thinking content
  let thinkingContent = thinkingContentFull;
  let codeExecutionContent = '';
  
  const codeExecRegex = /```python([\s\S]*?)```/g;
  const codeMatches = [...thinkingContentFull.matchAll(codeExecRegex)];
  
  if (codeMatches.length > 0) {
      // Extract code for execution block
      codeExecutionContent = codeMatches.map(m => m[1]).join('\n\n').trim();
      // Remove code from thinking text to avoid duplication
      thinkingContent = thinkingContentFull.replace(codeExecRegex, '[Code Execution...]').trim();
  }

  const cleanModelContent = fullContent.replace(thinkRegex, '').trim();

  // Parsing special blocks
  let textToRender = cleanModelContent;
  let todoData: TodoData | null = null;
  let weatherData: WeatherData | null = null;
  const locationList: LocationData[] = [];
  
  // New Data Types
  let stockData: StockData | null = null;
  let currencyData: CurrencyData | null = null;
  let sportData: SportData | null = null;
  let flightData: FlightData | null = null;
  let calcData: CalcData | null = null;
  let timeData: TimeData | null = null;

  // Global Regex for Multiple Matches & Removal
  const todoRegexGlobal = /:::todo([\s\S]*?):::/g;
  const weatherRegexGlobal = /:::weather([\s\S]*?):::/g;
  const locationRegexGlobal = /:::location([\s\S]*?):::/g;
  const stockRegexGlobal = /:::stock([\s\S]*?):::/g;
  const currencyRegexGlobal = /:::currency([\s\S]*?):::/g;
  const sportRegexGlobal = /:::sport([\s\S]*?):::/g;
  const flightRegexGlobal = /:::flight([\s\S]*?):::/g;
  const calcRegexGlobal = /:::calc([\s\S]*?):::/g;
  const timeRegexGlobal = /:::time([\s\S]*?):::/g;

  // Helper to parse JSON blocks
  const parseBlock = (regex: RegExp, setter: (data: any) => void) => {
      const matches = [...cleanModelContent.matchAll(regex)];
      if (matches.length > 0) {
          textToRender = textToRender.replace(regex, '').trim();
          const lastMatch = matches[matches.length - 1];
          try {
              let jsonStr = lastMatch[1].trim();
              jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/```$/, '');
              setter(JSON.parse(jsonStr));
          } catch (e) {
              console.error("Failed to parse json block", e);
          }
      }
  };

  parseBlock(todoRegexGlobal, (d) => todoData = d);
  parseBlock(weatherRegexGlobal, (d) => weatherData = d);
  parseBlock(stockRegexGlobal, (d) => stockData = d);
  parseBlock(currencyRegexGlobal, (d) => currencyData = d);
  parseBlock(sportRegexGlobal, (d) => sportData = d);
  parseBlock(flightRegexGlobal, (d) => flightData = d);
  parseBlock(calcRegexGlobal, (d) => calcData = d);
  parseBlock(timeRegexGlobal, (d) => timeData = d);

  // Parse Locations (List)
  const locationMatches = [...cleanModelContent.matchAll(locationRegexGlobal)];
  if (locationMatches.length > 0) {
      textToRender = textToRender.replace(locationRegexGlobal, '').trim();
      locationMatches.forEach(match => {
          try {
              let jsonStr = match[1].trim();
              jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/```$/, '');
              locationList.push(JSON.parse(jsonStr));
          } catch (e) {}
      });
  }

  // Handle Citations: Replace [1] with links
  const sources = message.groundingMetadata?.groundingChunks?.filter(c => c.web?.uri) || [];
  if (sources.length > 0 && !isUser) {
      textToRender = textToRender.replace(/\[(\d+)\]/g, (match, num) => {
          const idx = parseInt(num) - 1;
          if (sources[idx] && sources[idx].web?.uri) {
              return `[[${num}]](${sources[idx].web.uri})`;
          }
          return match;
      });
  }

  const [displayedContent, setDisplayedContent] = useState(message.isStreaming ? '' : textToRender);
  const contentRef = useRef(textToRender);

  const attachments = [
      ...(message.attachments || []),
      ...(message.images || []),
      ...(message.image ? [message.image] : [])
  ];
  
  const isVoiceSupported = botId !== 'bot-vux';

  const isThinkingModel = ['smart', 'super', 'deep'].includes(message.modelMode || '');
  const shouldShowThinking = thinkingContent.length > 0 || (isThinkingModel && message.isStreaming && fullContent.includes('<think>'));
  const shouldShowCodeExec = codeExecutionContent.length > 0;

  useEffect(() => {
    contentRef.current = textToRender;
  }, [textToRender]);

  useEffect(() => {
    if (!message.isStreaming) {
        setDisplayedContent(contentRef.current);
        return;
    }

    const interval = setInterval(() => {
        setDisplayedContent((current) => {
            const target = contentRef.current;
            if (current.length >= target.length) return current;

            const delta = target.length - current.length;
            let step = 1;
            if (delta > 200) step = 10;
            else if (delta > 50) step = 3;
            else if (delta > 20) step = 2;
            else step = 1;

            return target.slice(0, current.length + step);
        });
    }, 30);

    return () => clearInterval(interval);
  }, [message.isStreaming, textToRender]); 
  
  useEffect(() => {
      return () => {
          if (stopAudioRef.current) stopAudioRef.current();
      };
  }, []);

  const isBlurTheme = theme === 'ocean' || theme === 'newyear' || theme === 'tokyo' || theme.startsWith('landscape') || hasBackgroundImage;
  const textColorClass = isUser ? 'text-white' : theme === 'light' ? 'text-gray-900' : 'text-gray-100';

  const handleCopyMessage = () => {
      navigator.clipboard.writeText(cleanModelContent || message.content);
      setMsgCopied(true);
      setTimeout(() => setMsgCopied(false), 2000);
  };

  const handleTodoUpdate = (newData: TodoData) => {
      if (onUpdateMessage) {
          const newJson = JSON.stringify(newData, null, 2);
          const newFullContent = fullContent.replace(todoRegexGlobal, `:::todo\n${newJson}\n:::`);
          onUpdateMessage(index, newFullContent);
      }
  };

  const handleSpeak = async () => {
    if (isSpeaking) {
        if (stopAudioRef.current) {
            stopAudioRef.current();
            stopAudioRef.current = null;
        }
        setIsSpeaking(false);
        return;
    }

    setIsLoadingSpeech(true);
    try {
        if (message.audioData) {
            if (stopAudioRef.current) stopAudioRef.current();
            const stopFn = await playPCMData(message.audioData);
            stopAudioRef.current = () => {
                stopFn();
                setIsSpeaking(false);
                stopAudioRef.current = null;
            };
            setIsSpeaking(true);
            setIsLoadingSpeech(false);
            return;
        }

        let textToRead = textToRender; 
        textToRead = textToRead.replace(/```[\s\S]*?```/g, ' [Code snippet] ');
        textToRead = textToRead.trim();

        if (!textToRead) throw new Error("Không có nội dung để đọc");

        const base64Audio = await generateSpeech(textToRead);
        
        if (stopAudioRef.current) stopAudioRef.current();

        const stopFn = await playPCMData(base64Audio);
        stopAudioRef.current = () => {
            stopFn();
            setIsSpeaking(false);
            stopAudioRef.current = null;
        };
        
        setIsSpeaking(true);
        
    } catch (error) {
        console.error(error);
        alert("Không thể phát âm thanh: " + (error as Error).message);
    } finally {
        setIsLoadingSpeech(false);
    }
  };

  const handleImageDownload = (e: React.MouseEvent, imgSrc: string) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = imgSrc;
    link.download = `oceep_download_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImageEdit = (e: React.MouseEvent, imgSrc: string) => {
    e.stopPropagation();
    if (onImageSelect) {
      onImageSelect(imgSrc);
    }
  };

  const finalVisibleText = isUser ? message.content : displayedContent;
  const isTyping = !isUser && displayedContent.length < textToRender.length;
  const showCursor = !isUser && (isTyping || message.isStreaming);
  const isImage = (data: string) => data.startsWith('data:image');

  const hasSpecialCard = todoData || weatherData || stockData || currencyData || sportData || flightData || calcData || timeData || locationList.length > 0;

  return (
    <>
      <div className={`w-full mb-6 flex gap-4 group ${isUser ? 'justify-end' : 'justify-start'}`}>
        
        {!isUser && (
            <div className="shrink-0 pt-1">
                <div className="relative w-9 h-9 rounded-full flex items-center justify-center">
                    <div 
                        className="absolute inset-0 rounded-full p-[2px] bg-gradient-to-br from-blue-400 to-purple-600" 
                        style={{
                            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', 
                            maskComposite: 'exclude', 
                            WebkitMaskComposite: 'xor'
                        }}
                    ></div>
                    <svg width="24" height="24" viewBox="0 0 100 100" className="z-10">
                        <defs>
                            <radialGradient id="avatarBubbleGradient" cx="0.3" cy="0.3" r="0.7">
                                <stop offset="0%" stopColor="rgb(220,240,255)" />
                                <stop offset="100%" stopColor="rgb(51, 149, 240)" />
                            </radialGradient>
                        </defs>
                        <circle cx="50" cy="50" r="45" fill="url(#avatarBubbleGradient)" stroke="rgba(255,255,255,0.7)" strokeWidth="3"/>
                        <path d="M 35 30 A 25 25 0 0 1 60 55" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="5" strokeLinecap="round"/>
                    </svg>
                </div>
            </div>
        )}

        <div 
          className={`relative rounded-2xl px-4 py-2.5 flex flex-col gap-2 animate-pop-in ${
            isUser 
              ? 'bg-blue-600 shadow-md origin-bottom-right w-fit max-w-[85%]' 
              : `${isBlurTheme ? 'bg-black/40 backdrop-blur-md border border-white/10 shadow-sm' : 'bg-transparent'} origin-bottom-left w-full max-w-[90%] lg:max-w-[80%]`
          }`}
        >
          {/* Searching Status Indicator - UPDATED WITH GRADIENT SWEEP */}
          {message.isSearching && message.isStreaming && !finalVisibleText && (
              <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-emerald-400 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="11" cy="11" r="8"></circle><path d="M21 21L16.65 16.65"></path></svg>
                  <span className="font-medium bg-gradient-to-r from-emerald-400 via-emerald-700 to-emerald-400 bg-[length:200%_auto] animate-shimmer bg-clip-text text-transparent">Đang tìm kiếm...</span>
              </div>
          )}

          {attachments.length > 0 && (
            <div className={`mb-2 grid gap-2 ${attachments.length === 1 ? 'grid-cols-1' : attachments.length === 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`}>
              {attachments.map((attSrc, idx) => {
                  if (isImage(attSrc)) {
                      return (
                        <div key={idx} className="relative group/image overflow-hidden rounded-lg border border-white/10 aspect-square">
                            <img 
                                src={attSrc} 
                                alt={`Content ${idx + 1}`} 
                                className="w-full h-full object-cover cursor-zoom-in bg-black/20"
                                onClick={() => setLightboxImage(attSrc)}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                                <button 
                                    onClick={(e) => handleImageDownload(e, attSrc)}
                                    className="p-1.5 bg-white/10 hover:bg-white/30 rounded-full text-white backdrop-blur transition-all transform hover:scale-105"
                                    title={t('download')}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                </button>
                                {onImageSelect && (
                                    <button 
                                        onClick={(e) => handleImageEdit(e, attSrc)}
                                        className="p-1.5 bg-white/10 hover:bg-white/30 rounded-full text-white backdrop-blur transition-all transform hover:scale-105"
                                        title={t('edit')}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                                    </button>
                                )}
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setLightboxImage(attSrc); }}
                                    className="p-1.5 bg-white/10 hover:bg-white/30 rounded-full text-white backdrop-blur transition-all transform hover:scale-105"
                                    title={t('zoom')}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                                </button>
                            </div>
                        </div>
                      );
                  } else {
                      const typeMatch = attSrc.match(/^data:([^;]+);base64/);
                      const mimeType = typeMatch ? typeMatch[1] : 'application/octet-stream';
                      return (
                          <div key={idx} className="relative flex items-center gap-3 p-3 rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm min-w-[200px]">
                              <div className="p-2 bg-white/20 rounded-lg">
                                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 01-2-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                  <div className="text-xs text-white/70 truncate">{mimeType}</div>
                                  <div className="text-sm font-medium text-white truncate">File đính kèm {idx + 1}</div>
                              </div>
                          </div>
                      );
                  }
              })}
            </div>
          )}

          {shouldShowThinking && (
              <ThinkingBlock 
                  content={thinkingContent} 
                  theme={theme} 
                  isStreaming={message.isStreaming}
                  timestamp={message.timestamp}
                  duration={message.thinkingDuration}
                  onInstantAnswer={onInstantAnswer ? onInstantAnswer : undefined}
                  t={t}
              />
          )}

          {shouldShowCodeExec && (
              <CodeExecutionBlock 
                  code={codeExecutionContent}
                  theme={theme}
                  isStreaming={message.isStreaming}
                  timestamp={message.timestamp}
                  duration={message.thinkingDuration}
              />
          )}

          {/* Render Specialized Cards */}
          {todoData && <InteractiveTodo data={todoData} onUpdate={handleTodoUpdate} theme={theme} />}
          {weatherData && <WeatherCard data={weatherData} theme={theme} />}
          {stockData && <StockCard data={stockData} theme={theme} onSend={onSend} />}
          {currencyData && <CurrencyCard data={currencyData} theme={theme} onSend={onSend} />}
          {sportData && <SportCard data={sportData} theme={theme} onSend={onSend} />}
          {flightData && <FlightCard data={flightData} theme={theme} onSend={onSend} />}
          {calcData && <CalcCard data={calcData} theme={theme} onSend={onSend} />}
          {timeData && <TimeCard data={timeData} theme={theme} onSend={onSend} />}

          <div className={`markdown-body [&>*:last-child]:mb-0 ${textColorClass} ${showCursor ? 'cursor-blink' : ''}`}>
              {finalVisibleText === '' && message.isStreaming && !thinkingContent && !hasSpecialCard && !message.isSearching ? (
                 <span className="opacity-0">|</span> 
              ) : (
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    code: (props) => <CodeBlock {...props} theme={theme} />,
                    p: ({node, ...props}) => <p className={`${textColorClass} text-base leading-relaxed`} {...props} />,
                    li: ({node, ...props}) => <li className={`${textColorClass} text-base leading-relaxed ml-4`} {...props} />,
                    h1: ({node, ...props}) => <h1 className={`font-bold text-2xl mb-3 mt-4 ${textColorClass}`} {...props} />,
                    h2: ({node, ...props}) => <h2 className={`font-bold text-2xl mb-3 mt-4 ${textColorClass}`} {...props} />,
                    h3: ({node, ...props}) => <h3 className={`font-bold text-2xl mb-3 mt-4 ${textColorClass}`} {...props} />,
                    strong: ({node, ...props}) => <strong className="font-bold text-blue-400" {...props} />,
                    a: ({node, ...props}) => (
                        <a 
                            className="text-blue-400 hover:underline cursor-pointer bg-blue-500/10 px-1 rounded mx-0.5 text-sm font-medium inline-block" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            {...props} 
                        />
                    )
                  }}
                >
                  {finalVisibleText}
                </ReactMarkdown>
              )}
          </div>

          {locationList.length > 0 && (
              <div className="mt-4 mb-4">
                  {locationList.length >= 3 && (
                      <LocationMap locations={locationList} className="mb-4" />
                  )}
                  <div className="flex flex-col gap-4">
                      {locationList.map((loc, idx) => (
                          <LocationCard key={idx} data={loc} theme={theme} />
                      ))}
                  </div>
              </div>
          )}

          {!isUser && !message.isStreaming && (sources.length > 0 || finalVisibleText || hasSpecialCard) && (
              <div className="flex flex-col mt-3">
                  {sources.length > 0 && (
                      <>
                        {/* Search Success Indicator */}
                        <div className={`text-xs ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'} mb-2 flex items-center gap-1.5 font-medium animate-fade-in`}>
                            <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/50">
                                <svg className="w-2.5 h-2.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            </div>
                            Đã tìm kiếm {sources.length} nguồn
                        </div>
                        <div className="flex flex-wrap gap-2 mb-3">
                            {sources.map((chunk, idx) => (
                                <SourceChip key={idx} chunk={chunk} index={idx} theme={theme} />
                            ))}
                        </div>
                      </>
                  )}

                  {!isTyping && (finalVisibleText || hasSpecialCard) && (
                    <div className="flex items-center gap-1 pt-1 border-t border-white/5 mt-1">
                        {isVoiceSupported && (
                        <button 
                            onClick={handleSpeak}
                            className={`p-1.5 rounded-md transition-colors ${theme === 'light' ? 'text-gray-400 hover:text-blue-500 hover:bg-blue-50' : 'text-gray-500 hover:text-blue-400 hover:bg-blue-500/10'}`}
                            title={isSpeaking ? t('stopReading') : t('readAloud')}
                        >
                            {isLoadingSpeech ? (
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            ) : isSpeaking ? (
                                <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                </svg>
                            )}
                        </button>
                        )}
                        <button 
                            onClick={handleCopyMessage} 
                            className={`p-1.5 rounded-md transition-colors ${theme === 'light' ? 'text-gray-400 hover:text-gray-700 hover:bg-gray-100' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                            title={t('copy')}
                        >
                            {msgCopied ? (
                                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><polyline points="20 6 9 17 4 12"/></svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                            )}
                        </button>
                        {onRegenerate && (
                            <button 
                                onClick={() => onRegenerate(index)}
                                className={`p-1.5 rounded-md transition-colors ${theme === 'light' ? 'text-gray-400 hover:text-blue-500 hover:bg-blue-50' : 'text-gray-500 hover:text-blue-400 hover:bg-blue-500/10'}`}
                                title={t('regenerate')}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                            </button>
                        )}
                    </div>
                  )}
              </div>
          )}
        </div>
      </div>

      {lightboxImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-full max-h-full">
            <img 
              src={lightboxImage} 
              alt="Full view" 
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            />
            <button 
              className="absolute top-4 right-4 bg-black/50 hover:bg-black/80 text-white rounded-full p-2 transition-colors"
              onClick={() => setLightboxImage(null)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-4">
                 <button 
                    onClick={(e) => handleImageDownload(e, lightboxImage)}
                    className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full backdrop-blur font-medium flex items-center gap-2 transition-colors"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    {t('download')}
                 </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const MessageBubble = memo(MessageBubbleComponent);
