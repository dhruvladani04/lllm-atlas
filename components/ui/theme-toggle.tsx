/**
 * specs/04-design/design-system.md — the scheme toggle.
 *
 * A server component with no state of its own. Which icon shows, and what the button is
 * called, are decided by CSS from the scheme in effect — the stored choice if there is one,
 * the operating system's otherwise — so they are right in the server HTML and there is
 * nothing for hydration to disagree with. The click is handled by the inline script in
 * `app/layout.tsx`, which runs while the page is still parsing; that is what makes the very
 * first click work, before React has loaded, where a React handler would do nothing.
 *
 * Each label lives in the half of the button that is displayed, so `display: none` on the
 * other half also takes its name out of the accessibility tree. The accessible name is
 * always the effect of pressing: "Switch to light theme" or "Switch to dark theme".
 */

function Sun() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M12 2.5v2.5M12 19v2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M2.5 12H5M19 12h2.5M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Moon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none">
      <path
        d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ThemeToggle() {
  return (
    <button
      type="button"
      data-theme-toggle=""
      className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-rule-strong text-ink-mute hover:border-accent hover:text-accent"
    >
      {/* Shown while dark is in effect: the action is to go light. */}
      <span className="theme-when-dark items-center" title="Switch to light theme">
        <Sun />
        <span className="sr-only">Switch to light theme</span>
      </span>
      <span className="theme-when-light items-center" title="Switch to dark theme">
        <Moon />
        <span className="sr-only">Switch to dark theme</span>
      </span>
    </button>
  );
}
