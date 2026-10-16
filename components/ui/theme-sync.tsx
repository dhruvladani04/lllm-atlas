"use client";

import { useLayoutEffect } from "react";

/**
 * Re-applies a stored scheme after React's development remount.
 *
 * Strict Mode resets `<html>` to the attributes React manages, which clears the
 * `data-theme` the inline script set while the page was parsing. This puts it back before
 * paint. In production nothing remounts, and this finds the attribute already right.
 */
export function ThemeSync() {
  useLayoutEffect(() => {
    try {
      const stored = localStorage.getItem("llm-atlas-theme");
      if (stored === "light" || stored === "dark") {
        document.documentElement.setAttribute("data-theme", stored);
      }
    } catch {
      // Storage is blocked; the operating system's scheme applies.
    }
  }, []);
  return null;
}
