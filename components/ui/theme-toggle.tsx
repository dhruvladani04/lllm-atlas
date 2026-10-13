"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";

/**
 * specs/04-design/design-system.md — the scheme toggle.
 *
 * Dark is the default and is what the server renders. A reader who chose light has that
 * applied by the inline script in `app/layout.tsx` before first paint; this component then
 * reads the same key, so its label agrees with the page. The server snapshot is always
 * "dark", and `useSyncExternalStore` re-renders after hydration when the stored value
 * differs — a label swap, not a hydration error.
 */

export const THEME_KEY = "llm-atlas-theme";
const CHANGED = "llm-atlas-theme-changed";

type Theme = "dark" | "light";

/** Used when storage is unavailable, so the toggle still works for the visit. */
let remembered: Theme = "dark";

function read(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return stored === null ? remembered : stored === "light" ? "light" : "dark";
  } catch {
    return remembered;
  }
}

function apply(theme: Theme): void {
  const root = document.documentElement;
  if (theme === "light") root.setAttribute("data-theme", "light");
  else root.removeAttribute("data-theme");
}

function subscribe(listener: () => void): () => void {
  window.addEventListener(CHANGED, listener);
  // Another tab changing the scheme changes this one too.
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(CHANGED, listener);
    window.removeEventListener("storage", listener);
  };
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, read, () => "dark" as const);
  const next: Theme = theme === "dark" ? "light" : "dark";

  // Strict Mode's development remount resets <html> to the attributes React manages,
  // clearing the one the inline script set. Re-applying here is a no-op in production.
  //
  // It applies the stored value, not `theme`: during hydration `theme` is still the server
  // snapshot, and applying that would strip a light reader's scheme for a frame — the
  // flash the inline script exists to prevent.
  useLayoutEffect(() => {
    apply(read());
  }, [theme]);

  return (
    <button
      type="button"
      className="rounded-sm border border-rule-strong px-2 py-0.5 text-xs text-ink-mute hover:border-accent hover:text-accent"
      onClick={() => {
        remembered = next;
        try {
          localStorage.setItem(THEME_KEY, next);
        } catch {
          // Storage is blocked; the choice lasts for this visit only.
        }
        apply(next);
        window.dispatchEvent(new Event(CHANGED));
      }}
    >
      Switch to {next}
    </button>
  );
}
