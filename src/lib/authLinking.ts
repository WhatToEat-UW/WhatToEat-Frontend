import * as Linking from 'expo-linking';
import { getSupabase } from './supabase';

/**
 * Redirect target for Supabase email actions (confirm signup, magic link, recovery).
 * Must be listed under Supabase → Authentication → URL Configuration → Redirect URLs, e.g.
 * `whattoeat://auth/callback` and `exp://**` (Expo Go).
 */
export function getAuthRedirectUrl(): string {
  return Linking.createURL('auth/callback');
}

/**
 * Handles deep link / cold-start URL from Supabase auth (tokens in query or hash, or PKCE code).
 * Returns true if a session was established or exchange succeeded.
 */
export async function handleSupabaseAuthUrl(url: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb || !url) return false;

  // Only handle likely Supabase auth redirects (fragment or query tokens / PKCE code).
  if (!/access_token|refresh_token|(^|[?&#])code=/.test(url)) {
    return false;
  }

  try {
    // Supabase puts tokens in the query (?code=) or the fragment (#access_token=); merge both.
    const [beforeHash, hash = ''] = url.split('#');
    const params = new URLSearchParams(beforeHash.split('?')[1] ?? '');
    new URLSearchParams(hash).forEach((v, k) => params.set(k, v));
    if (params.get('error')) {
      return false;
    }

    const code = params.get('code');
    if (code) {
      const { error } = await sb.auth.exchangeCodeForSession(code);
      return !error;
    }

    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');

    if (access_token && refresh_token) {
      const { error } = await sb.auth.setSession({ access_token, refresh_token });
      return !error;
    }

    return false;
  } catch {
    return false;
  }
}
