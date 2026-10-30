import { useState } from "react";

import { useApp } from "../context/AppContext";
import { money } from "../services/db";
import { calendarStatistics } from "../services/calendarStatistics";
import { canAdmin } from "../services/adminAccess";

import "./Statistics.css";

function shortMoney(value) {
  const amount = Number(value) || 0;

  if (Math.abs(amount) >= 1_000_000_000) {
    return (
      new Intl.NumberFormat("uz-UZ", {
        maximumFractionDigits: 2,
      }).format(amount / 1_000_000_000) + " mlrd"
    );
  }

  if (Math.abs(amount) >= 1_000_000) {
    return (
      new Intl.NumberFormat("uz-UZ", {
        maximumFractionDigits: 2,
      }).format(amount / 1_000_000) + " mln"
    );
  }

  if (Math.abs(amount) >= 1_000) {
    return (
      new Intl.NumberFormat("uz-UZ", {
        maximumFractionDigits: 2,
      }).format(amount / 1_000) + " ming"
    );
  }

  return new Intl.NumberFormat("uz-UZ").format(amount);
}

export default function Statistics() {
  const { data, user } = useApp();

  const [period, setPeriod] = useState("week");

  if (!canAdmin(user, "statistics")) {
    return null;
  }

  const stats = calendarStatistics(data, period);

  // Qolgan mavjud kod shu yerdan davom etadi.

  const largestAmount = Math.max(
    0,
    ...stats.buckets.map(
      (bucket) => Number(bucket.amount) || 0
    )
  );

  // Eng katta summadan biroz balandroq, qulay shkala.
  const rawStep = largestAmount > 0
    ? largestAmount / 4
    : 25000;

  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;

  const stepFactor =
    normalized <= 1 ? 1 :
    normalized <= 2 ? 2 :
    normalized <= 5 ? 5 : 10;

  const step = stepFactor * magnitude;
  const chartMax = step * 4;

  const scale = [4, 3, 2, 1, 0].map(
    (index) => index * step
  );

  return (
    <section className="panel detail-panel payment-statistics">
      <div className="row">
        <h2>Statistika</h2>

        <label>
          Davr

          <select
            value={period}
            onChange={(event) =>
              setPeriod(event.target.value)
            }
          >
            <option value="week">1 haftalik</option>
            <option value="month">1 oylik</option>
          </select>
        </label>
      </div>

      <div className="stats">
        <div className="stat">
          <strong>{money(stats.total)}</strong>
          <span>Qabul qilingan to‘lovlar</span>
        </div>

        <div className="stat">
          <strong>{stats.count}</strong>
          <span>To‘lovlar soni</span>
        </div>
      </div>

      <div className="payment-chart-caption">
        Kunlik to‘lovlar — so‘m
      </div>

      <div
        className="payment-chart"
        role="group"
        aria-label="Kunlar bo‘yicha to‘lov summalari"
      >
        <div className="payment-chart-axis" aria-hidden="true">
          {scale.map((amount) => (
            <span
              key={amount}
              title={money(amount)}
            >
              {shortMoney(amount)}
            </span>
          ))}
        </div>

        <div className="payment-chart-scroll">
          <div
            className="payment-chart-content"
            style={{
              "--payment-chart-columns": stats.buckets.length,
            }}
          >
            <div className="payment-chart-grid" aria-hidden="true">
              {scale.map((amount) => (
                <span key={amount} />
              ))}
            </div>

            <div className="payment-chart-columns">
              {stats.buckets.map((bucket) => {
                const amount = Number(bucket.amount) || 0;

                const height = Math.max(
                  0,
                  Math.min(100, (amount / chartMax) * 100)
                );

                return (
                  <div
                    className="payment-chart-column"
                    key={bucket.date}
                    title={`${bucket.date}: ${money(amount)}`}
                  >
                    <div className="payment-chart-track">
                      <div
                        className="payment-chart-bar"
                        style={{ height: `${height}%` }}
                      >
                        <span className="payment-chart-value">
                          {shortMoney(amount)}
                        </span>
                      </div>
                    </div>

                    <span className="payment-chart-day">
                      {bucket.date.slice(8)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <details>
        {/* <summary>Kunlik summalarni ko‘rish</summary> */}

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Sana</th>
                <th>To‘lovlar</th>
                <th>Summa</th>
              </tr>
            </thead>

            <tbody>
              {stats.buckets.map((bucket) => (
                <tr key={bucket.date}>
                  <td>{bucket.date}</td>
                  <td>{bucket.count}</td>
                  <td>{money(bucket.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}