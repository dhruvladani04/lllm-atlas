/**
 * specs/04-design/design-system.md — a table row that stacks on a phone.
 *
 * Below `md` each row is laid out as a card: rank, name and headline number on the first
 * line, then one labelled line per remaining column. It is still one table — the same
 * elements, restyled — so the DOM is not doubled and a screen reader still gets rows and
 * cells. A table using these classes must put explicit ARIA roles on its elements
 * (`table`, `rowgroup`, `row`, `columnheader`, `cell`): changing `display` on a table
 * element drops its implicit role in some browsers.
 *
 * The header row is drawn only from `md` up. Below that it stays in the accessibility tree
 * (`max-md:sr-only`) and each cell shows its own column name from `data-label`.
 */

export const STACKED_ROW =
  "border-b border-rule max-md:grid max-md:grid-cols-[1.75rem_minmax(0,1fr)_auto] max-md:gap-x-3 max-md:py-3";

export const STACKED_CELL = "py-2 pr-3 max-md:p-0";

/** A column that becomes a labelled line on a phone; the label comes from `data-label`. */
export const STACKED_META =
  "max-md:col-span-2 max-md:col-start-2 max-md:flex max-md:justify-between max-md:gap-3 max-md:pt-1 max-md:text-xs max-md:before:text-ink-mute max-md:before:content-[attr(data-label)]";

/** A badge column on a phone: a line of its own under the labelled ones. */
export const STACKED_BADGES = "max-md:col-span-2 max-md:col-start-2 max-md:pt-2";
