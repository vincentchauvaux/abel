import * as SecureStore from 'expo-secure-store';
import { createClient, type SupportedStorage } from '@supabase/supabase-js';

const CHUNK = 1800;

const chunkedSecureStore: SupportedStorage = {
  async getItem(key: string) {
    const countRaw = await SecureStore.getItemAsync(key);
    if (!countRaw) return null;
    const count = Number(countRaw);
    if (!Number.isFinite(count)) return countRaw;
    const parts: string[] = [];
    for (let i = 0; i < count; i += 1) {
      parts.push((await SecureStore.getItemAsync(`${key}.${i}`)) ?? '');
    }
    return parts.join('');
  },
  async setItem(key: string, value: string) {
    const chunks = Math.ceil(value.length / CHUNK) || 1;
    await SecureStore.setItemAsync(key, String(chunks));
    for (let i = 0; i < chunks; i += 1) {
      await SecureStore.setItemAsync(`${key}.${i}`, value.slice(i * CHUNK, (i + 1) * CHUNK));
    }
  },
  async removeItem(key: string) {
    const countRaw = await SecureStore.getItemAsync(key);
    const count = Number(countRaw);
    await SecureStore.deleteItemAsync(key);
    if (Number.isFinite(count)) {
      for (let i = 0; i < count; i += 1) {
        await SecureStore.deleteItemAsync(`${key}.${i}`);
      }
    }
  },
};

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
}

export function getSupabase() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: {
      storage: chunkedSecureStore,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}
