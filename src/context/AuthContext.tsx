import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { handleSupabaseAuthUrl } from '../lib/authLinking';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { setRuntimeAccessToken } from '../services/authToken';
import { hasCompletedOnboarding } from '../services/questionnaireService';
import { syncSignupName } from '../services/profileService';

/** 'unknown' while checking the backend after sign-in. */
export type OnboardingStatus = 'unknown' | 'needed' | 'done';

interface AuthContextType {
  isGuest: boolean;
  setIsGuest: (val: boolean) => void;
  session: Session | null;
  user: User | null;
  initializing: boolean;
  supabaseReady: boolean;
  /** Signed-in user has (not) finished the SetUp questionnaire. */
  onboarding: OnboardingStatus;
  markOnboarded: () => void;
  /** True after opening a password-reset link: only ResetPassword is shown. */
  recovering: boolean;
  /** Leave password recovery (signs out so the user logs in with the new password). */
  endRecovery: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isGuest: false,
  setIsGuest: () => {},
  session: null,
  user: null,
  initializing: true,
  supabaseReady: false,
  onboarding: 'unknown',
  markOnboarded: () => {},
  recovering: false,
  endRecovery: async () => {},
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isGuest, setIsGuest] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [onboarding, setOnboarding] = useState<OnboardingStatus>('unknown');
  const [recovering, setRecovering] = useState(false);

  const supabaseReady = isSupabaseConfigured && getSupabase() !== null;

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setRuntimeAccessToken(undefined);
      setInitializing(false);
      return;
    }

    const handleUrl = async (url: string) => {
      if ((await handleSupabaseAuthUrl(url)) === 'recovery') setRecovering(true);
    };

    const subUrl = Linking.addEventListener('url', ({ url }) => {
      void handleUrl(url);
    });

    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((event, s) => {
      // Set the token before React re-renders, so requests fired by the new screens carry it.
      setRuntimeAccessToken(s?.access_token ?? undefined);
      setSession(s);
      if (s) setIsGuest(false);
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
    });

    void (async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) await handleUrl(initialUrl);
      const {
        data: { session: s },
      } = await sb.auth.getSession();
      setRuntimeAccessToken(s?.access_token);
      setSession(s);
      setInitializing(false);
    })();

    return () => {
      subUrl.remove();
      subscription.unsubscribe();
    };
  }, []);

  // Each time a different user signs in: check onboarding, and save the signup name.
  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) {
      setOnboarding('unknown');
      return;
    }
    let cancelled = false;
    setOnboarding('unknown');
    hasCompletedOnboarding().then((done) => {
      if (!cancelled) setOnboarding(done ? 'done' : 'needed');
    });
    const name = session?.user.user_metadata?.name;
    if (typeof name === 'string' && name.trim()) {
      syncSignupName(name.trim()).catch(() => {});
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run per user, not per token refresh
  }, [userId]);

  const markOnboarded = useCallback(() => setOnboarding('done'), []);

  const signOut = useCallback(async () => {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    setIsGuest(false);
    setRecovering(false);
    setRuntimeAccessToken(undefined);
    setSession(null);
  }, []);

  const endRecovery = signOut;

  const value = useMemo(
    () => ({
      isGuest,
      setIsGuest,
      session,
      user: session?.user ?? null,
      initializing,
      supabaseReady,
      onboarding,
      markOnboarded,
      recovering,
      endRecovery,
      signOut,
    }),
    [isGuest, session, initializing, supabaseReady, onboarding, markOnboarded, recovering, endRecovery, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
