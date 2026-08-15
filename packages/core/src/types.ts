export const RECEIPT_SCHEMA_VERSION = "attestkit/v1" as const;
export const POLICY_SCHEMA_VERSION = "attestkit-policy/v1" as const;
export type ReceiptStatus = "passed" | "failed" | "partial";
export type ArtifactKind = "junit" | "sarif" | "file";
export type Severity = "error" | "warning";

export interface CommandEvidence {
  argv: string[];
  exitCode: number | null;
  durationMs: number;
  stdout: string;
  stderr: string;
  stdoutTruncated: boolean;
  stderrTruncated: boolean;
}
export interface SourceContext {
  head: string | null;
  branch: string | null;
  dirty: boolean | null;
  changedPaths: string[];
}
export interface EnvironmentContext {
  platform: string;
  arch: string;
  runtime: { node: string | null };
  ci: boolean;
  safeEnvironment: Record<string, string>;
  redactedEnvironmentKeys: string[];
}
export interface ArtifactEvidence {
  kind: ArtifactKind;
  path: string;
  sha256: string;
  sizeBytes: number;
}
export interface RedactionEvidence {
  profile: string;
  applied: string[];
  counts: Record<string, number>;
}
export interface ReceiptPayload {
  capturedAt: string;
  status: ReceiptStatus;
  command: CommandEvidence;
  source: SourceContext;
  environment: EnvironmentContext;
  artifacts: ArtifactEvidence[];
  redaction: RedactionEvidence;
  warnings: string[];
}
export interface ReceiptIntegrity {
  algorithm: "sha256";
  payloadSha256: string;
}
export interface Receipt {
  schemaVersion: typeof RECEIPT_SCHEMA_VERSION;
  payload: ReceiptPayload;
  integrity: ReceiptIntegrity;
}
export interface IntegrityResult {
  valid: boolean;
  expected: string;
  actual: string | null;
  errors: string[];
}
export interface Finding {
  id: string;
  severity: Severity;
  message: string;
  remediation: string;
}
export type PolicyRequirement =
  | "command-succeeded"
  | "has-artifact"
  | "clean-workspace";
export interface PolicyRule {
  id: string;
  require: PolicyRequirement;
  severity?: Severity;
  message?: string;
}
export interface ReceiptPolicy {
  schemaVersion: typeof POLICY_SCHEMA_VERSION;
  rules: PolicyRule[];
}
