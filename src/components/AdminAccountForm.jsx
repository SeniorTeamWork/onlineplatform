import { useRef, useState } from "react";

import { useApp } from "../context/AppContext";
import { availableUsername } from "../services/identity";
import { uid } from "../services/db";

import {
  ADMIN_PAGES,
  canAdmin,
  validAdminPages,
  isOwner,
} from "../services/adminAccess";

import Modal from "./Modal";

export default function AdminAccountForm({
  staff = null,
  onClose,
}) {
  const {
    data,
    user,
    cloud,
    command,
    update,
    refresh,
    notify,
  } = useApp();

  const [mode, setMode] = useState("profile");

  const [name, setName] = useState(
    staff?.name || ""
  );

  const [username, setUsername] = useState(
    staff?.username || ""
  );

  const [password, setPassword] = useState("");

  const [owner, setOwner] = useState(
    staff?.owner ?? false
  );

  const [active, setActive] = useState(
    staff?.active ?? true
  );

  const [pages, setPages] = useState(
    staff?.pages?.map((page) => page.id) || []
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [
    passwordMessage,
    setPasswordMessage,
  ] = useState("");

  const lock = useRef(false);

  const allowed =
    canAdmin(user, "staff") &&
    (!staff || staff.canEdit);

  const choices = ADMIN_PAGES.filter((page) =>
    canAdmin(user, page.id)
  );

  function close() {
    if (!lock.current) {
      onClose();
    }
  }

  function changeMode(value) {
    if (lock.current) return;

    setMode(value);
    setError("");
  }

  async function resetPassword(event) {
    event.preventDefault();

    if (lock.current || !staff) return;

    setError("");
    setPasswordMessage("");

    if (!cloud) {
      setError(
        "Parolni yangilash Supabase rejimida ishlaydi."
      );
      return;
    }

    if (!allowed) {
      setError(
        "Parolni o‘zgartirishga ruxsat yo‘q."
      );
      return;
    }

    if (
      password.length < 8 ||
      password.length > 128
    ) {
      setError(
        "Yangi parol 8–128 belgi bo‘lsin."
      );
      return;
    }

    lock.current = true;
    setBusy(true);

    try {
      await command("setStaffPassword", {
        userId: staff.id,
        password,
      });

      setPassword("");

      setPasswordMessage(
        "Parol yangilandi. Xodim yangi parol bilan kirishi mumkin."
      );
    } catch (err) {
      setError(
        err.message || "Parol yangilanmadi."
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  async function save(event) {
    event.preventDefault();

    if (lock.current) return;

    lock.current = true;
    setBusy(true);
    setError("");

    try {
      if (!allowed) {
        throw Error(
          "Xodimlarni boshqarishga ruxsat yo‘q."
        );
      }

      const login = availableUsername(
        data,
        username,
        staff?.id
      );

      if (owner && !isOwner(user)) {
        throw Error(
          "Administratorni faqat asosiy administrator tayinlay oladi."
        );
      }

      const adminPages = owner
        ? []
        : validAdminPages(pages, user);

      if (
        name.trim().length < 3 ||
        name.trim().length > 120
      ) {
        throw Error(
          "Ism 3–120 belgi bo‘lsin."
        );
      }

      if (
        !staff &&
        (
          password.length < 8 ||
          password.length > 128
        )
      ) {
        throw Error(
          "Parol 8–128 belgi bo‘lsin."
        );
      }

      const fields = {
        name: name.trim(),
        username: login,
        adminPages,
        active,
        owner,
      };

      if (cloud) {
        await refresh();

        if (staff) {
          await command("editStaff", {
            ...fields,
            userId: staff.id,
          });
        } else {
          await command("createAdmin", {
            ...fields,
            password,
          });
        }
      } else {
        const saved = await update((state) => {
          availableUsername(
            state,
            login,
            staff?.id
          );

          if (staff) {
            throw Error(
              "Xodimni tahrirlash Supabase rejimida ishlaydi."
            );
          }

          const account = {
            id: uid(),
            name: fields.name,
            username: login,
            email: login + "@academy.invalid",
            password,
            role: "admin",
            active: true,
            createdAt: new Date().toISOString(),
          };

          if (!owner) {
            account.adminPages = adminPages;
          }

          state.users.push(account);
        });

        if (!saved) {
          setError(
            "Saqlanmadi. Yuqoridagi xato xabarini tekshiring."
          );
          return;
        }
      }

      notify(
        staff
          ? "Xodim yangilandi."
          : "Xodim yaratildi. Login: " + login
      );

      onClose();
    } catch (err) {
      setError(
        err.message || "Xodim saqlanmadi."
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return (
    <Modal
      title={
        staff
          ? "Hisobni tahrirlash"
          : "Yangi hisob qo‘shish"
      }
      onClose={close}
    >
      {staff && (
        <div
          className="button-row"
          style={{ marginTop: 16 }}
        >
          <button
            type="button"
            className={
              mode === "profile"
                ? "primary"
                : "secondary"
            }
            disabled={busy}
            onClick={() =>
              changeMode("profile")
            }
          >
            Ma’lumotlar
          </button>

          <button
            type="button"
            className={
              mode === "password"
                ? "primary"
                : "secondary"
            }
            disabled={busy}
            onClick={() =>
              changeMode("password")
            }
          >
            Parol
          </button>
        </div>
      )}

      {staff && mode === "password" ? (
        <form
          className="staff-form"
          onSubmit={resetPassword}
        >
          <div className="staff-form-hint">
            <strong>{staff.name}</strong>
            {" "}uchun yangi parol kiriting.
            Eski parol talab qilinmaydi.
          </div>

          <label>
            Yangi parol
            <input
              name="staffPassword"
              type="password"
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              disabled={busy}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setPasswordMessage("");
              }}
            />
          </label>

          {error && (
            <div
              role="alert"
              className="error"
              style={{ display: "block" }}
            >
              {error}
            </div>
          )}

          {passwordMessage && (
            <div
              role="status"
              className="staff-form-hint"
            >
              {passwordMessage}
            </div>
          )}

          <div className="button-row">
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={close}
            >
              Yopish
            </button>

            <button
              type="submit"
              className="primary"
              disabled={busy || !allowed}
            >
              {busy
                ? "Yangilanmoqda…"
                : "Parolni yangilash"}
            </button>
          </div>
        </form>
      ) : (
        <form
          className="staff-form"
          onSubmit={save}
        >
          <label>
            Ism va familiya
            <input
              required
              minLength={3}
              maxLength={120}
              disabled={busy}
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
            />
          </label>

          <label>
            Login
            <input
              required
              minLength={3}
              maxLength={40}
              autoCapitalize="none"
              autoComplete="off"
              spellCheck={false}
              disabled={busy}
              value={username}
              onChange={(event) =>
                setUsername(event.target.value)
              }
            />
          </label>

          {!staff && (
            <label>
              Parol
              <input
                required
                type="password"
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                disabled={busy}
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
              />
            </label>
          )}

          {staff && (
            <label>
              Hisob holati
              <select
                disabled={busy}
                value={
                  active
                    ? "active"
                    : "blocked"
                }
                onChange={(event) =>
                  setActive(
                    event.target.value ===
                      "active"
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
          )}

          <div className="staff-role-choice">
            <label>
              Hisob turi
              <select
                disabled={
                  busy || !isOwner(user)
                }
                value={
                  owner
                    ? "owner"
                    : "worker"
                }
                onChange={(event) =>
                  setOwner(
                    event.target.value ===
                      "owner"
                  )
                }
              >
                <option value="worker">
                  Xodim — tanlangan sahifalar
                </option>

                <option value="owner">
                  Asosiy administrator —
                  barcha huquqlar
                </option>
              </select>
            </label>

            <div className="staff-form-hint">
              {owner
                ? "Barcha sahifalar, xodimlar va ruxsatlarni boshqaradi."
                : "Faqat quyida tanlangan sahifalarga kira oladi."}
            </div>
          </div>

          {!owner && (
            <fieldset disabled={busy}>
              <legend>
                Sahifa ruxsatlari
              </legend>

              <div className="staff-permission-grid">
                {choices.map((page) => (
                  <label
                    className="check-card"
                    key={page.id}
                  >
                    <input
                      type="checkbox"
                      checked={pages.includes(
                        page.id
                      )}
                      onChange={(event) => {
                        const checked =
                          event.target.checked;

                        setPages((old) =>
                          checked
                            ? [...old, page.id]
                            : old.filter(
                                (id) =>
                                  id !== page.id
                              )
                        );
                      }}
                    />

                    <span>{page.title}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {error && (
            <div
              role="alert"
              className="error"
              style={{
                display: "block",
                margin: "12px 0",
              }}
            >
              {error}
            </div>
          )}

          <div className="button-row">
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={close}
            >
              Bekor qilish
            </button>

            <button
              type="submit"
              className="primary"
              disabled={busy || !allowed}
            >
              {busy
                ? "Saqlanmoqda…"
                : staff
                  ? "Saqlash"
                  : "Hisob yaratish"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}