import { useState } from "react";

import { useApp } from "../context/AppContext";

import {
  uid,
  integer,
  money,
  localDate,
} from "../services/db";

import { MoneyInput } from "./FormattedInputs";
import Modal from "./Modal";

export default function Expenses() {
  const { data, user, update, notify } = useApp();

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState("");

  async function save(event) {
    event.preventDefault();

    if (busy) return;

    const fields = new FormData(event.currentTarget);

    setBusy(true);

    try {
      const saved = await update((draft) => {
        draft.expenses ??= [];

        draft.expenses.push({
          id: uid(),
          title: String(fields.get("title") || "").trim(),
          amount: integer(fields.get("amount"), 1),
          date: fields.get("date"),
          note: String(fields.get("note") || "").trim(),
          createdBy: user.id,
          createdAt: new Date().toISOString(),
        });
      });

      if (saved) {
        setOpen(false);
        setAmount("");
      }
    } catch (error) {
      notify(error.message);
    } finally {
      setBusy(false);
    }
  }

  const rows = data.expenses || [];

  const income = data.payments
    .filter((payment) => !payment.voidedAt)
    .reduce(
      (sum, payment) => sum + payment.amount,
      0
    );

  const out = rows.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );

  return (
    <section className="panel detail-panel">
      <div className="row">
        <h2>Kirim va chiqim</h2>

        <button
          type="button"
          className="primary"
          onClick={() => {
            setAmount("");
            setOpen(true);
          }}
        >
          + Chiqim qo‘shish
        </button>
      </div>

      <div className="stats">
        <div className="stat">
          <strong>{money(income)}</strong>
          <span>Kirim</span>
        </div>

        <div className="stat">
          <strong>{money(out)}</strong>
          <span>Chiqim</span>
        </div>

        <div className="stat">
          <strong>{money(income - out)}</strong>
          <span>Qoldiq</span>
        </div>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Sana</th>
              <th>Xarajat</th>
              <th>Summa</th>
              <th>Izoh</th>
            </tr>
          </thead>

          <tbody>
            {[...rows].reverse().map((expense) => (
              <tr key={expense.id}>
                <td>{expense.date}</td>
                <td>{expense.title}</td>
                <td>{money(expense.amount)}</td>
                <td>{expense.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!rows.length && (
        <p>Chiqimlar kiritilmagan.</p>
      )}

      {open && (
        <Modal
          title="Chiqim qo‘shish"
          onClose={() => setOpen(false)}
        >
          <form onSubmit={save}>
            <label>
              Xarajat nomi
              <input
                name="title"
                required
                minLength={2}
              />
            </label>

            <label>
              Summa (so‘m)
              <MoneyInput
                name="amount"
                min={1}
                required
                value={amount}
                onValueChange={setAmount}
              />
            </label>

            <label>
              Sana
              <input
                type="date"
                name="date"
                required
                defaultValue={localDate()}
                max={localDate()}
              />
            </label>

            <label>
              Izoh
              <textarea name="note" />
            </label>

            <button
              type="submit"
              className="primary"
              disabled={busy}
            >
              {busy ? "Saqlanmoqda…" : "Saqlash"}
            </button>
          </form>
        </Modal>
      )}
    </section>
  );
}