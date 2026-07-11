"use client";

import { useEffect, useRef } from "react";

/**
 * Hook to freeze the header row and first N columns of a table.
 * Attaches a ref to the scroll container div wrapping the <table>.
 * Uses CSS custom properties + data attribute; styles live in globals.css.
 */
export function useFreezeColumns(enabled: boolean, columnCount: number = 2) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!enabled) {
      container.removeAttribute("data-freeze-cols");
      for (let i = 0; i < columnCount; i++) {
        container.style.removeProperty(`--freeze-col-${i}-left`);
      }
      return;
    }

    const table = container.querySelector("table");
    if (!table) return;

    const measure = () => {
      const headerCells = table.querySelectorAll("thead tr:first-child th");
      let leftOffset = 0;

      for (let i = 0; i < Math.min(columnCount, headerCells.length); i++) {
        container.style.setProperty(`--freeze-col-${i}-left`, `${leftOffset}px`);
        leftOffset += headerCells[i].getBoundingClientRect().width;
      }

      container.setAttribute("data-freeze-cols", String(columnCount));
    };

    // Measure after render
    measure();

    // Re-measure on resize
    const observer = new ResizeObserver(measure);
    observer.observe(table);

    return () => {
      observer.disconnect();
      container.removeAttribute("data-freeze-cols");
      for (let i = 0; i < columnCount; i++) {
        container.style.removeProperty(`--freeze-col-${i}-left`);
      }
    };
  }, [enabled, columnCount]);

  return containerRef;
}
