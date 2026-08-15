/** Deterministic protocol code: no I/O, no framework imports, no hidden mutations. */
export type CanonicalValue =
  | null
  | boolean
  | number
  | string
  | CanonicalValue[]
  | { [key: string]: CanonicalValue };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function canonicalize(value: unknown): CanonicalValue {
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value))
      throw new Error("Canonical JSON does not support non-finite numbers.");
    return Object.is(value, -0) ? 0 : value;
  }
  if (Array.isArray(value)) return value.map(item => canonicalize(item));
  if (isPlainObject(value)) {
    const result: Record<string, CanonicalValue> = {};
    for (const key of Object.keys(value).sort((left, right) =>
      left.localeCompare(right)
    )) {
      const child = value[key];
      if (child !== undefined) result[key] = canonicalize(child);
    }
    return result;
  }
  throw new Error(
    `Canonical JSON does not support value type: ${typeof value}.`
  );
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}
