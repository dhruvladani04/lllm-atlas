"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

/**
 * specs/04-design/design-system.md — the main navigation.
 *
 * Two jobs the server-rendered list could not do: say which section the reader is in, and
 * get out of the way on a phone. Five links wrapped to two lines at 390px with the scheme
 * button stranded on a third; below `sm` they sit behind a menu button instead.
 *
 * The list is server-rendered and in the HTML either way. Where scripting is unavailable
 * it stays visible, so the menu button is never the only route to a section.
 */

export function SiteNav({ items }: { items: readonly { href: Route; label: string }[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close on navigation. Tracking the path in state and resetting during render is the
  // documented alternative to an effect, and it avoids painting the open menu over the
  // new page for a frame.
  const [seen, setSeen] = useState(pathname);
  if (seen !== pathname) {
    setSeen(pathname);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="site-nav"
        onClick={() => setOpen((value) => !value)}
        className="order-3 rounded-sm border border-rule-strong px-2 py-0.5 text-xs text-ink-mute hover:border-accent hover:text-accent sm:hidden [@media(scripting:none)]:hidden"
      >
        Menu
      </button>

      <nav
        id="site-nav"
        aria-label="Main"
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
        className={`order-4 basis-full sm:order-2 sm:block sm:basis-auto [@media(scripting:none)]:block ${
          open ? "block" : "hidden"
        }`}
      >
        <ul className="flex flex-col gap-y-1 border-t border-rule pt-2 text-sm sm:flex-row sm:gap-x-4 sm:border-0 sm:pt-0">
          {items.map((item) => {
            // A model page is still "Leaderboard": the section, not the exact route.
            const current =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={current ? "page" : undefined}
                  className={`block py-1 underline-offset-[6px] hover:text-ink hover:underline sm:py-0 ${
                    current
                      ? "font-medium text-ink underline decoration-2"
                      : "text-ink-mute"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
