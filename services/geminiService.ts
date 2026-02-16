
// DO add comment above each fix.
import { GoogleGenAI, Content, Part, Modality, LiveServerMessage, ThinkingLevel } from "@google/genai";
import { ChatMessage, Role } from '../types';

// FIX: Removed "declare const process: any" to prevent runtime ReferenceError.
// We will use a safe accessor function instead.

// FIX: Added safe API Key retrieval function that works in Vite and other environments.
const getApiKey = () => {
  // 1. Check for Vite environment (standard for React)
  // We use optional chaining and typeof check to be safe
  // FIX: Cast import.meta to any to avoid TS error: Property 'env' does not exist on type 'ImportMeta'.
  if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_API_KEY) {
    return (import.meta as any).env.VITE_API_KEY;
  }
  
  // 2. Check for Webpack/Node environment (process.env)
  // We use "typeof process" to ensure we don't crash if process is missing
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    return process.env.API_KEY;
  }
  
  return "";
};

// Parse API Keys: Split by comma to support multiple keys for rotation/fallback
const API_KEYS = getApiKey()
  .split(',')
  .map((k: string) => k.trim())
  .filter((k: string) => k.length > 0);

let currentKeyIndex = 0;

// Helper to get the next key in rotation
const getNextKey = () => {
  if (API_KEYS.length === 0) return "";
  const key = API_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  return key;
};

// Helper for delay (backoff)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// UPDATED: Added 'deep' mode
export type ModelMode = 'fast' | 'smart' | 'super' | 'deep';
// FIX: Removed 'grumpy' from MoodId
export type MoodId = 'default' | 'friendly' | 'professional' | 'sassy' | 'genz' | 'poetic';

// --- Gatekeeper Service ---

export const gatekeeperCheck = async (query: string): Promise<boolean> => {
    // Fail safe if no key
    if (API_KEYS.length === 0) return false;

    const apiKey = getNextKey();
    const ai = new GoogleGenAI({ apiKey });

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: {
                role: 'user',
                parts: [{ text: `Query: "${query}"` }]
            },
            config: {
                systemInstruction: `You are the Gatekeeper. Your ONLY job is to decide if the user's query requires Google Search. 
Answer 'Yes' if:
1. The query asks for real-time information (weather, stock prices, sports scores, current news).
2. The query asks about specific recent events, places, or people facts that might need verification.
3. The query explicitly asks to "search" or "find".
Answer 'No' if:
1. The query is creative writing, coding, math, translation, or general knowledge.
2. The query is a greeting or small talk.
Answer ONLY 'Yes' or 'No'.`,
                temperature: 0, // Deterministic
                maxOutputTokens: 5 // Very short response
            }
        });

        const text = response.text?.trim().toLowerCase() || "";
        return text.includes("yes");
    } catch (e) {
        console.warn("Gatekeeper check failed, defaulting to No search:", e);
        return false;
    }
};

// --- Verification Service ---

export const generateVerificationPhrase = async (): Promise<string> => {
    // Retry up to 3 times to ensure AI generates the phrase
    const maxRetries = 3;
    let lastError = null;

    for (let i = 0; i < maxRetries; i++) {
        const apiKey = getNextKey();
        if (!apiKey) throw new Error("Chưa cấu hình API_KEY."); // Fail fast if no key

        const ai = new GoogleGenAI({ apiKey });
        
        try {
            // FIX: Used gemini-2.5-flash and specific system instruction as requested
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: {
                    role: 'user',
                    parts: [{ text: "generate" }]
                },
                config: {
                    // UPDATED: Changed from 5 words to 3 words
                    systemInstruction: "You are an AI that only generate phrase with 3 word, and not anything else. Simple english words, lowercase, no punctuation.",
                    temperature: 1.1,
                    maxOutputTokens: 50
                }
            });

            const text = response.text || "";
            // FIX: Relaxed validation. Just clean up basic formatting and use the output.
            // Removing markdown symbols and excessive whitespace, keeping alphanumeric + spaces.
            const cleanText = text.replace(/[\r\n*`]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
            
            if (cleanText.length > 0) {
                return cleanText;
            }
            
            console.warn(`Verification phrase empty (Attempt ${i+1})`);
        } catch (e) {
            lastError = e;
            console.warn(`Verification phrase generation error (Attempt ${i+1}):`, e);
        }
    }

    // Fallback if all retries fail to prevent crash
    return "blue sky green"; 
};

// --- Live Classes ---

export class LiveClient {
    public onDisconnect: () => void = () => {};
    private session: any = null;
    private inputAudioContext: AudioContext | null = null;
    private outputAudioContext: AudioContext | null = null;
    private stream: MediaStream | null = null;
    private nextStartTime: number = 0;
    private sources: Set<AudioBufferSourceNode> = new Set();
    private processor: ScriptProcessorNode | null = null;
    private source: MediaStreamAudioSourceNode | null = null;

    constructor() {}

    async connect() {
        if (API_KEYS.length === 0) throw new Error("Chưa cấu hình API_KEY.");
        const apiKey = getNextKey();
        const ai = new GoogleGenAI({ apiKey });

        this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 16000});
        this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
        
        const outputNode = this.outputAudioContext!.createGain();
        outputNode.connect(this.outputAudioContext!.destination);

        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        const sessionPromise = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-12-2025',
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
                },
                systemInstruction: "You are a friendly and helpful AI assistant named Oceep, developed by FoxAI (Nguyen Huy Vu).",
            },
            callbacks: {
                onopen: () => {
                    // console.log("Live Session Connected");
                    this.source = this.inputAudioContext!.createMediaStreamSource(this.stream!);
                    this.processor = this.inputAudioContext!.createScriptProcessor(4096, 1, 1);
                    
                    this.processor.onaudioprocess = (e) => {
                        const inputData = e.inputBuffer.getChannelData(0);
                        const pcmBlob = createBlob(inputData);
                        sessionPromise.then(session => {
                             session.sendRealtimeInput({ media: pcmBlob });
                        });
                    };

                    this.source.connect(this.processor);
                    this.processor.connect(this.inputAudioContext!.destination);
                },
                onmessage: async (msg: LiveServerMessage) => {
                    const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                    if (base64Audio && this.outputAudioContext) {
                        try {
                            const audioBuffer = await decodeAudioData(
                                decode(base64Audio),
                                this.outputAudioContext,
                                24000,
                                1
                            );
                            
                            this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
                            const source = this.outputAudioContext.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputNode);
                            source.start(this.nextStartTime);
                            this.nextStartTime += audioBuffer.duration;
                            
                            this.sources.add(source);
                            source.onended = () => this.sources.delete(source);
                        } catch (e) {
                            console.error("Audio Decode Error", e);
                        }
                    }
                    
                    if (msg.serverContent?.interrupted) {
                        this.sources.forEach(s => s.stop());
                        this.sources.clear();
                        this.nextStartTime = 0;
                    }
                },
                onclose: () => {
                    this.disconnect();
                },
                onerror: (e) => {
                    this.disconnect();
                }
            }
        });

        this.session = sessionPromise;
    }

    disconnect() {
        if (this.processor) {
            this.processor.disconnect();
            this.processor.onaudioprocess = null;
        }
        if (this.source) {
            this.source.disconnect();
        }
        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop());
        }
        if (this.inputAudioContext) {
            this.inputAudioContext.close();
        }
        if (this.outputAudioContext) {
            this.outputAudioContext.close();
        }
        
        this.session?.then((s: any) => s.close && s.close());

        this.session = null;
        this.inputAudioContext = null;
        this.outputAudioContext = null;
        this.stream = null;
        this.onDisconnect();
    }
}

// Helpers for Live API
function createBlob(data: Float32Array): any { 
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function decode(base64: string) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// --- Audio Utilities ---

function base64ToArrayBuffer(base64: string) {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

export const playPCMData = async (base64Data: string): Promise<() => void> => {
    try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const arrayBuffer = base64ToArrayBuffer(base64Data);
        
        const dataView = new DataView(arrayBuffer);
        const numChannels = 1;
        const sampleRate = 24000;
        const numSamples = arrayBuffer.byteLength / 2;
        const audioBuffer = audioContext.createBuffer(numChannels, numSamples, sampleRate);
        const channelData = audioBuffer.getChannelData(0);

        for (let i = 0; i < numSamples; i++) {
            const int16 = dataView.getInt16(i * 2, true);
            channelData[i] = int16 / 32768.0;
        }

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.playbackRate.value = 1.1;
        source.connect(audioContext.destination);
        source.start();

        return () => {
            try {
                source.stop();
                source.disconnect();
                audioContext.close();
            } catch (e) {}
        };
    } catch (e) {
        throw new Error("Không thể phát âm thanh.");
    }
};

export const generateSpeech = async (text: string): Promise<string> => {
    if (API_KEYS.length === 0) throw new Error("Chưa cấu hình API_KEY.");

    const maxAttempts = Math.max(API_KEYS.length * 3, 5);
    let lastError: any = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const apiKey = getNextKey();
        const ai = new GoogleGenAI({ apiKey });

        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: 'Gacrux' },
                        },
                    },
                },
            });

            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (!base64Audio) throw new Error("Không nhận được dữ liệu âm thanh.");
            return base64Audio;
        } catch (error: any) {
            lastError = error;
            await delay(1000);
        }
    }
    throw new Error(lastError?.message || "Lỗi tạo giọng nói.");
};

// --- Image Generation ---

const processGeneratedImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) { resolve(base64Str); return; }

            const width = img.width;
            const height = img.height;
            canvas.width = width;
            canvas.height = height;

            const cropPercentage = 0.015;
            const cropX = Math.floor(width * cropPercentage);
            const cropY = Math.floor(height * cropPercentage);
            const cropW = width - (cropX * 2);
            const cropH = height - (cropY * 2);

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'medium'; 
            ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, width, height);

            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;
            
            for (let i = 0; i < data.length; i += 4) {
                data[i] = data[i] & 0xFC;     
                data[i+1] = data[i+1] & 0xFC; 
                data[i+2] = data[i+2] & 0xFC; 
            }
            
            ctx.putImageData(imageData, 0, 0);
            const processed = canvas.toDataURL('image/jpeg', 0.98);
            resolve(processed);
        };
        img.onerror = () => resolve(base64Str);
        img.src = base64Str;
    });
};

export const generateImageWithGemini = async (prompt: string, inputImagesBase64?: string[]): Promise<string> => {
  if (API_KEYS.length === 0) throw new Error("Chưa cấu hình API_KEY.");

  let lastError: any = null;
  const maxAttempts = Math.max(API_KEYS.length * 3, 5);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const apiKey = getNextKey();
      const ai = new GoogleGenAI({ apiKey });

      try {
          const parts: Part[] = [];
          if (inputImagesBase64 && inputImagesBase64.length > 0) {
              for (const img of inputImagesBase64) {
                  const match = img.match(/^data:([^;]+);base64,(.+)$/);
                  if (match) {
                      parts.push({
                          inlineData: { mimeType: match[1], data: match[2] }
                      });
                  }
              }
          }
          parts.push({ text: prompt });

          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: { parts: parts },
              config: {}
          });

          if (response.candidates?.[0]?.content?.parts) {
              for (const part of response.candidates[0].content.parts) {
                  if (part.inlineData && part.inlineData.data) {
                      const mimeType = part.inlineData.mimeType || 'image/png';
                      const rawBase64 = `data:${mimeType};base64,${part.inlineData.data}`;
                      return await processGeneratedImage(rawBase64);
                  }
              }
          }
          throw new Error("Không tìm thấy ảnh trong phản hồi.");
      } catch (error: any) {
          lastError = error;
          await delay(1000);
      }
  }
  throw new Error(lastError?.message || "Không thể tạo ảnh.");
};

// --- Chat Completion ---

const getMoodInstruction = (mood: MoodId): string => {
    switch (mood) {
        case 'friendly':
            return `
PERSONALITY: Bạn là một người bạn thân thiết, cực kỳ ấm áp và nhiệt tình.
TONE: Vui vẻ, khích lệ, luôn quan tâm.
FORMATTING: Sử dụng nhiều emoji dễ thương (😊, ✨, 💖, 🌸).
STYLE: Xưng hô "mình" và "bạn". Luôn tìm điểm tích cực.`;
        case 'professional':
            return `
PERSONALITY: Bạn là chuyên gia cấp cao, tập trung vào hiệu quả.
TONE: Trang trọng, khách quan, ngắn gọn.
FORMATTING: Không dùng emoji. Dùng gạch đầu dòng.`;
        case 'sassy':
            return `
PERSONALITY: Bạn là AI "xéo xắt", đanh đá nhưng thông minh.
TONE: Hài hước, châm biếm, hơi "chảnh".
FORMATTING: Dùng emoji biểu cảm mạnh (🙄, 💅, ☕).`;
        case 'genz':
            return `
PERSONALITY: Bạn là Gen Z, bắt trend.
TONE: Trẻ trung, dùng slang (keo lỳ, mãi mận, no cap).
FORMATTING: Dùng emoji bựa (💀, 😭, 🔥).`;
        case 'poetic':
            return `
PERSONALITY: Bạn là thi sĩ lãng mạn.
TONE: Nhẹ nhàng, bay bổng, văn vẻ.`;
        case 'default':
        default:
            return `
PERSONALITY: Bạn là trợ lý AI hữu ích.
TONE: Cân bằng, lịch sự và thông minh.`;
    }
};

const TODO_SYSTEM_INSTRUCTION = `
PERSONALITY: Bạn là trợ lý "To-Do Planner" chuyên nghiệp.
NHIỆM VỤ: Giúp người dùng lên kế hoạch, sắp xếp công việc.
QUY TẮC QUAN TRỌNG:
1. LUÔN LUÔN tạo ra một cấu trúc JSON bên trong khối :::todo ... ::: khi người dùng yêu cầu lập kế hoạch.
2. TUYỆT ĐỐI KHÔNG dùng markdown block (ví dụ: \`\`\`json) bên trong khối :::todo :::. Chỉ viết raw JSON.
3. Sử dụng "thinking process".

ĐỊNH DẠNG JSON BẮT BUỘC:
:::todo
{
  "title": "Tiêu đề kế hoạch",
  "sections": [
    {
      "title": "Tên mục",
      "color": "blue", 
      "tasks": [
         { "id": "u1", "text": "Task 1", "done": false }
      ]
    }
  ]
}
:::
`;

// ENHANCED SEARCH INSTRUCTION (Weather + Location + NEW CARDS)
const SEARCH_ENHANCEMENT_INSTRUCTION = `
*** SEARCH ENHANCEMENT PROTOCOLS ***
You are equipped with Google Search. When the user asks for specific real-world information, you MUST use the search tool and format the data using the following specific JSON blocks.
IMPORTANT: Do NOT wrap the JSON in markdown code blocks (like \`\`\`json). Just use the :::block::: delimiters.

1. [WEATHER]
   :::weather
   {
     "location": "City, Country",
     "current": { "temp": 25, "unit": "C", "condition": "Cloudy", "desc": "Light rain later", "high": 28, "low": 22 },
     "hourly": [ {"time": "14:00", "temp": 26, "icon": "cloudy"}, ... ],
     "daily": [ {"day": "Mon", "icon": "sun", "high": 30, "low": 24, "condition": "Sunny"}, ... ]
   }
   :::

2. [LOCATION/PLACE]
   If information like 'website' or 'phoneNumber' is NOT available or NOT 100% verified, DO NOT invent it. Omit the field or leave it blank.
   Only provide a valid, functional URL for the 'website' field.
   Try to find AUTHENTIC images of the specific location from search results.
   Provide up to 4 real image URLs in the 'images' array. If you can't find multiple, provide at least one in 'imageUrl' or 'images'.
   DO NOT use generic stock photos or images from other locations.
   :::location
   {
     "name": "Name of Place",
     "description": "Short summary.",
     "address": "123 Street Name",
     "rating": 4.5,
     "openStatus": "Open Now",
     "imageUrl": "https://real-site.com/main-image.jpg",
     "images": ["https://real-site.com/img1.jpg", "https://real-site.com/img2.jpg"],
     "latitude": 37.7749,
     "longitude": -122.4194,
     "website": "https://example.com",
     "phoneNumber": "+123456789"
   }
   :::

3. [STOCK/CRYPTO]
   If user asks for stock price, crypto price, or market data.
   :::stock
   {
     "symbol": "AAPL",
     "name": "Apple Inc.",
     "price": 150.25,
     "currency": "USD",
     "change": "+1.25",
     "changePercent": "+0.85%",
     "isUp": true,
     "high": 151.00,
     "low": 149.50
   }
   :::

4. [CURRENCY CONVERSION]
   If user asks to convert currency (e.g. "100 USD to VND").
   NOTE: Only support FIAT currencies (USD, EUR, VND, JPY, etc.). Do not support CRYPTO coins in this tool.
   :::currency
   {
     "fromCurrency": "USD",
     "toCurrency": "VND",
     "fromAmount": 100,
     "toAmount": 2540000,
     "rate": 25400
   }
   :::

5. [SPORTS SCORE]
   If user asks for match results or live scores.
   Please try to find valid image URLs for team logos if possible.
   :::sport
   {
     "league": "Premier League",
     "homeTeam": "Man Utd",
     "awayTeam": "Chelsea",
     "homeScore": 2,
     "awayScore": 1,
     "status": "Full Time",
     "startTime": "2024-05-20T19:00:00Z",
     "homeTeamLogo": "https://logo-url.com/manutd.png",
     "awayTeamLogo": "https://logo-url.com/chelsea.png"
   }
   :::

6. [FLIGHTS]
   If user looks for flights.
   :::flight
   {
     "airline": "Vietnam Airlines",
     "flightNumber": "VN218",
     "departure": { "code": "SGN", "time": "08:00", "city": "Ho Chi Minh City" },
     "arrival": { "code": "HAN", "time": "10:10", "city": "Hanoi" },
     "duration": "2h 10m",
     "price": "2,500,000 VND"
   }
   :::

7. [CALCULATOR/MATH]
   If user asks for a calculation.
   :::calc
   {
     "expression": "125 * 40 + 500",
     "result": "5,500"
   }
   :::

8. [TIME ZONE]
   If user asks for time in a location.
   :::time
   {
     "location": "New York, USA",
     "time": "14:30",
     "date": "Mon, Oct 25",
     "timezone": "EST (UTC-5)"
   }
   :::

ALWAYS follow the JSON block with a natural language summary.
`;

// NEW: Teacher System Instruction
const TEACHER_SYSTEM_INSTRUCTION = `
ROLE: Bạn là Trợ lý Giáo dục ảo (Oceep Teacher Mode), một chuyên gia sư phạm đầy kinh nghiệm và tận tâm.
AUDIENCE: Giáo viên, nhà giáo dục, học sinh và phụ huynh.

NHIỆM VỤ CHÍNH:
1. Hỗ trợ soạn giáo án, thiết kế bài giảng, tạo đề kiểm tra và rubric chấm điểm.
2. Tư vấn phương pháp giảng dạy, quản lý lớp học và tâm lý học đường.
3. Giải thích kiến thức chuyên môn một cách chính xác, sư phạm và dễ hiểu.

QUY TẮC BẮT BUỘC (STRICT RULES):
1. TẬP TRUNG TUYỆT ĐỐI VÀO GIÁO DỤC: Chỉ trả lời các câu hỏi liên quan đến học tập, giảng dạy, trường lớp và kiến thức.
2. TỪ CHỐI CÁC CÂU HỎI NGOẠI LỆ: Nếu người dùng hỏi về các chủ đề không liên quan (ví dụ: viết code game không vì mục đích học tập, kể chuyện cười nhảm nhí, bàn luận chính trị nhạy cảm, giải trí thuần túy...), hãy lịch sự từ chối và hướng họ quay lại các chủ đề giáo dục.
   - Ví dụ từ chối: "Xin lỗi, tôi đang ở Chế độ Giáo Viên nên chỉ có thể hỗ trợ các nội dung liên quan đến giáo dục và học tập. Thầy/Cô/Bạn có cần giúp đỡ gì về bài giảng hay kiến thức không ạ?"
3. PHONG THÁI: Trang trọng, chuẩn mực, khích lệ và mang tính xây dựng. Sử dụng ngôn từ phù hợp với môi trường sư phạm.
`;

// NEW: Valentine System Instruction
const VALENTINE_SYSTEM_INSTRUCTION = `
ROLE: Bạn là "Oceep Cupid" - Chuyên gia tình yêu, sự lãng mạn và cảm xúc.
TONE: Ngọt ngào, tinh tế, ấm áp và cực kỳ lãng mạn (Sử dụng nhiều emoji trái tim, hoa hồng 💖, 🌹, 🥰).

NHIỆM VỤ CHÍNH:
1. Tư vấn tình cảm: Giúp người dùng giải quyết các vấn đề trong tình yêu, cách tỏ tình, cách làm lành.
2. Lên kế hoạch hẹn hò: Gợi ý địa điểm, ý tưởng hẹn hò lãng mạn, độc đáo.
3. Soạn thảo lời yêu thương: Viết thư tình, tin nhắn chúc mừng Valentine, caption thả thính.
4. Gợi ý quà tặng: Tư vấn quà tặng ý nghĩa, phù hợp với đối phương.

QUY TẮC:
- Luôn giữ thái độ tích cực, ủng hộ tình yêu lành mạnh.
- Lời văn phải trau chuốt, giàu cảm xúc, như một nhà thơ hoặc người bạn tâm giao.
`;

// NEW: Stress System Instruction
const STRESS_SYSTEM_INSTRUCTION = `
ROLE: Bạn là "Oceep Healing" - Một người bạn tâm giao, chuyên gia lắng nghe và chữa lành tâm hồn.
TONE: Nhẹ nhàng, ân cần, thấu hiểu, bình tĩnh và không phán xét (Sử dụng emoji thiên nhiên, thư giãn 🌿, 🍵, 🧘‍♀️).

NHIỆM VỤ CHÍNH:
1. Lắng nghe tích cực: Khuyến khích người dùng chia sẻ nỗi lo, sự mệt mỏi. Đặt câu hỏi mở để họ trải lòng.
2. An ủi & Khích lệ: Dùng lời lẽ xoa dịu, xác nhận cảm xúc của người dùng ("Mình hiểu bạn đã vất vả rồi", "Không sao đâu, bạn đã làm rất tốt").
3. Gợi ý giải pháp giảm stress: Hướng dẫn hít thở, thiền, nghe nhạc, hoặc các bài tập thư giãn đơn giản ngay tại chỗ.
4. KHÔNG thúc ép, KHÔNG đưa ra lời khuyên sáo rỗng. Tập trung vào sự đồng cảm.

QUY TẮC:
- Tránh dùng từ ngữ mạnh, gay gắt.
- Luôn tạo không gian an toàn, ấm áp cho người dùng.
`;

export const streamGeminiResponse = async function* (
  history: ChatMessage[],
  newMessage: string,
  userEnabledSearch: boolean,
  attachmentsBase64?: string[], 
  isTutorMode: boolean = false,
  modelMode: ModelMode = 'fast',
  mood: MoodId = 'default',
  customSystemInstruction?: string,
  botId?: string, 
  userNickname: string = "User",
  specialMode?: string // NEW param
): AsyncGenerator<string | any, void, unknown> {
  
  if (API_KEYS.length === 0) throw new Error("Chưa cấu hình API_KEY.");

  let modelName = 'gemini-3-flash-preview'; 
  let thinkingConfig: { thinkingLevel?: ThinkingLevel, includeThoughts?: boolean } | undefined = undefined;

  // Logic to determine model and thinking config
  if (userEnabledSearch && modelMode !== 'deep') {
      modelName = 'gemini-3-flash-preview';
      thinkingConfig = undefined; 
  } else if (botId === 'bot-todo-special' || botId === 'bot-teacher-pro') {
      modelName = 'gemini-3-pro-preview';
      thinkingConfig = { includeThoughts: true, thinkingLevel: ThinkingLevel.HIGH };
  } else {
      switch (modelMode) {
          case 'fast':
              modelName = 'gemini-3-flash-preview';
              thinkingConfig = { includeThoughts: false }; 
              break;
          case 'smart':
              modelName = 'gemini-3-flash-preview';
              thinkingConfig = { includeThoughts: true, thinkingLevel: ThinkingLevel.HIGH }; 
              break;
          case 'super':
              modelName = 'gemini-3-pro-preview';
              thinkingConfig = { includeThoughts: true, thinkingLevel: ThinkingLevel.HIGH };
              break;
          case 'deep':
              modelName = 'gemini-3-pro-preview';
              thinkingConfig = { includeThoughts: true, thinkingLevel: ThinkingLevel.HIGH };
              break;
          default:
              modelName = 'gemini-3-flash-preview';
              thinkingConfig = undefined;
      }
  }

  // --- System Instruction Construction ---
  let systemInstructionString = "";
  const IDENTITY_HEADER = `You are Oceep, a friendly, helpful, and intelligent AI assistant developed by FoxAI (Founded by Nguyen Huy Vu).
CORE INSTRUCTIONS:
1. Be helpful, harmless, and honest.
2. Provide accurate and relevant information.
3. User Nickname: "${userNickname}". Use it naturally.
`;

  if (specialMode === 'teacher') {
      systemInstructionString = `${IDENTITY_HEADER}\n${TEACHER_SYSTEM_INSTRUCTION}`;
  } else if (specialMode === 'valentine') {
      systemInstructionString = `${IDENTITY_HEADER}\n${VALENTINE_SYSTEM_INSTRUCTION}`;
  } else if (specialMode === 'stress') {
      systemInstructionString = `${IDENTITY_HEADER}\n${STRESS_SYSTEM_INSTRUCTION}`;
  } else if (botId === 'bot-todo-special') {
      systemInstructionString = `${IDENTITY_HEADER}\n${TODO_SYSTEM_INSTRUCTION}`;
  } else if (customSystemInstruction) {
      systemInstructionString = `${IDENTITY_HEADER}\n${customSystemInstruction}`;
  } else if (isTutorMode) {
      systemInstructionString = `${IDENTITY_HEADER}\nROLE: Socratic Tutor. Guide, don't give answers directly.`;
  } else {
      systemInstructionString = `${IDENTITY_HEADER}\n${getMoodInstruction(mood)}`;
  }

  if (modelMode === 'deep' || userEnabledSearch) {
      systemInstructionString += `\n*** SEARCH & CITATION RULES ***\n1. Use [1], [2] for citations.\n2. Verify facts.`;
      // Append enhanced search instructions
      systemInstructionString += `\n${SEARCH_ENHANCEMENT_INSTRUCTION}`;
  }
  
  if (modelMode === 'deep') {
      systemInstructionString += `\n*** DEEP RESEARCH ***\nProvide long, detailed, comprehensive responses.`;
  }

  // FORCE Fake Thinking for models if they don't support native or if we want to ensure it
  if (['smart', 'super', 'deep'].includes(modelMode)) {
      systemInstructionString += `
\n*** THOUGHT PROCESS ***
Before answering, generate a "Thinking Block" explaining your reasoning.
Format:
<think>
[Reasoning, analysis, search strategy]
</think>
[Final Answer]
`;
  }

  const contents: Content[] = history.map(msg => {
      if (msg.role === Role.MODEL) return { role: msg.role, parts: [{ text: msg.content || ' ' }] };
      return {
          role: msg.role,
          parts: msg.attachments && msg.attachments.length > 0 
            ? [...msg.attachments.map(att => {
                   const match = att.match(/^data:([^;]+);base64,(.+)$/);
                   return match ? { inlineData: { mimeType: match[1], data: match[2] } } : null;
                }).filter(p => p !== null) as Part[], { text: msg.content || ' ' }]
            : [{ text: msg.content || ' ' }]
      };
  });

  const newParts: Part[] = [];
  if (attachmentsBase64?.length) {
      for (const att of attachmentsBase64) {
          const match = att.match(/^data:([^;]+);base64,(.+)$/);
          if (match) newParts.push({ inlineData: { mimeType: match[1], data: match[2] } });
      }
  }
  newParts.push({ text: newMessage || ' ' }); 
  contents.push({ role: Role.USER, parts: newParts });

  let attemptCount = 0;
  const maxAttempts = Math.max(API_KEYS.length * 3, 5);

  while (attemptCount < maxAttempts) {
      try {
          const apiKey = getNextKey();
          const ai = new GoogleGenAI({ apiKey });

          // Configure Tools
          let tools: any[] = [];
          
          if (modelMode === 'deep' || userEnabledSearch) {
              tools.push({ googleSearch: {} });
          }

          // Enable code execution for smart/super/deep models OR if request implies math/code
          const isMathOrCode = newMessage.match(/count|tính|đếm|bao nhiêu|how many|calculate|math|code|python/i);
          if (['smart', 'super', 'deep'].includes(modelMode) || isMathOrCode) {
              tools.push({ codeExecution: {} });
              // Upgrade to Pro model if needed for complex execution
              if (modelName === 'gemini-3-flash-preview') {
                  modelName = 'gemini-3-pro-preview';
                  // Adjust thinking config if we switched to Pro
                  if (!thinkingConfig) {
                      thinkingConfig = { includeThoughts: true, thinkingLevel: ThinkingLevel.HIGH };
                  }
              }
          }

          const responseStream = await ai.models.generateContentStream({
              model: modelName,
              contents: contents,
              config: {
                  systemInstruction: systemInstructionString,
                  thinkingConfig: thinkingConfig, 
                  tools: tools.length > 0 ? tools : undefined,
              }
          });

          // State for tracking local thinking block from metadata
          let isThinking = false;

          for await (const chunk of responseStream) {
              const candidate = (chunk as any).candidates?.[0];
              
              if (candidate?.groundingMetadata) {
                  yield { groundingMetadata: candidate.groundingMetadata };
              }

              if (candidate?.content?.parts) {
                  for (const part of candidate.content.parts) {
                      const p = part as any;
                      
                      // Handle Native Thinking
                      if (p.thought) {
                          if (!isThinking) {
                              yield '<think>';
                              isThinking = true;
                          }
                          yield p.thought;
                      } else {
                          // Close thought block if previously thinking
                          if (isThinking) {
                              yield '</think>';
                              isThinking = false;
                          }

                          // Handle Code Execution
                          if (p.executableCode) {
                              yield `\n\`\`\`python\n${p.executableCode.code}\n\`\`\`\n`;
                          }

                          if (p.codeExecutionResult) {
                              const outcome = p.codeExecutionResult.outcome === 'OUTCOME_OK' ? 'Output' : 'Error';
                              yield `\n> **${outcome}:**\n\`\`\`\n${p.codeExecutionResult.output}\n\`\`\`\n`;
                          }

                          if (p.text) {
                              yield p.text;
                          }
                      }
                  }
              } else {
                  // Fallback for simple text chunks
                  let text = '';
                  try { text = chunk.text || ''; } catch(e) {}
                  if (text) {
                      if (isThinking) { yield '</think>'; isThinking = false; }
                      yield text;
                  }
              }
          }
          
          if (isThinking) { yield '</think>'; }
          return;

      } catch (error: any) {
          attemptCount++;
          const msg = (error.message || "").toLowerCase();
          if (attemptCount >= maxAttempts) throw error;
          await delay(msg.includes("429") ? 1500 * attemptCount : 1000);
      }
  }
};
