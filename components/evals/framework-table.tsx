import { loadFrameworks } from "@/lib/evals/load";
import { VerifiedStamp } from "@/components/evals/verified-stamp";

/**
 * specs/03-sections/evals.md — `<FrameworkTable>`.
 *
 * Reads from `content/evals/_frameworks.yaml` so the comparison lives in one place and its
 * `verified_on` is enforced rather than repeated. Organised by which archetype each
 * framework serves, because that is the actual decision a reader is making — not one row
 * per framework's feature checklist.
 */
export function FrameworkTable({ archetype }: { archetype?: string }) {
  const file = loadFrameworks();
  if (file === null) {
    return (
      <p className="my-6 text-sm text-ink-mute">
        The framework comparison data is missing from this build, so nothing is shown
        here.
      </p>
    );
  }

  const rows =
    archetype === undefined
      ? file.frameworks
      : file.frameworks.filter((entry) => entry.archetypes.includes(archetype));

  return (
    <div className="my-6">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-rule-strong text-left">
              <th scope="col" className="py-2 pr-3 font-medium">
                Framework
              </th>
              <th scope="col" className="py-2 pr-3 font-medium">
                Serves
              </th>
              <th scope="col" className="py-2 pr-3 font-medium">
                Strength
              </th>
              <th scope="col" className="py-2 pr-3 font-medium">
                Watch out for
              </th>
              <th scope="col" className="py-2 font-medium">
                Licence
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((entry) => (
              <tr key={entry.id} className="border-b border-rule align-top">
                <td className="py-2 pr-3">
                  <a className="underline-offset-2 hover:underline" href={entry.url}>
                    {entry.name}
                  </a>
                </td>
                <td className="py-2 pr-3 text-xs text-ink-mute">
                  {entry.archetypes.join(", ")}
                </td>
                <td className="py-2 pr-3">{entry.strength}</td>
                <td className="py-2 pr-3">{entry.watch_out}</td>
                <td className="py-2 font-mono text-xs">{entry.licence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-ink-mute">
        {file.note} <VerifiedStamp verifiedOn={file.verified_on} />
      </p>
    </div>
  );
}
