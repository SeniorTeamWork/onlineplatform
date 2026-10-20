import { validateSupabaseConfig } from '../supabase';
jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn(() => ({ auth: {} })) }));
const url = 'https://example.supabase.co';
const key = 'sb_publishable_example';
test('environment URL and key are accepted', () => {
  expect(validateSupabaseConfig(url, key)).toMatchObject({ configured: true, url, key });
});
test('trims whitespace and trailing slash', () => {
  expect(validateSupabaseConfig(' ' + url + '/ ', ' ' + key + ' ')).toMatchObject({ configured: true, url, key });
});
test.each([[undefined, undefined], [url, ''], ['', key]])('missing environment is actionable', (u, k) => {
  expect(validateSupabaseConfig(u, k)).toMatchObject({ configured: false });
  expect(validateSupabaseConfig(u, k).error).toContain('.env');
});
test.each(['not-url', url + '/rest/v1', 'http://example.supabase.co'])('rejects wrong URL %s', u => {
  expect(validateSupabaseConfig(u, key).configured).toBe(false);
});
test.each(['sb_secret_example', 'invalid', 'header.' + btoa(JSON.stringify({role:'service_role'})) + '.signature'])('rejects server or invalid key', k => {
  expect(validateSupabaseConfig(url, k).configured).toBe(false);
});
test('accepts legacy anon', () => {
  expect(validateSupabaseConfig(url, 'header.' + btoa(JSON.stringify({role:'anon'})) + '.signature').configured).toBe(true);
});
test('both import paths share one configured client and persist sessions', () => {
  const previousUrl = process.env.REACT_APP_SUPABASE_URL;
  const previousKey = process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY;
  process.env.REACT_APP_SUPABASE_URL = url;
  process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY = key;
  try {
    jest.isolateModules(() => {
      const { createClient } = require('@supabase/supabase-js');
      createClient.mockClear();
      const main = require('../supabase');
      const compatibility = require('../services/supabase');
      expect(main.supabase).toBe(compatibility.supabase);
      expect(createClient).toHaveBeenCalledTimes(1);
      const options = createClient.mock.calls[0][2];
      expect(options.auth.persistSession).toBe(true);
      expect(options.auth.autoRefreshToken).toBe(true);
      sessionStorage.setItem('academy-remember', 'no');
      options.auth.storage.setItem('test-token', 'session');
      expect(sessionStorage.getItem('test-token')).toBe('session');
      expect(localStorage.getItem('test-token')).toBeNull();
      sessionStorage.setItem('academy-remember', 'yes');
      options.auth.storage.setItem('test-token', 'persistent');
      expect(localStorage.getItem('test-token')).toBe('persistent');
      expect(sessionStorage.getItem('test-token')).toBeNull();
      options.auth.storage.removeItem('test-token');
      sessionStorage.removeItem('academy-remember');
    });
  } finally {
    if (previousUrl === undefined) delete process.env.REACT_APP_SUPABASE_URL;
    else process.env.REACT_APP_SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY;
    else process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY = previousKey;
  }
});
