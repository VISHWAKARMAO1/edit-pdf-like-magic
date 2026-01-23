export type PageRangeParseResult =
  | { ok: true; pages: number[] }
  | { ok: false; error: string };

/**
 * Parses a page range string like: "1,3,5-7".
 * - Pages are 1-based.
 * - Duplicates removed.
 * - Result is sorted.
 */
export function parsePageRange(input: string, maxPage: number): PageRangeParseResult {
  const raw = (input ?? "").trim();
  if (!raw) return { ok: false as const, error: "Please enter a page range." };
  if (!Number.isFinite(maxPage) || maxPage <= 0)
    return { ok: false as const, error: "Invalid PDF page count." };

  const pages = new Set<number>();
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const p of parts) {
    const m = p.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!m) return { ok: false as const, error: `Invalid token: "${p}"` };
    const a = Number(m[1]);
    const b = m[2] ? Number(m[2]) : a;
    if (!Number.isFinite(a) || !Number.isFinite(b))
      return { ok: false as const, error: `Invalid number in: "${p}"` };
    const start = Math.min(a, b);
    const end = Math.max(a, b);
    if (start < 1 || end < 1) return { ok: false as const, error: "Page numbers must start at 1." };
    if (start > maxPage)
      return { ok: false as const, error: `Page ${start} exceeds max page ${maxPage}.` };

    for (let i = start; i <= end && i <= maxPage; i++) pages.add(i);
  }

  const out = Array.from(pages).sort((x, y) => x - y);
  if (!out.length) return { ok: false as const, error: "No pages selected." };
  return { ok: true as const, pages: out };
}

/** Split into groups by ';' or newline: each group is a range like '1-3,5'. */
export function splitRangeGroups(input: string): string[] {
  return (input ?? "")
    .split(/\s*[;\n]+\s*/g)
    .map((s) => s.trim())
    .filter(Boolean);
}
