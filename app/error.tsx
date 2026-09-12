"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * The 500. It says what happened, what it does not mean, and what to do — the site's data
 * is committed to the repository, so a render failure is never a data-loss event.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-xl font-medium">Something failed while rendering this page</h1>
      <p className="mt-3 max-w-[66ch] text-base">
        This is a fault in the site, not in the data behind it. Every score this site
        shows is committed to its repository and is still there.
      </p>
      <p className="mt-3 max-w-[66ch] text-sm text-ink-mute">
        {error.digest === undefined ? null : (
          <>
            Reference <code className="font-mono">{error.digest}</code>.{" "}
          </>
        )}
        Retrying may work if it was transient.
      </p>
      <div className="mt-6 flex gap-4 text-sm">
        <button type="button" onClick={reset} className="underline underline-offset-2">
          Try again
        </button>
        <Link href="/" className="underline underline-offset-2">
          Go to the home page
        </Link>
      </div>
    </main>
  );
}
