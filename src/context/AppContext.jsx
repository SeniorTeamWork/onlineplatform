import {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
} from "react";

import {
  read,
  write,
  migrate,
} from "../services/db";

import {
  cloudEnabled,
  api,
} from "../services/cloud";

import {
  supabase,
  supabaseConfigError,
} from "../services/supabase";

const Context = createContext(null);

const empty = () =>
  migrate({
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
    testSessions: {},
  });

export function AppProvider({ children }) {
  const [data, setData] = useState(() =>
    cloudEnabled ? empty() : read()
  );

  const current = useRef(data);

  const [session, setSession] = useState(() =>
    cloudEnabled
      ? null
      : localStorage.getItem("academy-user") ||
        sessionStorage.getItem("academy-user")
  );

  const [loading, setLoading] = useState(cloudEnabled);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const revision = useRef(0);
  const queue = useRef(Promise.resolve());

  const lastSaved = useRef(
    localStorage.getItem("ai-academy-v1")
  );

  const user = data.users.find(
    (account) =>
      account.id === session && account.active
  );

  function accept(result) {
    current.current = result.data;
    revision.current = result.revision;

    setData(result.data);

    return result;
  }

  async function refresh() {
    return accept(await api("read"));
  }

  useEffect(() => {
    if (!cloudEnabled) {
      const changed = (event) => {
        if (event.key !== "ai-academy-v1") return;

        try {
          const next = read();

          current.current = next;

          setData(next);

          lastSaved.current = localStorage.getItem(
            "ai-academy-v1"
          );
        } catch (error) {
          setNotice(error.message);
        }
      };

      window.addEventListener("storage", changed);

      return () => {
        window.removeEventListener("storage", changed);
      };
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
          const result = await api("read");

          if (alive) accept(result);
        } else {
          const next = empty();

          current.current = next;

          setData(next);
        }
      } catch (error) {
        if (alive) {
          setNotice(error.message);
          setSession(null);
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    supabase.auth
      .getSession()
      .then(({ data: authData }) =>
        restore(authData.session)
      )
      .catch((error) => {
        if (alive) {
          setNotice(error.message);
          setLoading(false);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, authSession) => {
        if (event === "SIGNED_OUT") {
          restore(authSession);
        }
      }
    );

    return () => {
      alive = false;

      subscription.unsubscribe();
    };
  }, []);

  function update(callback) {
    if (!cloudEnabled) {
      try {
        if (
          localStorage.getItem("ai-academy-v1") !==
          lastSaved.current
        ) {
          throw Error(
            "Boshqa oynada ma’lumot o‘zgargan. Sahifani yangilang."
          );
        }

        const next = structuredClone(current.current);

        callback(next);
        write(next);

        lastSaved.current = localStorage.getItem(
          "ai-academy-v1"
        );

        current.current = next;

        setData(next);

        return true;
      } catch (error) {
        setNotice(error.message);

        return false;
      }
    }

    const job = queue.current.then(async () => {
      setSaving(true);

      try {
        const next = structuredClone(current.current);

        callback(next);

        accept(
          await api("update", {
            next,
            revision: revision.current,
          })
        );

        return true;
      } catch (error) {
        setNotice(error.message);

        try {
          await refresh();
        } catch {
          // Asl xato xabari ekranda qoladi.
        }

        return false;
      } finally {
        setSaving(false);
      }
    });

    queue.current = job.catch(() => {});

    return job;
  }

  function command(action, payload = {}) {
    const job = queue.current.then(async () => {
      setSaving(true);

      try {
        const result = await api(action, {
          ...payload,
          revision: revision.current,
        });

        if (result.data) {
          accept(result);
        }

        return result;
      } catch (error) {
        setNotice(error.message);

        try {
          await refresh();
        } catch {
          // Asl xato xabari saqlanadi.
        }

        throw error;
      } finally {
        setSaving(false);
      }
    });

    queue.current = job.catch(() => {});

    return job;
  }

  async function login(
    loginValue,
    password,
    remember = true
  ) {
    if (cloudEnabled) {
      if (!supabase) {
        throw Error(supabaseConfigError);
      }

      sessionStorage.setItem(
        "academy-remember",
        remember ? "yes" : "no"
      );

      const result = await api("login", {
        login: loginValue.trim(),
        password,
      });

      const {
        data: authData,
        error,
      } = await supabase.auth.setSession(result.session);

      if (error) throw error;

      try {
        const refreshed = await refresh();

        const account = refreshed.data.users.find(
          (item) =>
            item.id === authData.user.id &&
            item.active
        );

        if (!account) {
          throw Error("Hisob faol emas.");
        }

        setSession(account.id);
        setNotice("");

        return account;
      } catch (error) {
        await supabase.auth.signOut();

        throw error;
      }
    }

    const normalized = loginValue.trim().toLowerCase();

    const account = current.current.users.find(
      (item) =>
        (String(item.username || "").toLowerCase() ===
          normalized ||
          item.email.toLowerCase() === normalized) &&
        item.password === password &&
        item.active
    );

    if (!account) {
      throw Error(
        "Login yoki parol noto‘g‘ri, yoki hisob bloklangan."
      );
    }

    write(current.current);

    lastSaved.current = localStorage.getItem(
      "ai-academy-v1"
    );

    const target = remember
      ? localStorage
      : sessionStorage;

    const other = remember
      ? sessionStorage
      : localStorage;

    target.setItem("academy-user", account.id);
    other.removeItem("academy-user");

    setSession(account.id);
    setNotice("");

    return account;
  }

  async function logout() {
    if (cloudEnabled) {
      const { error } = await supabase.auth.signOut();

      if (error) {
        setNotice(error.message);

        return false;
      }
    }

    localStorage.removeItem("academy-user");
    sessionStorage.removeItem("academy-user");

    setSession(null);
    setNotice("");

    return true;
  }

  if (loading) {
    return (
      <div className="portal-loader" role="status">
        Ma’lumotlar yuklanmoqda…
      </div>
    );
  }

  return (
    <Context.Provider
      value={{
        data,
        user,
        update,
        login,
        logout,
        notify: setNotice,
        cloud: cloudEnabled,
        command,
        refresh,
        saving,
      }}
    >
      {children}

      {saving && (
        <div className="cloud-saving" role="status">
          Saqlanmoqda…
        </div>
      )}
StudentPasswordForm.jsx
      {notice && (
        <div className="toast" role="status">
          {notice}

          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label="Yopish"
          >
            ×
          </button>
        </div>
      )}
    </Context.Provider>
  );
}

export const useApp = () => useContext(Context);