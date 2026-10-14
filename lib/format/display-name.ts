/**
 * Names as a list shows them, when two models share one.
 *
 * The registry's `display_name` is the model's name as its sources publish it, and several
 * genuinely share one: "GPT-4o" is both the May and the November 2024 snapshot. In a list
 * that reads as a duplicate row. Where a name is shared, each carries its release month;
 * where the month is shared too, the model id's own last segment, which is the one string
 * guaranteed to differ. Nothing is renamed — the registry is untouched, and a name that is
 * unique is returned as it is.
 */

interface Named {
  model_id: string;
  display_name: string;
  released_at: string | null;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function month(date: string | null): string | null {
  const match = date === null ? null : /^(\d{4})-(\d{2})/.exec(date);
  if (match === null) return null;
  return `${MONTHS[Number(match[2]) - 1]} ${match[1]}`;
}

export function distinctDisplayNames(models: readonly Named[]): Map<string, string> {
  const byName = new Map<string, Named[]>();
  for (const model of models) {
    byName.set(model.display_name, [...(byName.get(model.display_name) ?? []), model]);
  }

  const names = new Map<string, string>();
  for (const [name, group] of byName) {
    if (group.length === 1) {
      names.set(group[0]!.model_id, name);
      continue;
    }
    const months = group.map((model) => month(model.released_at));
    for (const [index, model] of group.entries()) {
      const when = months[index] ?? null;
      const unique = when !== null && months.filter((m) => m === when).length === 1;
      const tail = model.model_id.split("/").pop() ?? model.model_id;
      names.set(model.model_id, `${name} (${unique ? when : tail})`);
    }
  }
  return names;
}

/** "DeepSeek,Peking University" was made by DeepSeek first; the filter lists it there. */
export function primaryCreator(creator: string): string {
  return creator.split(",")[0]?.trim() || creator;
}
