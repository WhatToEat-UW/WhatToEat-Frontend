const path = require('path');

// Load .env before reading EXPO_PUBLIC_* (same folder as this file).
require('dotenv').config({ path: path.join(__dirname, '.env') });

/** Matches the Supabase project used by WhatToEat-Backend `DATABASE_URL` (pooler host ref). */
const DEFAULT_SUPABASE_URL = 'https://sckvjvcywdlthsztsuau.supabase.co';

/** Optional: 10-character Apple Developer Team ID (Xcode → Signing, or developer.apple.com). */
const appleTeamId = process.env.APPLE_TEAM_ID?.trim();

// Expo passes app.json in as `config`.
module.exports = ({ config }) => ({
  ...config,
  ios: {
    ...config.ios,
    ...(appleTeamId ? { appleTeamId } : {}),
  },
  extra: {
    ...(config.extra || {}),
    supabaseUrl:
      process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || DEFAULT_SUPABASE_URL,
    supabaseAnonKey:
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
      process.env.SUPABASE_ANON_KEY?.trim() ||
      '',
  },
});
