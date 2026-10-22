import { useState } from "react";

import { useApp } from "../context/AppContext";
import { money } from "../services/db";

import {
  calendarStatistics,
} from "../services/calendarStatistics";

export default function Statistics() {
  const { data } = useApp();

  const [period, setPeriod] =
    useState("week");

  const stats = calendarStatistics(
    data,
    period
  );

  const max = Math.max(
    1,
    ...stats.buckets.map(
      (bucket) => bucket.amount
    )
  );

  return (
    <section className="panel detail-panel">
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
            <option value="week">
              1 haftalik
            </option>

            <option value="month">
              1 oylik
            </option>
          </select>
        </label>
      </div>

      <div className="stats">
        <div className="stat">
          <strong>
            {money(stats.total)}
          </strong>

          <span>
            Qabul qilingan to‘lovlar
          </span>
        </div>

        <div className="stat">
          <strong>{stats.count}</strong>
          <span>To‘lovlar soni</span>
        </div>
      </div>

      <div
        className="chart-bars"
        aria-label="Kunlar bo‘yicha to‘lovlar"
      >
        {stats.buckets.map((bucket) => (
          <div
            className="chart-column"
            key={bucket.date}
            title={
              bucket.date +
              ": " +
              money(bucket.amount)
            }
          >
            <div className="chart-space">
              <div
                className="chart-fill"
                style={{
                  height:
                    (bucket.amount / max) *
                      100 +
                    "%",
                }}
              />
            </div>

            <span>
              {bucket.date.slice(8)}
            </span>
          </div>
        ))}
      </div>

      <details>
        <summary>
          Kunlik summalarni ko‘rish
        </summary>

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
              {stats.buckets.map(
                (bucket) => (
                  <tr key={bucket.date}>
                    <td>{bucket.date}</td>
                    <td>{bucket.count}</td>

                    <td>
                      {money(bucket.amount)}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}