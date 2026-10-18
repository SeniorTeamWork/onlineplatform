import { createClient } from '@supabase/supabase-js';
const url = process.env.REACT_APP_SUPABASE_URL;
const key = process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY;
// Respect the existing "remember me" choice without storing passwords.
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
export const supabase = url && key ? createClient(url, key, {
  auth: {
    storage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
}) : null;
