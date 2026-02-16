
import { createClient } from '@supabase/supabase-js';
import { ChatSession, ChatMessage, Role } from '../types';

// Use import.meta.env for Vite compatibility
// FIX: Cast import.meta to any to avoid TS error.
const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

// FALLBACK CREDENTIALS (Used if env vars fail, though env is preferred)
const FALLBACK_URL = "https://eezpcbhkqrfxyxyiorrz.supabase.co";
const FALLBACK_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlenBjYmhrcXJmeHl4eWlvcnJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MDMzNjMsImV4cCI6MjA4NTE3OTM2M30.HMxj0vPTFEfH3JJpzkRlFIHjjvq2Zz1_vJc3a0duXmU";

const supabaseUrl = (envUrl && envUrl.length > 10) ? envUrl : FALLBACK_URL;
const supabaseAnonKey = (envKey && envKey.length > 10) ? envKey : FALLBACK_KEY;

const isValidClient = () => {
  return supabaseUrl && !supabaseUrl.includes('placeholder') && supabaseAnonKey && !supabaseAnonKey.includes('placeholder');
}

if (!isValidClient()) {
  console.warn("Supabase credentials missing or invalid.");
}

export const supabase = createClient(
  supabaseUrl, 
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    }
  }
);

async function withRetry<T>(operation: () => Promise<T>, retries = 3, delay = 500): Promise<T> {
    try {
        return await operation();
    } catch (error: any) {
        if (retries > 0 && (error.message?.includes('Failed to fetch') || error.message?.includes('Network request failed'))) {
            await new Promise(resolve => setTimeout(resolve, delay));
            return withRetry(operation, retries - 1, delay * 2);
        }
        throw error;
    }
}

// --- NEW ARCHITECTURE: Conversations & Messages ---

// 1. Save or Update a Conversation (Session)
export const saveConversation = async (session: ChatSession, userId: string) => {
    // CHANGE #3: Stop Silent Returns. Log loud errors.
    if (!isValidClient()) {
        console.warn("[Supabase] Client invalid. Skipping saveConversation.");
        return;
    }
    
    // Validate Inputs
    if (!userId) {
        console.error("❌ [Supabase] saveConversation FAILED: Missing user_id. Auth race condition suspected.", { session_id: session.id });
        return;
    }
    if (!session.id) {
        console.error("❌ [Supabase] saveConversation FAILED: Missing session.id.", { userId });
        return;
    }

    // CHANGE #7: Debug Log
    // console.log("📝 [Supabase] Saving Conversation:", { id: session.id, title: session.title, user_id: userId });

    const operation = async () => {
        const { error } = await supabase.from('conversations').upsert({
            id: session.id,
            user_id: userId,
            title: session.title,
            bot_id: session.botId,
            created_at: new Date(session.createdAt).toISOString()
        });
        if (error) {
            console.error("🔥 [Supabase] DB Insert Error (Conversation):", error);
            throw error;
        }
    };

    try {
        await withRetry(operation);
    } catch (err: any) {
        // Silently fail on 404/missing table to allow offline usage
        if (err.code === '42P01') {
            console.warn("[Supabase] Table 'conversations' does not exist. Skipping.");
            return; 
        }
        console.error('[Supabase] CRITICAL Error saving conversation:', err.message);
    }
};

// 2. Save a Single Message
export const saveMessage = async (message: ChatMessage, sessionId: string, userId: string) => {
    if (!isValidClient()) return;

    // CHANGE #3: Stop Silent Returns.
    if (!userId) {
        console.error("❌ [Supabase] saveMessage FAILED: Missing user_id. Message NOT saved.", { messageId: message.id, sessionId });
        return;
    }
    if (!sessionId) {
        console.error("❌ [Supabase] saveMessage FAILED: Missing sessionId. Message NOT saved.", { messageId: message.id, userId });
        return;
    }

    // CHANGE #7: Debug Log
    // console.log("📝 [Supabase] Saving Message:", { id: message.id, conversation_id: sessionId, user_id: userId, role: message.role });

    const operation = async () => {
        const { error } = await supabase.from('messages').upsert({
            id: message.id,
            conversation_id: sessionId,
            user_id: userId, // Ensure user_id is passed
            role: message.role,
            content: message.content,
            created_at: message.timestamp ? new Date(message.timestamp).toISOString() : new Date().toISOString(),
            metadata: {
                attachments: message.attachments,
                images: message.images, // Legacy support
                modelMode: message.modelMode,
                thinkingDuration: message.thinkingDuration,
                groundingMetadata: message.groundingMetadata,
                audioData: message.audioData
            }
        });
        if (error) {
            console.error("🔥 [Supabase] DB Insert Error (Message):", error);
            throw error;
        }
    };

    try {
        await withRetry(operation);
    } catch (err: any) {
        if (err.code === '42P01') return;
        console.error('[Supabase] CRITICAL Error saving message:', err.message);
    }
};

// 3. Fetch User Chats (Conversations + Messages)
export const fetchUserChats = async (userId: string): Promise<ChatSession[]> => {
    if (!isValidClient()) return [];
    
    if (!userId) {
        console.error("❌ [Supabase] fetchUserChats FAILED: Missing user_id.");
        return [];
    }

    const operation = async () => {
        // Step A: Fetch conversations
        const { data: conversations, error: convError } = await supabase
            .from('conversations')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (convError) {
            console.error("🔥 [Supabase] Fetch Conversations Error:", convError);
            throw convError;
        }
        if (!conversations || conversations.length === 0) return [];

        // Step B: Fetch messages for these conversations
        const conversationIds = conversations.map(c => c.id);
        const { data: messages, error: msgError } = await supabase
            .from('messages')
            .select('*')
            .in('conversation_id', conversationIds)
            .order('created_at', { ascending: true });

        if (msgError) {
            console.error("🔥 [Supabase] Fetch Messages Error:", msgError);
            throw msgError;
        }

        // Step C: Reconstruct ChatSession objects
        const sessions: ChatSession[] = conversations.map(c => {
            const sessionMessages = messages
                ?.filter(m => m.conversation_id === c.id)
                .map(m => ({
                    id: m.id,
                    role: m.role as Role,
                    content: m.content || '',
                    timestamp: new Date(m.created_at).getTime(),
                    // Unpack metadata
                    attachments: m.metadata?.attachments,
                    images: m.metadata?.images,
                    modelMode: m.metadata?.modelMode,
                    thinkingDuration: m.metadata?.thinkingDuration,
                    groundingMetadata: m.metadata?.groundingMetadata,
                    audioData: m.metadata?.audioData
                })) || [];

            return {
                id: c.id,
                title: c.title || 'Chat mới',
                createdAt: new Date(c.created_at).getTime(),
                botId: c.bot_id,
                messages: sessionMessages
            };
        });

        return sessions;
    };

    try {
        return await withRetry(operation);
    } catch (err: any) {
        if (err.message?.includes('Failed to fetch')) {
            console.log("Offline: Cloud sync skipped.");
            return [];
        }
        console.warn("Failed to sync chat history:", err);
        return [];
    }
};

// 4. Delete Cloud Session
export const deleteCloudSession = async (sessionId: string) => {
    if (!sessionId || !isValidClient()) return;
    const operation = async () => {
        // Deleting the conversation should cascade delete messages if Foreign Keys are set correctly
        const { error } = await supabase.from('conversations').delete().eq('id', sessionId);
        if (error) {
            console.error("🔥 [Supabase] Delete Error:", error);
            throw error;
        }
    };

    try {
        await withRetry(operation);
    } catch (e: any) {
        console.warn("Delete session failed:", e.message);
    }
};
