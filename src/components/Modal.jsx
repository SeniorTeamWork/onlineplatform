import { useEffect, useRef } from "react";
export default function Modal({
  title,
  onClose,
  children
}) {
  const ref = useRef(null);
  useEffect(() => {
    const old = document.activeElement;
    ref.current?.focus();
    const saved = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = saved;
      old?.focus();
    };
  }, []);
  function key(e) {
    if (e.key === "Escape") onClose();
    if (e.key === "Tab") {
      const list = ref.current.querySelectorAll("button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href]");
      if (!list.length) return;
      const first = list[0],
        last = list[list.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }
  return <div className="modal-backdrop">
      <section ref={ref} tabIndex={-1} onKeyDown={key} className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="row">
          <h2>{title}</h2>
          <button className="ghost" aria-label="Yopish" onClick={onClose}>
            ×
          </button>
        </div>
        {children}
      </section>
    </div>;
}
