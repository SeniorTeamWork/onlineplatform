import { useEffect, useRef } from "react";
import "./Modal.css";

export default function Modal({
  title,
  onClose,
  children,
}) {
  const ref = useRef(null);

  useEffect(() => {
    const old = document.activeElement;
    const saved = document.body.style.overflow;

    ref.current?.focus();
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = saved;
      old?.focus();
    };
  }, []);

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      onClose();
      return;
    }

    if (event.key !== "Tab") return;

    const elements = ref.current.querySelectorAll(
      "button:not([disabled]), input:not([disabled]), " +
      "select:not([disabled]), textarea:not([disabled]), a[href]"
    );

    if (!elements.length) {
      event.preventDefault();
      return;
    }

    const first = elements[0];
    const last = elements[elements.length - 1];
    const active = document.activeElement;

    if (
      event.shiftKey &&
      (active === first || active === ref.current)
    ) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="modal-backdrop">
      <section
        ref={ref}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-header">
          <h2>{title}</h2>

          <button
            type="button"
            className="modal-close"
            aria-label="Yopish"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {children}
      </section>
    </div>
  );
}