import { logoFor, monogram } from "@/lib/creators/logo";

/**
 * specs/04-design/design-system.md — a vendor's mark beside its name.
 *
 * Always decorative: the creator's name is rendered as text wherever this appears, so the
 * mark is hidden from assistive technology and nothing depends on it loading. It is drawn
 * as a mask filled with the current text colour, which keeps every mark monochrome and
 * inside the palette in both schemes — a vendor's brand colour here would be a second
 * accent hue by another name.
 *
 * A creator with no committed mark gets a monogram, so a newly approved creator never
 * renders a broken image.
 */
export function CreatorLogo({ creator }: { creator: string }) {
  const slug = logoFor(creator);

  if (slug === null) {
    return (
      <span
        aria-hidden="true"
        className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-sm border border-rule text-xs leading-none text-ink-mute"
      >
        {monogram(creator)}
      </span>
    );
  }

  const mask = `url(/logos/${slug}.svg) center / contain no-repeat`;
  return (
    <span
      aria-hidden="true"
      className="inline-block h-[18px] w-[18px] shrink-0 bg-current"
      style={{ mask, WebkitMask: mask }}
    />
  );
}
