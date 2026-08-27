import { useEffect } from "react";

/** Vertical gap between the anchor element and its floating dropdown. */
export const DROPDOWN_GAP = 8;

/** Shared surface styling for portal'd dropdown panels. */
export const DROPDOWN_PANEL_CLASS =
  "fixed z-[999] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md shadow-xl shadow-slate-200/50 dark:shadow-slate-600/50";

export type DropdownAlign = "left" | "right" | "stretch";

type PositionOptions = { gap?: number; align?: DropdownAlign };

/**
 * Places `panel` (a position:fixed element rendered in a portal) below `anchor`,
 * flipping it above when there isn't enough room below the fold.
 * Never rely on CSS margins here: `top` offsets the *margin box* of fixed
 * elements, so any margin class silently breaks the computed position.
 */
export const syncDropdownPosition = (
  anchor: HTMLElement | null,
  panel: HTMLElement | null,
  { gap = DROPDOWN_GAP, align = "stretch" }: PositionOptions = {},
) => {
  if (!anchor || !panel) return;
  const rect = anchor.getBoundingClientRect();

  panel.style.setProperty("height", "auto");
  panel.style.setProperty("z-index", "999");

  let left = rect.left;
  if (align === "stretch") {
    panel.style.setProperty("width", `${rect.width}px`);
  } else {
    panel.style.removeProperty("width");
    if (align === "right") left = rect.right - panel.offsetWidth;
  }
  panel.style.setProperty("left", `${left}px`);

  const panelHeight = panel.offsetHeight;
  const fitsBelow = window.innerHeight - rect.bottom >= panelHeight + gap;
  if (!fitsBelow && rect.top >= panelHeight + gap) {
    // Flip above, keeping the same gap between anchor top and panel bottom.
    panel.style.setProperty("top", `${rect.top - gap - panelHeight}px`);
  } else {
    panel.style.setProperty("top", `${rect.bottom + gap}px`);
  }
};

/**
 * Keeps an open dropdown glued to its anchor element.
 * - "scroll" is captured because it doesn't bubble from nested containers
 * - ResizeObserver covers layout changes that don't fire resize
 * - rAF coalesces event bursts into one layout pass per frame
 */
export const useDropdownPosition = (
  open: boolean,
  anchorRef: { current: HTMLElement | null },
  panelRef: { current: HTMLElement | null },
  options?: PositionOptions,
) => {
  useEffect(() => {
    if (!open) return;
    let rafId = 0;
    const sync = () => syncDropdownPosition(anchorRef.current, panelRef.current, options);
    const scheduleSync = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(sync);
    };
    const resizeObserver = new ResizeObserver(scheduleSync);
    resizeObserver.observe(document.body);
    document.addEventListener("scroll", scheduleSync, true);
    window.addEventListener("resize", scheduleSync);
    sync();
    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      document.removeEventListener("scroll", scheduleSync, true);
      window.removeEventListener("resize", scheduleSync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
};
