"use client";

import { useEffect, useRef } from "react";

/**
 * Hook to freeze the header row and first N columns of a table.
 * Attaches a ref to the scroll container div wrapping the <table>.
 *
 * Uses BOTH CSS data-attribute (for header row sticky via globals.css)
 * AND direct inline styles on cells (for reliable column freeze).
 * A MutationObserver re-applies styles when React re-renders rows.
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
      clearFrozenStyles(container);
      return;
    }

    let currentTable: HTMLTableElement | null = null;
    let resizeObs: ResizeObserver | null = null;
    let tableChildObs: MutationObserver | null = null;
    let rafId = 0;

    const applyFreeze = () => {
      const table = container.querySelector("table");
      if (!table) return;

      // If the table element changed (e.g. tab switch), re-attach observers
      if (table !== currentTable) {
        resizeObs?.disconnect();
        tableChildObs?.disconnect();
        currentTable = table;
        resizeObs = new ResizeObserver(scheduleApply);
        resizeObs.observe(table);
        // Re-apply when React adds/removes rows (filter, sort, data load)
        tableChildObs = new MutationObserver(scheduleApply);
        tableChildObs.observe(table, { childList: true, subtree: true });
      }

      // ── Measure header cell widths ──
      const headerCells = table.querySelectorAll<HTMLElement>(
        "thead tr:first-child th"
      );
      let leftOffset = 0;
      const offsets: number[] = [];

      for (let i = 0; i < Math.min(columnCount, headerCells.length); i++) {
        offsets.push(leftOffset);
        container.style.setProperty(
          `--freeze-col-${i}-left`,
          `${leftOffset}px`
        );
        leftOffset += headerCells[i].getBoundingClientRect().width;
      }

      container.setAttribute("data-freeze-cols", String(columnCount));

      // ── Apply inline styles directly on cells ──
      const lastIdx = offsets.length - 1;
      const shadow = "2px 0 5px rgba(0,0,0,0.06)";

      // Header first-row th cells (handles rowSpan)
      for (let i = 0; i <= lastIdx && i < headerCells.length; i++) {
        const s = headerCells[i].style;
        s.position = "sticky";
        s.left = `${offsets[i]}px`;
        s.zIndex = "25";
        if (i === lastIdx) s.boxShadow = shadow;
      }

      // Body td cells — first N per row
      table.querySelectorAll<HTMLElement>("tbody tr").forEach((row) => {
        const cells = row.querySelectorAll<HTMLElement>("td");
        for (let i = 0; i <= lastIdx && i < cells.length; i++) {
          const s = cells[i].style;
          s.position = "sticky";
          s.left = `${offsets[i]}px`;
          s.zIndex = "12";
          if (i === lastIdx) s.boxShadow = shadow;
        }
      });
    };

    // Debounce observer callbacks to batch React DOM updates
    const scheduleApply = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(applyFreeze);
    };

    // Initial apply (synchronous)
    applyFreeze();

    // Watch container children to detect table swaps (tab changes)
    const containerObs = new MutationObserver(scheduleApply);
    containerObs.observe(container, { childList: true });

    return () => {
      cancelAnimationFrame(rafId);
      resizeObs?.disconnect();
      tableChildObs?.disconnect();
      containerObs.disconnect();
      container.removeAttribute("data-freeze-cols");
      for (let i = 0; i < columnCount; i++) {
        container.style.removeProperty(`--freeze-col-${i}-left`);
      }
      clearFrozenStyles(container);
    };
  }, [enabled, columnCount]);

  return containerRef;
}

function clearFrozenStyles(container: HTMLDivElement) {
  const table = container.querySelector("table");
  if (!table) return;

  const clear = (el: HTMLElement) => {
    el.style.removeProperty("position");
    el.style.removeProperty("left");
    el.style.removeProperty("z-index");
    el.style.removeProperty("box-shadow");
  };

  table
    .querySelectorAll<HTMLElement>("thead tr:first-child th")
    .forEach(clear);
  table.querySelectorAll<HTMLElement>("tbody td").forEach(clear);
}
