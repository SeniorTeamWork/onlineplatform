import {
  useLayoutEffect,
  useRef,
  useState,
} from "react";

const digits = (value) =>
  String(value ?? "").replace(/\D/g, "");

export function phoneValue(value) {
  const text = String(value ?? "").trim();
  let number = digits(text);

  if (
    number.startsWith("998") &&
    (number.length > 9 || text.startsWith("+998"))
  ) {
    number = number.slice(3);
  }

  number = number.slice(0, 9);

  return number ? "+998" + number : "";
}

export function phoneDisplay(value) {
  const local = phoneValue(value).slice(4);

  const groups = [
    local.slice(0, 2),
    local.slice(2, 5),
    local.slice(5, 7),
    local.slice(7, 9),
  ].filter(Boolean);

  return "+998" + (groups.length ? " " + groups.join("-") : "");
}

export function amountDisplay(value) {
  return digits(value)
    .replace(/^0+(?=\d)/, "")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function MoneyInput({
  value,
  defaultValue = "",
  onValueChange,
  name,
  min = 0,
  max = 1000000000000,
  required = false,
  disabled = false,
  ...props
}) {
  const [internal, setInternal] = useState(
    String(defaultValue)
  );

  const inputRef = useRef(null);

  const raw = digits(
    value !== undefined ? value : internal
  ).replace(/^0+(?=\d)/, "");

  useLayoutEffect(() => {
    const number = Number(raw);
    let message = "";

    if (!raw) {
      message = required ? "Summani kiriting." : "";
    } else if (
      !Number.isSafeInteger(number) ||
      number < Number(min) ||
      number > Number(max)
    ) {
      message =
        "Summa " +
        amountDisplay(min) +
        " dan " +
        amountDisplay(max) +
        " gacha bo‘lishi kerak.";
    }

    inputRef.current?.setCustomValidity(message);
  }, [raw, required, min, max]);

  function change(event) {
    const text = event.target.value;

    if (/[-+eE]/.test(text)) {
      event.target.value = amountDisplay(raw);
      return;
    }

    const clean = digits(text)
      .replace(/^0+(?=\d)/, "")
      .slice(0, 13);

    setInternal(clean);
    onValueChange?.(clean);
  }

  return (
    <>
      <input
        {...props}
        ref={inputRef}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        disabled={disabled}
        required={required}
        value={amountDisplay(raw)}
        onChange={change}
      />

      {name && (
        <input
          type="hidden"
          name={name}
          value={raw}
          disabled={disabled}
        />
      )}
    </>
  );
}

export function PhoneInput({
  value,
  defaultValue = "",
  onValueChange,
  name,
  required = false,
  disabled = false,
  ...props
}) {
  const [internal, setInternal] = useState(() =>
    phoneValue(defaultValue)
  );

  const inputRef = useRef(null);

  const raw = phoneValue(
    value !== undefined ? value : internal
  );

  useLayoutEffect(() => {
    let message = "";

    if (!raw) {
      message = required
        ? "Telefon raqamini kiriting."
        : "";
    } else if (!/^\+998\d{9}$/.test(raw)) {
      message =
        "Telefon raqamini to‘liq kiriting: +998 90-123-45-67.";
    }

    inputRef.current?.setCustomValidity(message);
  }, [raw, required]);

  function change(event) {
    const clean = phoneValue(event.target.value);

    setInternal(clean);
    onValueChange?.(clean);
  }

  return (
    <>
      <input
        {...props}
        ref={inputRef}s
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        disabled={disabled}
        aria-required={required}
        value={phoneDisplay(raw)}
        onChange={change}
      />

      {name && (
        <input
          type="hidden"
          name={name}
          value={raw}
          disabled={disabled}
        />
      )}
    </>
  );
}