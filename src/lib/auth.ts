import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

export function isGoogleConfigured(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);
}

export async function signInWithGoogle(): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase n’est pas configuré. Renseigne .env (voir .env.example).');
  }
  if (!isGoogleConfigured()) {
    throw new Error('Google Sign-In n’est pas configuré. Ajoute EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.');
  }

  const supabase = getSupabase();
  if (!supabase) throw new Error('Client Supabase indisponible.');

  try {
    const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    });
    await GoogleSignin.hasPlayServices();
    const result = await GoogleSignin.signIn();
    if (result.type !== 'success') {
      throw new Error('Connexion annulée.');
    }
    const idToken = result.data.idToken;
    if (!idToken) throw new Error('Jeton Google manquant.');
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });
    if (error) throw error;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('RNGoogleSignin') || message.includes('native module')) {
      throw new Error('Google Sign-In nécessite un development build EAS, pas Expo Go.');
    }
    throw error instanceof Error ? error : new Error(message);
  }
}

export async function signOut(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
    await GoogleSignin.signOut();
  } catch {
    // native module absent (Expo Go)
  }
  await supabase.auth.signOut();
}

export async function getSessionEmail(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.email ?? null;
}
