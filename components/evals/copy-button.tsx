"use client";

import { useState } from "react";

/** Copy to clipboard, with the result stated rather than animated. */
export function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className="underline-offset-2 hover:underline"
      onClick={() => {
        void navigator.clipboard.writeText(code).then(
          () => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          },
          () => setCopied(false),
        );
      }}
    >
      {copied ? "copied" : "copy"}
    </button>
  );
}
