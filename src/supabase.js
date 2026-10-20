import { createClient } from '@supabase/supabase-js';

// All configuration comes from CRA environment variables. No keys in JS/JSON.
export function validateSupabaseConfig(rawUrl, rawKey) {
  const url = (rawUrl || '').trim().replace(/\/+$/, '');
  const key = (rawKey || '').trim();
  let error = '';
  if (!url || !key) {
    error = 'package.json yonidagi .env faylida REACT_APP_SUPABASE_URL va REACT_APP_SUPABASE_PUBLISHABLE_KEY ni to‘ldiring. Keyin npm start ni qayta ishga tushiring; Vercel’da Environment Variables kiritib Redeploy qiling.';
  } else {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') throw Error();
    } catch {
      error = 'REACT_APP_SUPABASE_URL noto‘g‘ri. Project URL kiriting: https://LOYIHA_ID.supabase.co';
    }
    if (!error && !/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) {
      try {
        const parts = key.split('.');
        if (parts.length !== 3) throw Error();
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (payload.role !== 'anon') throw Error();
      } catch {
        error = 'Frontend uchun Publishable key yoki legacy anon key kiriting. Secret/service_role kalitini ishlatmang.';
      }
    }
  }
  return { url, key, error, configured: !error };
}

const config = validateSupabaseConfig(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY
);
export const isSupabaseConfigured = config.configured;
export const supabaseConfigError = config.error;

// Preserve the existing remember-me behavior and refreshed sessions.
const storage = {
  getItem(key) {
    return localStorage.getItem(key) || sessionStorage.getItem(key);
  },
  setItem(key, value) {
    const target = sessionStorage.getItem('academy-remember') === 'no' ? sessionStorage : localStorage;
    const other = target === localStorage ? sessionStorage : localStorage;
    other.removeItem(key);
    target.setItem(key, value);
  },
  removeItem(key) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
};

export const supabase = isSupabaseConfigured ? createClient(config.url, config.key, {
  auth: {
    storage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
}) : null;
