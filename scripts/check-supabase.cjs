const path = require('node:path');
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
require('react-scripts/config/env');
const url = (process.env.REACT_APP_SUPABASE_URL || '').trim();
const key = (process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || '').trim();
console.log('Loyiha papkasi:', path.resolve(__dirname, '..'));
console.log('URL mavjud:', Boolean(url));
console.log('Publishable/anon key mavjud:', Boolean(key));
if (!url || !key) {
  console.error('package.json yonidagi .env faylini to‘ldiring. .env.txt bo‘lmasin.');
  process.exitCode = 1;
} else {
  try {
    const target = new URL(url);
    if (target.protocol !== 'https:' || target.pathname !== '/' || target.search || target.hash || target.username || target.password) throw Error();
    console.log('Ulanadigan loyiha:', target.hostname);
    console.log('Sozlamalar yuklandi. Bu tekshiruv Auth/Edge/SQLga haqiqiy so‘rov yubormaydi.');
  } catch {
    console.error('Project URL noto‘g‘ri.');
    process.exitCode = 1;
  }
}
