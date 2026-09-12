import Link from "next/link";

/** Errors say what happened and what to do — specs/04-design/design-system.md. */
export default function NotFound() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-xl font-medium">That page does not exist</h1>
      <p className="mt-3 max-w-[66ch] text-base">
        The address is wrong, or it pointed at a model or benchmark this site does not
        track. Nothing was deleted — pages here are generated from the registry, so a
        model that was never added never had a page.
      </p>
      <ul className="mt-6 space-y-2 text-sm">
        <li>
          <Link href="/models" className="underline">
            The leaderboard
          </Link>{" "}
          lists every model on the site.
        </li>
        <li>
          <Link href="/benchmarks" className="underline">
            The benchmark matrix
          </Link>{" "}
          lists every benchmark.
        </li>
        <li>
          <Link href="/evals" className="underline">
            The evals guides
          </Link>{" "}
          are about measuring your own application.
        </li>
      </ul>
    </main>
  );
}
