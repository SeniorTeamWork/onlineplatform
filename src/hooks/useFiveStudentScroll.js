import {
  useLayoutEffect,
  useRef,
} from "react";

export default function useFiveStudentScroll(
  rowKey
) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const container = ref.current;

    const table =
      container?.querySelector("table");

    if (!container || !table) return;

    const measure = () => {
      const rows = Array.from(
        table.tBodies[0]?.rows || []
      );

      if (rows.length <= 5) {
        container.style.removeProperty(
          "max-height"
        );

        return;
      }

      const headerHeight =
        table.tHead
          ?.getBoundingClientRect()
          .height || 0;

      const height = rows
        .slice(0, 5)
        .reduce(
          (sum, row) =>
            sum +
            row.getBoundingClientRect().height,
          headerHeight
        );

      container.style.maxHeight =
        Math.ceil(height + 2) + "px";
    };

    measure();

    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(measure)
        : null;

    observer?.observe(table);

    window.addEventListener(
      "resize",
      measure
    );

    return () => {
      observer?.disconnect();

      window.removeEventListener(
        "resize",
        measure
      );
    };
  }, [rowKey]);

  return ref;
}