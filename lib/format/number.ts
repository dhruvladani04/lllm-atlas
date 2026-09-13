/** A token count in "128k" / "1.05M" style — never a four-digit "k" figure. */
export function formatTokenCount(value: number): string {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(2)}M`;
  }
  return `${Math.round(value / 1000)}k`;
}
