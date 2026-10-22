function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

export function calendarStatistics(
  data,
  period,
  now = new Date()
) {
  const parts = new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: "Asia/Tashkent",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).formatToParts(now);

  const value = (type) =>
    parts.find((part) => part.type === type).value;

  const today = [
    value("year"),
    value("month"),
    value("day"),
  ].join("-");

  const date = new Date(today + "T00:00:00Z");

  let start;
  let length;

  if (period === "month") {
    start = new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        1
      )
    );

    length = new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth() + 1,
        0
      )
    ).getUTCDate();
  } else {
    start = new Date(date);

    const daysSinceMonday =
      (start.getUTCDay() + 6) % 7;

    start.setUTCDate(
      start.getUTCDate() - daysSinceMonday
    );

    length = 7;
  }

  const buckets = Array.from(
    { length },
    (_, index) => {
      const day = new Date(start);

      day.setUTCDate(
        day.getUTCDate() + index
      );

      return {
        date: dateKey(day),
        amount: 0,
        count: 0,
      };
    }
  );

  const byDate = new Map(
    buckets.map((bucket) => [
      bucket.date,
      bucket,
    ])
  );

  for (const payment of data.payments) {
    if (
      payment.voidedAt ||
      payment.date > today
    ) {
      continue;
    }

    const bucket = byDate.get(payment.date);

    if (bucket) {
      bucket.amount +=
        Number(payment.amount) || 0;

      bucket.count += 1;
    }
  }

  return {
    buckets,

    total: buckets.reduce(
      (sum, bucket) => sum + bucket.amount,
      0
    ),

    count: buckets.reduce(
      (sum, bucket) => sum + bucket.count,
      0
    ),
  };
}