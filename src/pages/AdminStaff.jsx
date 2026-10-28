import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";

import { useApp } from "../context/AppContext";
import { api } from "../services/cloud";

import {
  ADMIN_PAGES,
  adminHome,
  isOwner,
} from "../services/adminAccess";

import AdminAccountForm from "../components/AdminAccountForm";
import Modal from "../components/Modal";

import "./AdminStaff.css";

function dateLabel(value) {
  if (!value || !Number.isFinite(Date.parse(value))) {
    return "Hali qayd etilmagan";
  }

  return new Intl.DateTimeFormat("uz-UZ", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tashkent",
  }).format(new Date(value));
}

export default function AdminStaff() {
  const { user, cloud, command } = useApp();

  const owner = isOwner(user);

  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [message, setMessage] = useState("");

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [reload, setReload] = useState(0);
  const [clock, setClock] = useState(Date.now());

  const [adminOpen, setAdminOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  const receivedAt = useRef(0);
  const actionLock = useRef(false);

  useEffect(() => {
    if (!owner || !cloud) return;

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

        if (!alive) return;

        receivedAt.current = Date.now();

        setSnapshot(result);
        setClock(Date.now());
        setLoadError("");
      } catch (error) {
        if (alive) {
          setLoadError(
            error.message || "Xodimlar yuklanmadi."
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
  }, [owner, cloud, reload, user?.id]);

  useEffect(() => {
    const timer = setInterval(
      () => setClock(Date.now()),
      5000
    );

    return () => clearInterval(timer);
  }, []);

  function openEdit(item) {
    if (actionLock.current || item.owner) return;

    setMessage("");
    setActionError("");

    setDraft({
      userId: item.id,
      name: item.name || "",
      username: item.username || "",
      active: item.active,
      adminPages: item.pages.map((page) => page.id),
    });
  }

  function changeField(key, value) {
    setDraft((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  function togglePage(pageId) {
    setDraft((previous) => ({
      ...previous,
      adminPages: previous.adminPages.includes(pageId)
        ? previous.adminPages.filter(
            (id) => id !== pageId
          )
        : [...previous.adminPages, pageId],
    }));
  }

  async function save(event) {
    event.preventDefault();

    if (actionLock.current || !draft) return;

    setActionError("");

    const name = draft.name.trim();
    const username = draft.username.trim();

    if (name.length < 3 || name.length > 120) {
      setActionError("Ism 3–120 belgi bo‘lsin.");
      return;
    }

    if (!username) {
      setActionError("Login kiriting.");
      return;
    }

    if (!draft.adminPages.length) {
      setActionError(
        "Kamida bitta sahifani tanlang."
      );
      return;
    }

    actionLock.current = true;
    setBusy(true);

    try {
      await command("editStaff", {
        userId: draft.userId,
        name,
        username,
        active: draft.active,
        adminPages: draft.adminPages,
      });

      setDraft(null);
      setMessage("Xodim ma’lumotlari yangilandi.");
      setReload((value) => value + 1);
    } catch (error) {
      setActionError(
        error.message || "O‘zgarishlar saqlanmadi."
      );
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  }

  async function remove() {
    if (actionLock.current || !deleteTarget) return;

    actionLock.current = true;
    setBusy(true);
    setActionError("");

    try {
      await command("deleteStaff", {
        userId: deleteTarget.id,
      });

      setDeleteTarget(null);
      setMessage("Xodim ro‘yxatdan o‘chirildi.");
      setReload((value) => value + 1);
    } catch (error) {
      setActionError(
        error.message || "Xodim o‘chirilmadi."
      );
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  }

  if (!owner) {
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
      Math.max(0, clock - receivedAt.current)
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

  const counts = {
    total: staff.length,
    active: staff.filter((item) => item.active).length,
    blocked: staff.filter((item) => !item.active).length,
    online: staff.filter((item) => item.online).length,
  };

  const list = staff.filter((item) => {
    const text = `${item.name} ${item.username}`
      .toLowerCase();

    if (!text.includes(query.trim().toLowerCase())) {
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
            ASOSIY ADMINISTRATOR
          </p>

          <h1>Xodimlar</h1>

          <p>
            Xodimlar, hisoblar va sahifa ruxsatlari.
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
            {loading
              ? "Yangilanmoqda…"
              : "Yangilash"}
          </button>

          <button
            type="button"
            className="primary"
            disabled={busy}
            onClick={() => {
              setMessage("");
              setAdminOpen(true);
            }}
          >
            + Xodim qo‘shish
          </button>
        </div>
      </div>

      <div className="staff-stats">
        <div>
          <span>Jami xodimlar</span>
          <strong>
            {snapshot ? counts.total : "—"}
          </strong>
          <small>Asosiy admin ham hisoblanadi</small>
        </div>

        <div className="staff-online-card">
          <span>Hozir onlayn</span>
          <strong>
            {stale ? "—" : counts.online}
          </strong>
          <small>Oxirgi 90 soniyada faollik</small>
        </div>

        <div>
          <span>Faol hisoblar</span>
          <strong>
            {snapshot ? counts.active : "—"}
          </strong>
          <small>Saytga kirishga ruxsati bor</small>
        </div>

        <div>
          <span>Bloklangan hisoblar</span>
          <strong>
            {snapshot ? counts.blocked : "—"}
          </strong>
          <small>Saytga kirishi cheklangan</small>
        </div>
      </div>

      {loadError && (
        <p className="staff-error" role="alert">
          {loadError}
        </p>
      )}

      {message && (
        <p className="staff-info" role="status">
          {message}
        </p>
      )}

      <div className="staff-tools">
        <input
          aria-label="Xodim qidirish"
          placeholder="Ism yoki login orqali qidiring…"
          value={query}
          onChange={(event) =>
            setQuery(event.target.value)
          }
        />

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
          <option value="online" disabled={stale}>
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

                    {item.owner && (
                      <span>Xodimlar</span>
                    )}

                    {!item.owner &&
                      !item.pages.length && (
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
                  {item.owner ||
                  item.id === user.id ? (
                    <small>Himoyalangan hisob</small>
                  ) : (
                    <div
                      className="button-row"
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                      }}
                    >
                      <button
                        type="button"
                        className="secondary"
                        disabled={busy}
                        onClick={() => openEdit(item)}
                      >
                        Tahrirlash
                      </button>

                      <button
                        type="button"

                        className="secondary danger"
                        style={{background: 'rgba(255, 0, 0, 0.13)'}}
                        disabled={busy}
                        onClick={() => {
                          setMessage("");
                          setActionError("");
                          setDeleteTarget(item);
                        }}
                      >
                        O‘chirish
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!list.length && (
          <p className="staff-empty" role="status">
            {!snapshot && loading
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

      {adminOpen && (
        <AdminAccountForm
          onClose={() => {
            setAdminOpen(false);
            setReload((value) => value + 1);
          }}
        />
      )}

      {draft && (
        <Modal
          title="Xodimni tahrirlash"
          onClose={() => {
            if (actionLock.current) return;
            setDraft(null);
            setActionError("");
          }}
        >
          <form
            onSubmit={save}
            style={{ display: "grid", gap: 16 }}
          >
            <label>
              Ism
              <input
                required
                minLength={3}
                maxLength={120}
                disabled={busy}
                value={draft.name}
                onChange={(event) =>
                  changeField(
                    "name",
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              Login
              <input
                required
                autoComplete="off"
                disabled={busy}
                value={draft.username}
                onChange={(event) =>
                  changeField(
                    "username",
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              Hisob holati
              <select
                disabled={busy}
                value={
                  draft.active
                    ? "active"
                    : "blocked"
                }
                onChange={(event) =>
                  changeField(
                    "active",
                    event.target.value === "active"
                  )
                }
              >
                <option value="active">
                  Faol
                </option>
                <option value="blocked">
                  Bloklangan
                </option>
              </select>
            </label>

            <fieldset
              disabled={busy}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: 16,
              }}
            >
              <legend>
                Biriktirilgan sahifalar
              </legend>

              <div
                style={{
                  display: "grid",
                  gap: 12,
                }}
              >
                {ADMIN_PAGES.map((page) => (
                  <label
                    key={page.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <input
                      type="checkbox"
                      style={{ width: "auto" }}
                      checked={draft.adminPages.includes(
                        page.id
                      )}
                      onChange={() =>
                        togglePage(page.id)
                      }
                    />
                    {page.title}
                  </label>
                ))}
              </div>
            </fieldset>

            {actionError && (
              <p
                className="staff-error"
                role="alert"
              >
                {actionError}
              </p>
            )}

            <div className="button-row">
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => setDraft(null)}
              >
                Bekor qilish
              </button>

              <button
                type="submit"
                className="primary"
                disabled={busy}
              >
                {busy
                  ? "Saqlanmoqda…"
                  : "Saqlash"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          title="Xodimni o‘chirish"
          onClose={() => {
            if (actionLock.current) return;
            setDeleteTarget(null);
            setActionError("");
          }}
        >
          <p>
            <strong>{deleteTarget.name}</strong>
            {" "}ro‘yxatdan o‘chirilsinmi?
            Uning saytga kirishi bloklanadi.
          </p>

          {actionError && (
            <p
              className="staff-error"
              role="alert"
            >
              {actionError}
            </p>
          )}

          <div className="button-row">
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={() => setDeleteTarget(null)}
            >
              Bekor qilish
            </button>

            <button
              type="button"
              className="secondary danger"
                        style={{background: 'rgba(255, 0, 0, 0.13)'}}
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