import { createContext, useContext, useRef, useState, useEffect } from 'react';
import { read, write, migrate } from '../services/db';
import { cloudEnabled, api } from '../services/cloud';
import { supabase, supabaseConfigError } from '../services/supabase';
const Context = createContext(null);
const empty = () => migrate({
  users: [],
  courses: [],
  lessons: [],
  enrollments: [],
  payments: [],
  expenses: [],
  attempts: [],
  submissions: [],
  certificates: [],
  tickets: [],
  progress: {},
  testSessions: {}
});
export function AppProvider({
  children
}) {
  const [data, setData] = useState(() => cloudEnabled ? empty() : read()),
    current = useRef(data);
  const [session, setSession] = useState(() => cloudEnabled ? null : localStorage.getItem('academy-user') || sessionStorage.getItem('academy-user'));
  const [loading, setLoading] = useState(cloudEnabled),
    [notice, setNotice] = useState(''),
    [saving, setSaving] = useState(false);
  const revision = useRef(0),
    queue = useRef(Promise.resolve()),
    lastSaved = useRef(localStorage.getItem('ai-academy-v1'));
  const user = data.users.find(u => u.id === session && u.active);
  function accept(result) {
    current.current = result.data;
    revision.current = result.revision;
    setData(result.data);
    return result;
  }
  async function refresh() {
    return accept(await api('read'));
  }
  useEffect(() => {
    if (!cloudEnabled) {
      const changed = e => {
        if (e.key === 'ai-academy-v1') {
          try {
            const next = read();
            current.current = next;
            setData(next);
            lastSaved.current = localStorage.getItem('ai-academy-v1');
          } catch (e) {
            setNotice(e.message);
          }
        }
      };
      window.addEventListener('storage', changed);
      return () => window.removeEventListener('storage', changed);
    }
    if (!supabase) {
      setLoading(false);
      setNotice(supabaseConfigError);
      return;
    }
    let alive = true;
    async function restore(authSession) {
      try {
        if (!alive) return;
        setSession(authSession?.user.id || null);
        if (authSession) {
          const result = await api('read');
          if (alive) accept(result);
        } else {
          const d = empty();
          current.current = d;
          setData(d);
        }
      } catch (e) {
        if (alive) {
          setNotice(e.message);
          setSession(null);
        }
      } finally {
        if (alive) setLoading(false);
      }
    }
    supabase.auth.getSession().then(({
      data
    }) => restore(data.session)).catch(error=>{if(alive){setNotice(error.message);setLoading(false);}});
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_OUT') restore(null);
    });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);
  function update(callback) {
    if (!cloudEnabled) {
      try {
        if (localStorage.getItem('ai-academy-v1') !== lastSaved.current) throw Error('Boshqa oynada ma’lumot o‘zgargan. Sahifani yangilang.');
        const next = structuredClone(current.current);
        callback(next);
        write(next);
        lastSaved.current = localStorage.getItem('ai-academy-v1');
        current.current = next;
        setData(next);
        return true;
      } catch (e) {
        setNotice(e.message);
        return false;
      }
    }
    const job = queue.current.then(async () => {
      setSaving(true);
      try {
        const next = structuredClone(current.current);
        callback(next);
        accept(await api('update', {
          next,
          revision: revision.current
        }));
        return true;
      } catch (e) {
        setNotice(e.message);
        try {
          await refresh();
        } catch {}
        return false;
      } finally {
        setSaving(false);
      }
    });
    queue.current = job.catch(() => {});
    return job;
  }
  async function command(action, payload) {
    setSaving(true);
    try {
      await queue.current;
      const result = await api(action, {
        ...payload,
        revision: revision.current
      });
      if (result.data) accept(result);
      return result;
    } catch (e) {
      setNotice(e.message);
      try {
        await refresh();
      } catch {}
      throw e;
    } finally {
      setSaving(false);
    }
  }
  async function login(email, password, remember = true) {
    if (cloudEnabled) {
      if (!supabase) throw Error(supabaseConfigError);
      sessionStorage.setItem('academy-remember', remember ? 'yes' : 'no');
      const {
        data,
        error
      } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });
      if (error) throw error;
      try {
        const result = await refresh();
        const u = result.data.users.find(u => u.id === data.user.id && u.active);
        if (!u) throw Error('Hisob faol emas.');
        setSession(u.id);
        setNotice('');
        return u;
      } catch (e) {
        await supabase.auth.signOut();
        throw e;
      }
    }
    const u = current.current.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password && u.active);
    if (!u) throw Error('Email yoki parol noto‘g‘ri, yoki hisob bloklangan.');
    write(current.current);
    lastSaved.current = localStorage.getItem('ai-academy-v1');
    (remember ? localStorage : sessionStorage).setItem('academy-user', u.id);
    (remember ? sessionStorage : localStorage).removeItem('academy-user');
    setSession(u.id);
    setNotice('');
    return u;
  }
  async function logout() {
    if (cloudEnabled) {
      const {
        error
      } = await supabase.auth.signOut();
      if (error) {
        setNotice(error.message);
        return false;
      }
    }
    localStorage.removeItem('academy-user');
    sessionStorage.removeItem('academy-user');
    setSession(null);
    setNotice('');
    return true;
  }
  if (loading) return <div className="portal-loader" role="status">Ma’lumotlar yuklanmoqda…</div>;
  return <Context.Provider value={{
    data,
    user,
    update,
    login,
    logout,
    notify: setNotice,
    cloud: cloudEnabled,
    command,
    refresh,
    saving
  }}>{children}{saving && <div className="cloud-saving" role="status">Saqlanmoqda…</div>}{notice && <div className="toast" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Yopish">×</button></div>}</Context.Provider>;
}
export const useApp = () => useContext(Context);
