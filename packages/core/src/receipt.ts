import { canonicalJson } from "./canonical.js";
import {
  POLICY_SCHEMA_VERSION,
  RECEIPT_SCHEMA_VERSION,
  type Finding,
  type IntegrityResult,
  type Receipt,
  type ReceiptPayload,
  type ReceiptPolicy,
} from "./types.js";

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), byte =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}
export async function sha256(value: string): Promise<string> {
  if (!globalThis.crypto?.subtle)
    throw new Error(
      "Web Crypto SubtleCrypto is required for SHA-256 receipt integrity."
    );
  return toHex(
    await globalThis.crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(value)
    )
  );
}
function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((left, right) =>
    left.localeCompare(right)
  );
}
export function normalizePayload(payload: ReceiptPayload): ReceiptPayload {
  return {
    ...payload,
    command: { ...payload.command, argv: [...payload.command.argv] },
    source: {
      ...payload.source,
      changedPaths: uniqueSorted(payload.source.changedPaths),
    },
    environment: {
      ...payload.environment,
      safeEnvironment: Object.fromEntries(
        Object.entries(payload.environment.safeEnvironment).sort(
          ([left], [right]) => left.localeCompare(right)
        )
      ),
      redactedEnvironmentKeys: uniqueSorted(
        payload.environment.redactedEnvironmentKeys
      ),
    },
    artifacts: [...payload.artifacts].sort((left, right) =>
      left.path.localeCompare(right.path)
    ),
    redaction: {
      ...payload.redaction,
      applied: uniqueSorted(payload.redaction.applied),
      counts: Object.fromEntries(
        Object.entries(payload.redaction.counts).sort(([left], [right]) =>
          left.localeCompare(right)
        )
      ),
    },
    warnings: uniqueSorted(payload.warnings),
  };
}
export async function createReceipt(payload: ReceiptPayload): Promise<Receipt> {
  const normalized = normalizePayload(payload);
  return {
    schemaVersion: RECEIPT_SCHEMA_VERSION,
    payload: normalized,
    integrity: {
      algorithm: "sha256",
      payloadSha256: await sha256(canonicalJson(normalized)),
    },
  };
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
export function validateReceipt(value: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!isRecord(value))
    return { valid: false, errors: ["Receipt must be a JSON object."] };
  if (value.schemaVersion !== RECEIPT_SCHEMA_VERSION)
    errors.push(`Unsupported schemaVersion: ${String(value.schemaVersion)}.`);
  if (!isRecord(value.payload))
    errors.push("Receipt payload must be an object.");
  if (!isRecord(value.integrity))
    errors.push("Receipt integrity must be an object.");
  if (isRecord(value.integrity)) {
    if (value.integrity.algorithm !== "sha256")
      errors.push("Receipt integrity algorithm must be sha256.");
    if (
      typeof value.integrity.payloadSha256 !== "string" ||
      !/^[a-f0-9]{64}$/i.test(value.integrity.payloadSha256)
    )
      errors.push(
        "Receipt integrity payloadSha256 must be a SHA-256 hexadecimal digest."
      );
  }
  return { valid: errors.length === 0, errors };
}
export async function verifyReceipt(value: unknown): Promise<IntegrityResult> {
  const structural = validateReceipt(value);
  if (!structural.valid || !isRecord(value) || !isRecord(value.integrity)) {
    const expected =
      isRecord(value) &&
      isRecord(value.integrity) &&
      typeof value.integrity.payloadSha256 === "string"
        ? value.integrity.payloadSha256
        : "";
    return { valid: false, expected, actual: null, errors: structural.errors };
  }
  try {
    const actual = await sha256(canonicalJson(value.payload));
    const expected = value.integrity.payloadSha256 as string;
    return {
      valid: actual === expected,
      expected,
      actual,
      errors:
        actual === expected
          ? []
          : ["Payload digest does not match the receipt integrity value."],
    };
  } catch (error) {
    return {
      valid: false,
      expected: value.integrity.payloadSha256 as string,
      actual: null,
      errors: [
        error instanceof Error
          ? error.message
          : "Could not verify receipt integrity.",
      ],
    };
  }
}
export function evaluatePolicy(
  receipt: Receipt,
  policy: ReceiptPolicy
): Finding[] {
  if (policy.schemaVersion !== POLICY_SCHEMA_VERSION)
    return [
      {
        id: "policy.unsupported-schema",
        severity: "error",
        message: `Unsupported policy schema: ${policy.schemaVersion}.`,
        remediation: `Use ${POLICY_SCHEMA_VERSION}.`,
      },
    ];
  const findings: Finding[] = [];
  for (const rule of [...policy.rules].sort((left, right) =>
    left.id.localeCompare(right.id)
  )) {
    const severity = rule.severity ?? "error";
    const fail = (message: string, remediation: string) =>
      findings.push({
        id: rule.id,
        severity,
        message: rule.message ?? message,
        remediation,
      });
    if (
      rule.require === "command-succeeded" &&
      receipt.payload.status !== "passed"
    )
      fail(
        "The receipt does not show a successful target command.",
        "Run the intended verification command and attach its receipt."
      );
    if (
      rule.require === "has-artifact" &&
      receipt.payload.artifacts.length === 0
    )
      fail(
        "The receipt does not contain a hashed evidence artifact.",
        "Capture an explicit test or scan artifact with --artifact."
      );
    if (
      rule.require === "clean-workspace" &&
      receipt.payload.source.dirty !== false
    )
      fail(
        "The receipt was not captured from a clean workspace.",
        "Commit or stash unrelated changes, then capture again."
      );
  }
  return findings;
}
