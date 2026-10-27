import { useState } from "react";

import { useApp } from "../context/AppContext";
import { availableUsername } from "../services/identity";
import { uid } from "../services/db";

import {
  ADMIN_PAGES,
  isOwner,
  validAdminPages,
} from "../services/adminAccess";

import Modal from "./Modal";

export default function AdminAccountForm({ onClose }) {
  const {
    data,
    user,
    cloud,
    command,
    update,
    notify,
  } = useApp();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pages, setPages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(event) {
    event.preventDefault();

    if (busy) return;

    setBusy(true);
    setError("");

    try {
      if (!isOwner(user)) {
        throw Error(
          "Yangi adminni faqat asosiy admin yaratishi mumkin."
        );
      }

      const login = availableUsername(data, username);
      const adminPages = validAdminPages(pages);

      if (
        name.trim().length < 3 ||
        password.length < 8
      ) {
        throw Error(
          "Ism kamida 3, parol kamida 8 belgi bo‘lsin."
        );
      }

      if (cloud) {
        await command("createAdmin", {
          name: name.trim(),
          username: login,
          password,
          adminPages,
        });
      } else {
        const saved = await update((draft) => {
          draft.users.push({
            id: uid(),
            name: name.trim(),
            username: login,
            email: login + "@academy.invalid",
            password,
            adminPages,
            role: "admin",
            active: true,
            createdAt: new Date().toISOString(),
          });
        });

        if (!saved) return;
      }

      notify("Yangi admin yaratildi. Login: " + login);
      onClose();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Yangi admin qo‘shish"
      onClose={onClose}
    >
      <form onSubmit={save}>
        <label>
          Ism va familiya

          <input
            required
            minLength={3}
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
            value={username}
            onChange={(event) =>
              setUsername(event.target.value)
            }
          />
        </label>

        <label>
          Parol

          <input
            required
            type="password"
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
          />
        </label>

        <fieldset>
          <legend>
            Admin kira oladigan sahifalar
          </legend>

          {ADMIN_PAGES.map((page) => (
            <label
              className="check-card"
              key={page.id}
            >
              <input
                type="checkbox"
                disabled={busy}
                checked={pages.includes(page.id)}
                onChange={(event) => {
                  const checked = event.target.checked;

                  setPages((previous) =>
                    checked
                      ? [...previous, page.id]
                      : previous.filter(
                          (id) => id !== page.id
                        )
                  );
                }}
              />

              <span>{page.title}</span>
            </label>
          ))}
        </fieldset>

        <p>
          Kamida bitta sahifani tanlang.
          Yangi admin boshqa admin yarata olmaydi.
        </p>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="primary"
          disabled={
            busy ||
            !pages.length ||
            !isOwner(user)
          }
        >
          {busy
            ? "Saqlanmoqda…"
            : "Adminni yaratish"}
        </button>
      </form>
    </Modal>
  );
}