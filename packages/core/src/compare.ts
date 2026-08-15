import { verifyReceipt, validateReceipt } from "./receipt.js";
import type { Receipt } from "./types.js";

export const COMPARISON_REPORT_VERSION = "attestkit-comparison/v1" as const;

export interface ComparisonField<T> {
  changed: boolean;
  baseline: T;
  current: T;
}

export interface ArtifactComparison {
  added: string[];
  removed: string[];
  changed: string[];
  unchanged: string[];
}

export interface ReceiptComparisonReport {
  reportVersion: typeof COMPARISON_REPORT_VERSION;
  baselineDigest: string;
  currentDigest: string;
  identical: boolean;
  status: ComparisonField<Receipt["payload"]["status"]>;
  command: ComparisonField<string[]>;
  source: ComparisonField<{
    head: string | null;
    branch: string | null;
    dirty: boolean | null;
    changedPaths: string[];
  }>;
  artifacts: ArtifactComparison;
  warnings: ComparisonField<string[]>;
  verificationBoundary: string;
}

export interface ComparisonResult {
  valid: boolean;
  errors: string[];
  report: ReceiptComparisonReport | null;
}

function sorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((left, right) =>
    left.localeCompare(right)
  );
}

function equalJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function field<T>(baseline: T, current: T): ComparisonField<T> {
  return { changed: !equalJson(baseline, current), baseline, current };
}

function artifactComparison(
  baseline: Receipt,
  current: Receipt
): ArtifactComparison {
  const baselineMap = new Map(
    baseline.payload.artifacts.map(artifact => [artifact.path, artifact])
  );
  const currentMap = new Map(
    current.payload.artifacts.map(artifact => [artifact.path, artifact])
  );
  const paths = sorted([
    ...Array.from(baselineMap.keys()),
    ...Array.from(currentMap.keys()),
  ]);
  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];
  const unchanged: string[] = [];
  for (const path of paths) {
    const before = baselineMap.get(path);
    const after = currentMap.get(path);
    if (!before && after) added.push(path);
    else if (before && !after) removed.push(path);
    else if (before && after && before.sha256 !== after.sha256)
      changed.push(path);
    else unchanged.push(path);
  }
  return { added, removed, changed, unchanged };
}

export async function compareReceipts(
  baselineValue: unknown,
  currentValue: unknown
): Promise<ComparisonResult> {
  const baselineShape = validateReceipt(baselineValue);
  const currentShape = validateReceipt(currentValue);
  const errors = [
    ...baselineShape.errors.map(error => `baseline: ${error}`),
    ...currentShape.errors.map(error => `current: ${error}`),
  ];
  if (errors.length > 0) return { valid: false, errors, report: null };
  const baseline = baselineValue as Receipt;
  const current = currentValue as Receipt;
  const [baselineIntegrity, currentIntegrity] = await Promise.all([
    verifyReceipt(baseline),
    verifyReceipt(current),
  ]);
  if (!baselineIntegrity.valid)
    errors.push(...baselineIntegrity.errors.map(error => `baseline: ${error}`));
  if (!currentIntegrity.valid)
    errors.push(...currentIntegrity.errors.map(error => `current: ${error}`));
  if (errors.length > 0) return { valid: false, errors, report: null };

  const artifacts = artifactComparison(baseline, current);
  const report: ReceiptComparisonReport = {
    reportVersion: COMPARISON_REPORT_VERSION,
    baselineDigest: baseline.integrity.payloadSha256,
    currentDigest: current.integrity.payloadSha256,
    identical:
      baseline.integrity.payloadSha256 === current.integrity.payloadSha256,
    status: field(baseline.payload.status, current.payload.status),
    command: field(baseline.payload.command.argv, current.payload.command.argv),
    source: field(
      {
        head: baseline.payload.source.head,
        branch: baseline.payload.source.branch,
        dirty: baseline.payload.source.dirty,
        changedPaths: baseline.payload.source.changedPaths,
      },
      {
        head: current.payload.source.head,
        branch: current.payload.source.branch,
        dirty: current.payload.source.dirty,
        changedPaths: current.payload.source.changedPaths,
      }
    ),
    artifacts,
    warnings: field(baseline.payload.warnings, current.payload.warnings),
    verificationBoundary:
      "Comparison describes differences in validated receipt data. It does not rerun commands, inspect source semantics, or approve correctness/security.",
  };
  return { valid: true, errors: [], report };
}
