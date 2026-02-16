import { ChatSession } from '../types';

const DB_NAME = 'OceepDB';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result);
    request.onerror = (event) => reject((event.target as IDBOpenDBRequest).error);
  });
};

export const loadSessions = async (): Promise<ChatSession[]> => {
  try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();
        
        request.onsuccess = () => {
           const sessions = request.result as ChatSession[];
           // Sort by createdAt desc (newest first)
           sessions.sort((a, b) => b.createdAt - a.createdAt);
           resolve(sessions);
        };
        request.onerror = () => reject(request.error);
      });
  } catch (e) {
      console.error("IDB Load Error", e);
      return [];
  }
};

export const saveSession = async (session: ChatSession) => {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(session);
    } catch (e) {
        console.error("IDB Save Error", e);
    }
};

export const deleteSession = async (id: string) => {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(id);
    } catch (e) {
        console.error("IDB Delete Error", e);
    }
};

export const migrateFromLocalStorage = async (): Promise<boolean> => {
    const localData = localStorage.getItem('oceep_sessions');
    if (localData) {
        try {
            console.log("Migrating sessions from LocalStorage to IndexedDB...");
            let sessions: ChatSession[] = [];
            try {
                sessions = JSON.parse(localData);
            } catch {
                sessions = [];
            }

            if (sessions.length > 0) {
                const db = await openDB();
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                
                for (const s of sessions) {
                    store.put(s);
                }
                
                await new Promise<void>((resolve, reject) => {
                    tx.oncomplete = () => resolve();
                    tx.onerror = () => reject(tx.error);
                });
            }
            
            // Clear localStorage after successful migration
            localStorage.removeItem('oceep_sessions');
            return true;
        } catch (e) {
            console.error("Migration failed", e);
            return false;
        }
    }
    return false;
};