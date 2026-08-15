/** Deterministic protocol code: redact before persistence; never emit source secrets. */
export interface RedactionResult {
  value: string;
  counts: Record<string, number>;
}
const PATTERNS: Array<{
  name: string;
  expression: RegExp;
  replacement: (match: string) => string;
}> = [
  {
    name: "github-token",
    expression: /(?:gh[pous]_[A-Za-z0-9_]{10,}|github_pat_[A-Za-z0-9_]{20,})/g,
    replacement: () => "[REDACTED]",
  },
  {
    name: "aws-access-key",
    expression: /AKIA[0-9A-Z]{16}/g,
    replacement: () => "[REDACTED]",
  },
  {
    name: "assignment-secret",
    expression: /\b(?:api[_-]?key|token|secret|password)\s*[:=]\s*[^\s'"`]+/gi,
    replacement: match => `${match.split(/[:=]/, 1)[0]}=[REDACTED]`,
  },
];
export function redactText(value: string): RedactionResult {
  const counts: Record<string, number> = {};
  let redacted = value;
  for (const pattern of PATTERNS)
    redacted = redacted.replace(pattern.expression, match => {
      counts[pattern.name] = (counts[pattern.name] ?? 0) + 1;
      return pattern.replacement(match);
    });
  return { value: redacted, counts };
}
export function mergeRedactionCounts(
  ...sets: Record<string, number>[]
): Record<string, number> {
  const combined: Record<string, number> = {};
  for (const set of sets)
    for (const [name, count] of Object.entries(set))
      combined[name] = (combined[name] ?? 0) + count;
  return Object.fromEntries(
    Object.entries(combined).sort(([left], [right]) =>
      left.localeCompare(right)
    )
  );
}
