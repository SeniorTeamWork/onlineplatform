import { useState } from "react";

import { useApp } from "../context/AppContext";
import { availableUsername } from "../services/identity";
import { uid } from "../services/db";

import Modal from "./Modal";

export default function AdminAccountForm({ onClose }) {
  const {
    data,
    cloud,
    command,
    update,
    notify,
  } = useApp();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(event) {
    event.preventDefault();

    if (busy) return;

    setBusy(true);
    setError("");

    try {
      const login = availableUsername(
        data,
        username
      );

      if (
        name.trim().length < 3 ||
        password.length < 8
      ) {
        throw new Error(
          "Ism kamida 3, parol kamida 8 belgi bo‘lsin."
        );
      }

      if (cloud) {
        await command("createAdmin", {
          name,
          username: login,
          password,
        });
      } else {
        const success = await update((next) => {
          next.users.push({
            id: uid(),
            name: name.trim(),
            username: login,
            email: login + "@academy.invalid",
            password,
            role: "admin",
            active: true,
            createdAt: new Date().toISOString(),
          });
        });

        if (!success) return;
      }

      notify(
        "Yangi admin yaratildi. Login: " + login
      );

      onClose();
    } catch (err) {
      setError(err.message);
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
            autoComplete="off"
            autoCapitalize="none"
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
a
        <p>
          Bu hisob barcha admin bo‘limlariga kira oladi.
        </p>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="primary"
          disabled={busy}
        >
          {busy ? "Saqlanmoqda…" : "Adminni yaratish"}
        </button>
      </form>
    </Modal>
  );
}