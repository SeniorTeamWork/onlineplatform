import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Users,
  UserCheck,
  ShieldCheck,
  Search,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
} from "lucide-react";

import { Navigate } from "react-router-dom";

import { useApp } from "../context/AppContext";
import { api } from "../services/cloud";

import {
  adminHome,
  canAdmin,
} from "../services/adminAccess";

import AdminAccountForm from "../components/AdminAccountForm";
import Modal from "../components/Modal";

import "./AdminStaff.css";

function dateLabel(value) {
  if (
    !value ||
    !Number.isFinite(Date.parse(value))
  ) {
    return "Hali qayd etilmagan";
  }

  return new Intl.DateTimeFormat("uz-UZ", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tashkent",
  }).format(new Date(value));
}

export default function AdminStaff() {
  const {
    user,
    cloud,
    command,
    refresh,
    notify,
  } = useApp();

  const allowed = canAdmin(user, "staff");

  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [reload, setReload] = useState(0);
  const [clock, setClock] = useState(Date.now());

  const [draft, setDraft] = useState(undefined);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  const receivedAt = useRef(0);
  const lock = useRef(false);

  useEffect(() => {
    if (!allowed || !cloud) return;

    let alive = true;
    let pending = false;

    async function load() {
      if (
        pending ||
        document.visibilityState !== "visible"
      ) {
        return;
      }

      pending = true;
      setLoading(true);

      try {
        const result = await api("staffOverview");

        if (alive) {
          receivedAt.current = Date.now();

          setClock(Date.now());
          setSnapshot(result);
          setLoadError("");
        }
      } catch (err) {
        if (alive) {
          setLoadError(
            err.message || "Xodimlar yuklanmadi."
          );
        }
      } finally {
        pending = false;

        if (alive) setLoading(false);
      }
    }

    load();

    const timer = setInterval(load, 15000);

    document.addEventListener(
      "visibilitychange",
      load
    );

    return () => {
      alive = false;
      clearInterval(timer);

      document.removeEventListener(
        "visibilitychange",
        load
      );
    };
  }, [allowed, cloud, reload, user?.id]);

  useEffect(() => {
    const timer = setInterval(
      () => setClock(Date.now()),
      5000
    );

    return () => clearInterval(timer);
  }, []);

  async function remove() {
    if (lock.current || !deleteTarget) return;

    lock.current = true;

    setBusy(true);
    setActionError("");

    try {
      await refresh();

      await command("deleteStaff", {
        userId: deleteTarget.id,
      });

      setDeleteTarget(null);
      setReload((value) => value + 1);

      notify("Hisob ro‘yxatdan o‘chirildi.");
    } catch (err) {
      setActionError(
        err.message || "Hisob o‘chirilmadi."
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  if (!allowed) {
    return (
      <Navigate to={adminHome(user)} replace />
    );
  }

  if (!cloud) {
    return (
      <p className="staff-info">
        Ushbu bo‘lim Supabase rejimida ishlaydi.
      </p>
    );
  }

  const stale =
    !snapshot ||
    Boolean(loadError) ||
    clock - receivedAt.current > 45000;

  const serverNow = snapshot?.serverTime
    ? Date.parse(snapshot.serverTime) +
    Math.max(
      0,
      clock - receivedAt.current
    )
    : clock;

  const staff = (snapshot?.staff || []).map(
    (item) => {
      const age = item.lastSeenAt
        ? serverNow - Date.parse(item.lastSeenAt)
        : Infinity;

      return {
        ...item,
        online:
          !stale &&
          item.active &&
          age >= 0 &&
          age <
          (snapshot.onlineWindowSeconds || 90) *
          1000,
      };
    }
  );

  const list = staff.filter((item) => {
    const text =
      `${item.name} ${item.username}`.toLowerCase();

    if (
      !text.includes(
        query.trim().toLowerCase()
      )
    ) {
      return false;
    }

    if (filter === "online") return item.online;
    if (filter === "active") return item.active;
    if (filter === "blocked") return !item.active;

    return true;
  });

  return (
    <section className="staff-page">
      <div className="staff-heading">
        <div>
          <p className="staff-eyebrow">
            JAMOA BOSHQARUVI
          </p>

          <h1>
            Xodimlar va administratorlar
          </h1>

          <p>
            Jamoangiz holati va har bir hisobning
            ruxsatlarini boshqaring.
          </p>
        </div>

        <div className="button-row">
          <button
            type="button"
            className="secondary"
            disabled={loading || busy}
            onClick={() =>
              setReload((value) => value + 1)
            }
          >
            <RefreshCw size={16} />
            {loading
              ? "Yangilanmoqda…"
              : "Yangilash"}
          </button>

          <button
            type="button"
            className="primary"
            disabled={busy}
            onClick={() => setDraft(null)}
          >
            <Plus size={17} />
            Yangi hisob
          </button>
        </div>
      </div>

      <div className="staff-stats">
        <div>
          <Users
            className="staff-stat-icon"
            size={21}
          />

          <span>Jami hisoblar</span>

          <strong>
            {snapshot ? staff.length : "—"}
          </strong>

          <small>
            Asosiy admin ham hisoblanadi
          </small>
        </div>

        <div className="staff-online-card">
          <UserCheck
            className="staff-stat-icon"
            size={21}
          />

          <span>Hozir onlayn</span>

          <strong>
            {stale
              ? "—"
              : staff.filter(
                (item) => item.online
              ).length}
          </strong>

          <small>
            Oxirgi 90 soniyada faollik
          </small>
        </div>

        <div>
          <ShieldCheck
            className="staff-stat-icon"
            size={21}
          />

          <span>Faol hisoblar</span>

          <strong>
            {snapshot
              ? staff.filter(
                (item) => item.active
              ).length
              : "—"}
          </strong>

          <small>
            Saytga kirishga ruxsati bor
          </small>
        </div>

        <div>
          <span>Bloklangan hisoblar</span>

          <strong>
            {snapshot
              ? staff.filter(
                (item) => !item.active
              ).length
              : "—"}
          </strong>

          <small>
            Saytga kirishi cheklangan
          </small>
        </div>
      </div>

      {loadError && (
        <div
          className="staff-error"
          role="alert"
        >
          {loadError}
        </div>
      )}

      <div className="staff-tools">
        <div className="staff-search">
          <Search size={18} />

          <input
            aria-label="Xodim qidirish"
            placeholder="Ism yoki login orqali qidiring…"
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
          />
        </div>

        <select
          aria-label="Xodimlar filtri"
          value={filter}
          onChange={(event) =>
            setFilter(event.target.value)
          }
        >
          <option value="all">
            Barcha xodimlar
          </option>

          <option
            value="online"
            disabled={stale}
          >
            Hozir onlayn
          </option>

          <option value="active">
            Faol hisoblar
          </option>

          <option value="blocked">
            Bloklangan hisoblar
          </option>
        </select>
      </div>

      <div className="staff-table-wrap">
        <table className="staff-table">
          <thead>
            <tr>
              <th>Xodim</th>
              <th>Hisob</th>
              <th>Saytdagi holati</th>
              <th>Biriktirilgan sahifalar</th>
              <th>Oxirgi faollik</th>
              <th>Amallar</th>
            </tr>
          </thead>

          <tbody>
            {list.map((item) => (
              <tr key={item.id}>
                <td>
                  <div className="staff-person">
                    <span className="staff-avatar">
                      {item.name
                        .slice(0, 1)
                        .toUpperCase()}
                    </span>

                    <div>
                      <strong>{item.name}</strong>

                      <small>
                        {item.username
                          ? `@${item.username}`
                          : "Login kiritilmagan"}
                      </small>

                      {item.owner && (
                        <span className="staff-owner">
                          Asosiy admin
                        </span>
                      )}

                      {item.id === user.id && (
                        <small>Siz</small>
                      )}
                    </div>
                  </div>
                </td>

                <td>
                  <span
                    className={
                      "staff-pill " +
                      (item.active
                        ? "staff-active"
                        : "staff-blocked")
                    }
                  >
                    {item.active
                      ? "Faol"
                      : "Bloklangan"}
                  </span>
                </td>

                <td>
                  <span
                    className={
                      "staff-pill " +
                      (item.online
                        ? "staff-active"
                        : "staff-offline")
                    }
                  >
                    {stale
                      ? "Aniqlanmagan"
                      : item.online
                        ? "● Onlayn"
                        : "Oflayn"}
                  </span>
                </td>

                <td>
                  <div className="staff-permissions">
                    {item.pages.map((page) => (
                      <span key={page.id}>
                        {page.title}
                      </span>
                    ))}

                    {!item.pages.length && (
                      <small>
                        Sahifa biriktirilmagan
                      </small>
                    )}
                  </div>
                </td>

                <td>
                  {dateLabel(item.lastSeenAt)}
                  <small>Toshkent vaqti</small>
                </td>

                <td>
                  <div className="button-row">
                    {item.canEdit && (
                      <button
                        type="button"
                        className="secondary"
                        disabled={busy}
                        onClick={() =>
                          setDraft(item)
                        }
                      >
                        <Pencil size={15} />
                        Tahrirlash
                      </button>
                    )}

                    {item.canDelete && (
                      <button
                        type="button"
                        className="secondary danger"
                        disabled={busy}
                        onClick={() => {
                          setActionError("");
                          setDeleteTarget(item);
                        }}
                      >
                        <Trash2 size={15} />
                        O‘chirish
                      </button>
                    )}

                    {!item.canEdit && (
                      <small>
                        Himoyalangan hisob
                      </small>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!list.length && (
          <p
            className="staff-empty"
            role="status"
          >
            {loading && !snapshot
              ? "Xodimlar yuklanmoqda…"
              : !snapshot && loadError
                ? "Ro‘yxat yuklanmadi."
                : "Mos xodim topilmadi."}
          </p>
        )}
      </div>

      <p className="staff-footnote">
        Ro‘yxat har 15 soniyada yangilanadi.
        Onlayn holati oxirgi 90 soniyadagi
        faollik orqali aniqlanadi.
      </p>

      {draft !== undefined && (
        <AdminAccountForm
          key={draft?.id || "new"}
          staff={draft}
          onClose={() => {
            setDraft(undefined);
            setReload((value) => value + 1);
          }}
        />
      )}

      {deleteTarget && (
        <Modal
          title="Hisobni o‘chirish"
          onClose={() => {
            if (!lock.current) {
              setDeleteTarget(null);
            }
          }}
        >
          <div>
            <strong>{deleteTarget.name}</strong>
            {" "}ro‘yxatdan o‘chirilsinmi?
            Uning saytga kirishi bloklanadi.
          </div>

          {actionError && (
            <div
              role="alert"
              className="staff-error"
            >
              {actionError}
            </div>
          )}

          <div className="button-row">
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={() =>
                setDeleteTarget(null)
              }
            >
              Bekor qilish
            </button>

            <button
              type="button"
              className="secondary danger"
              disabled={busy}
              onClick={remove}
            >
              {busy
                ? "O‘chirilmoqda…"
                : "Ha, o‘chirish"}
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}