
export interface GroundingMetadata {
  groundingChunks?: Array<{
    web?: {
      uri?: string;
      title?: string;
    };
  }>;
  searchEntryPoint?: {
    renderedContent?: string;
  };
}

export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  image?: string; // Deprecated: Single image support for backward compatibility
  images?: string[]; // Deprecated: kept for backward compatibility
  attachments?: string[]; // New: Support for any file type (Images, PDFs, Audio, etc.)
  isStreaming?: boolean;
  isSearching?: boolean; // New: Tracks if the model is currently performing a search
  groundingMetadata?: GroundingMetadata;
  thinkingDuration?: number; // Duration in seconds
  audioData?: string; // Base64 raw PCM audio data
  timestamp?: number; // For real-time calculations
  modelMode?: 'fast' | 'smart' | 'super' | 'deep'; // Track which model was used
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  botId?: string; // Links this session to a specific bot persona
}

export interface Bot {
  id: string;
  name: string;
  description: string;
  icon: string;
  systemInstruction: string;
  isOfficial: boolean;
  color?: string;
  badge?: string; // Badge label (e.g., "HOT", "NEW")
}