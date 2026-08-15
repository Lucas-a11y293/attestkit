#!/usr/bin/env node
/** Presentation and adapters only: no protocol rule lives outside @attestkit/core. */
import { readFile, mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";
import {
  POLICY_SCHEMA_VERSION,
  compareReceipts,
  createReceipt,
  evaluatePolicy,
  mergeRedactionCounts,
  redactText,
  validateReceipt,
  verifyReceipt,
  type ArtifactEvidence,
  type Receipt,
  type ReceiptComparisonReport,
  type ReceiptPolicy,
} from "@attestkit/core";
import { EXIT } from "./exit-codes.js";
import { runArgv } from "./runner.js";
import {
  findConfiguredArtifacts,
  hashArtifact,
  pathWithinRoot,
  readSourceContext,
  safeWorkspaceRoot,
} from "./workspace.js";
type OutputFormat = "text" | "json" | "markdown";
interface CaptureOptions {
  out: string;
  workspace: string;
  artifacts: string[];
  allowEnvironment: string[];
  maxOutputBytes: number;
  maxArtifactBytes: number;
  maxFiles: number;
  config: string | null;
}
interface CaptureConfig {
  artifacts?: string[];
  capture?: {
    maxStdoutBytes?: number;
    maxStderrBytes?: number;
    artifactLimits?: { maxFiles?: number; maxFileBytes?: number };
  };
  redaction?: { environmentAllowlist?: string[] };
}
function usage(): string {
  return `AttestKit 0.2.0-rc.1\n\nUsage:\n  attestkit capture [--out receipt.json] [--workspace .] [--artifact path] [--allow-env KEY] -- <command> [args]\n  attestkit inspect <receipt.json> [--format text|json|markdown]\n  attestkit verify <receipt.json> [--workspace .] [--format text|json]\n  attestkit compare <baseline.json> <current.json> [--format text|json|markdown]\n  attestkit policy check <receipt.json> --policy policy.json [--format text|json]\n\nAttestKit records bounded evidence. It never runs a shell and verify never replays a command.`;
}
function isReceipt(value: unknown): value is Receipt {
  return (
    value !== null &&
    typeof value === "object" &&
    "schemaVersion" in value &&
    "payload" in value &&
    "integrity" in value
  );
}
function isComparisonReport(value: unknown): value is ReceiptComparisonReport {
  return (
    value !== null &&
    typeof value === "object" &&
    "reportVersion" in value &&
    value.reportVersion === "attestkit-comparison/v1"
  );
}
function renderComparisonText(report: ReceiptComparisonReport): string {
  return [
    "AttestKit comparison",
    `Identical: ${report.identical}`,
    `Status: ${report.status.baseline} -> ${report.status.current}${report.status.changed ? " (changed)" : ""}`,
    `Command changed: ${report.command.changed}`,
    `Source changed: ${report.source.changed}`,
    `Artifacts: +${report.artifacts.added.length} -${report.artifacts.removed.length} ~${report.artifacts.changed.length} =${report.artifacts.unchanged.length}`,
    `Warnings changed: ${report.warnings.changed}`,
    `Boundary: ${report.verificationBoundary}`,
  ].join("\n");
}
function renderComparisonMarkdown(report: ReceiptComparisonReport): string {
  return `# AttestKit comparison\n\n| Field | Result |\n|---|---|\n| Identical | \`${report.identical}\` |\n| Status | \`${report.status.baseline}\` → \`${report.status.current}\` |\n| Command changed | \`${report.command.changed}\` |\n| Source changed | \`${report.source.changed}\` |\n| Artifacts | +${report.artifacts.added.length} / -${report.artifacts.removed.length} / ~${report.artifacts.changed.length} / =${report.artifacts.unchanged.length} |\n| Warnings changed | \`${report.warnings.changed}\` |\n\n> ${report.verificationBoundary}\n`;
}
function renderText(value: unknown): string {
  if (isComparisonReport(value)) return renderComparisonText(value);
  if (isReceipt(value))
    return [
      "AttestKit receipt",
      `Status: ${value.payload.status}`,
      `Command: ${value.payload.command.argv.join(" ")}`,
      `Exit code: ${value.payload.command.exitCode ?? "not started"}`,
      `Duration: ${value.payload.command.durationMs} ms`,
      `Source: ${value.payload.source.head ?? "unavailable"}${value.payload.source.dirty === true ? " (dirty)" : ""}`,
      `Artifacts: ${value.payload.artifacts.length}`,
      `Payload SHA-256: ${value.integrity.payloadSha256}`,
    ].join("\n");
  return JSON.stringify(value, null, 2);
}
function renderMarkdown(receipt: Receipt): string {
  return `# AttestKit receipt\n\n| Field | Evidence |\n|---|---|\n| Status | \`${receipt.payload.status}\` |\n| Command | \`${receipt.payload.command.argv.join(" ")}\` |\n| Exit code | \`${receipt.payload.command.exitCode ?? "not started"}\` |\n| Source | \`${receipt.payload.source.head ?? "unavailable"}\` |\n| Artifacts | ${receipt.payload.artifacts.length} |\n| Payload digest | \`${receipt.integrity.payloadSha256}\` |\n\n> This receipt is execution evidence, not a correctness or security approval.\n`;
}
function print(value: unknown, format: OutputFormat = "text"): void {
  if (format === "json") return console.log(JSON.stringify(value, null, 2));
  if (format === "markdown" && isComparisonReport(value))
    return console.log(renderComparisonMarkdown(value));
  if (format === "markdown" && isReceipt(value))
    return console.log(renderMarkdown(value));
  console.log(typeof value === "string" ? value : renderText(value));
}
function argumentValue(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  const value = args[index + 1];
  if (!value || value.startsWith("--"))
    throw new Error(`${flag} requires a value.`);
  return value;
}
function repeatedValues(args: string[], flag: string): string[] {
  const values: string[] = [];
  for (let index = 0; index < args.length; index += 1)
    if (args[index] === flag) {
      const value = args[index + 1];
      if (!value || value.startsWith("--"))
        throw new Error(`${flag} requires a value.`);
      values.push(value);
      index += 1;
    }
  return values;
}
function outputFormat(args: string[]): OutputFormat {
  const value = argumentValue(args, "--format") ?? "text";
  if (!["text", "json", "markdown"].includes(value))
    throw new Error("--format must be text, json, or markdown.");
  return value as OutputFormat;
}
async function readJson(path: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    throw new Error(
      `Could not read JSON file ${path}: ${error instanceof Error ? error.message : "unknown error"}`
    );
  }
}
async function readCaptureConfig(
  path: string | null,
  workspace: string
): Promise<CaptureConfig> {
  if (!path) return {};
  const value = await readJson(pathWithinRoot(workspace, path));
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Capture configuration must be a JSON object.");
  return value as CaptureConfig;
}
function parseCaptureOptions(args: string[]): CaptureOptions {
  return {
    out: argumentValue(args, "--out") ?? ".attestkit/receipt.json",
    workspace: argumentValue(args, "--workspace") ?? ".",
    artifacts: repeatedValues(args, "--artifact"),
    allowEnvironment: repeatedValues(args, "--allow-env"),
    maxOutputBytes: Number(
      argumentValue(args, "--max-output-bytes") ?? "65536"
    ),
    maxArtifactBytes: Number(
      argumentValue(args, "--max-artifact-bytes") ?? "2097152"
    ),
    maxFiles: Number(argumentValue(args, "--max-files") ?? "20"),
    config: argumentValue(args, "--config"),
  };
}
function safeEnvironment(keys: string[]): {
  values: Record<string, string>;
  redacted: string[];
} {
  const values: Record<string, string> = {};
  const redacted: string[] = [];
  for (const key of [...new Set(keys)].sort((left, right) =>
    left.localeCompare(right)
  )) {
    const value = process.env[key];
    if (value === undefined) continue;
    if (/(token|secret|password|key)/i.test(key)) redacted.push(key);
    else values[key] = value;
  }
  return { values, redacted };
}
async function writeReceipt(path: string, receipt: Receipt): Promise<void> {
  const output = resolve(path);
  await mkdir(dirname(output), { recursive: true });
  const temporary = `${output}.tmp-${process.pid}`;
  await writeFile(temporary, `${JSON.stringify(receipt, null, 2)}\n`, {
    mode: 0o600,
  });
  await rename(temporary, output);
}
async function capture(args: string[]): Promise<number> {
  const delimiter = args.indexOf("--");
  if (delimiter === -1 || delimiter === args.length - 1)
    throw new Error("capture requires a command after --.");
  const options = parseCaptureOptions(args.slice(0, delimiter));
  if (
    !Number.isSafeInteger(options.maxOutputBytes) ||
    options.maxOutputBytes < 1024
  )
    throw new Error("--max-output-bytes must be at least 1024.");
  const workspace = await safeWorkspaceRoot(options.workspace);
  const config = await readCaptureConfig(options.config, workspace);
  const maxOutputBytes = Math.max(
    config.capture?.maxStdoutBytes ?? 0,
    config.capture?.maxStderrBytes ?? 0,
    options.maxOutputBytes
  );
  const maxArtifactBytes =
    config.capture?.artifactLimits?.maxFileBytes ?? options.maxArtifactBytes;
  const maxFiles = config.capture?.artifactLimits?.maxFiles ?? options.maxFiles;
  const command = await runArgv(
    args.slice(delimiter + 1),
    workspace,
    maxOutputBytes
  );
  const stdout = redactText(command.stdout);
  const stderr = redactText(command.stderr);
  const argvRedactions = command.argv.map(redactText);
  const source = await readSourceContext(workspace);
  const configured = await findConfiguredArtifacts(
    workspace,
    config.artifacts ?? [],
    maxFiles
  );
  const selected = [...new Set([...options.artifacts, ...configured])].sort(
    (left, right) => left.localeCompare(right)
  );
  if (selected.length > maxFiles)
    throw new Error(
      `Selected artifacts exceed configured maximum of ${maxFiles}.`
    );
  const artifacts: ArtifactEvidence[] = [];
  for (const artifact of selected)
    artifacts.push(await hashArtifact(workspace, artifact, maxArtifactBytes));
  const environment = safeEnvironment([
    "CI",
    "NODE_ENV",
    "TZ",
    ...options.allowEnvironment,
    ...(config.redaction?.environmentAllowlist ?? []),
  ]);
  const receipt = await createReceipt({
    capturedAt: new Date().toISOString(),
    status:
      command.exitCode === 0
        ? "passed"
        : command.exitCode === null
          ? "partial"
          : "failed",
    command: {
      ...command,
      argv: argvRedactions.map(result => result.value),
      stdout: stdout.value,
      stderr: stderr.value,
    },
    source,
    environment: {
      platform: process.platform,
      arch: process.arch,
      runtime: { node: process.version },
      ci: process.env.CI === "true",
      safeEnvironment: environment.values,
      redactedEnvironmentKeys: environment.redacted,
    },
    artifacts,
    redaction: {
      profile: "default",
      applied: ["github-token", "aws-access-key", "assignment-secret"],
      counts: mergeRedactionCounts(
        stdout.counts,
        stderr.counts,
        ...argvRedactions.map(result => result.counts)
      ),
    },
    warnings: [
      ...(command.stdoutTruncated ? ["stdout-truncated"] : []),
      ...(command.stderrTruncated ? ["stderr-truncated"] : []),
    ],
  });
  await writeReceipt(options.out, receipt);
  print(receipt, outputFormat(args.slice(0, delimiter)));
  return command.exitCode === 0 ? EXIT.ok : EXIT.verificationFailure;
}
async function inspect(args: string[]): Promise<number> {
  const path = args.find(argument => !argument.startsWith("--"));
  if (!path) throw new Error("inspect requires a receipt path.");
  const receipt = await readJson(path);
  const structural = validateReceipt(receipt);
  if (!structural.valid) {
    print({ valid: false, errors: structural.errors }, outputFormat(args));
    return EXIT.invalidInput;
  }
  print(receipt, outputFormat(args));
  return EXIT.ok;
}
async function verify(args: string[]): Promise<number> {
  const path = args.find(argument => !argument.startsWith("--"));
  if (!path) throw new Error("verify requires a receipt path.");
  const receipt = await readJson(path);
  const integrity = await verifyReceipt(receipt);
  if (!integrity.valid || !isReceipt(receipt)) {
    print({ integrity, artifacts: [] }, outputFormat(args));
    return EXIT.verificationFailure;
  }
  const workspaceFlag = argumentValue(args, "--workspace");
  if (!workspaceFlag) {
    print(
      {
        integrity,
        artifacts:
          "not checked (pass --workspace to hash local artifact paths)",
      },
      outputFormat(args)
    );
    return EXIT.ok;
  }
  const workspace = await safeWorkspaceRoot(workspaceFlag);
  const artifactResults = await Promise.all(
    receipt.payload.artifacts.map(async artifact => {
      try {
        const current = await hashArtifact(
          workspace,
          artifact.path,
          Number.MAX_SAFE_INTEGER
        );
        return {
          path: artifact.path,
          valid: current.sha256 === artifact.sha256,
          expected: artifact.sha256,
          actual: current.sha256,
        };
      } catch (error) {
        return {
          path: artifact.path,
          valid: false,
          expected: artifact.sha256,
          actual: null,
          error:
            error instanceof Error ? error.message : "Could not hash artifact.",
        };
      }
    })
  );
  const complete = artifactResults.every(artifact => artifact.valid);
  print({ integrity, artifacts: artifactResults }, outputFormat(args));
  return complete ? EXIT.ok : EXIT.incompleteVerification;
}
async function compare(args: string[]): Promise<number> {
  const paths: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--format") {
      index += 1;
      continue;
    }
    if (!args[index].startsWith("--")) paths.push(args[index]);
  }
  if (paths.length !== 2)
    throw new Error("compare requires baseline and current receipt paths.");
  const result = await compareReceipts(
    await readJson(paths[0]),
    await readJson(paths[1])
  );
  if (!result.valid) {
    print({ valid: false, errors: result.errors }, outputFormat(args));
    return EXIT.verificationFailure;
  }
  print(result.report, outputFormat(args));
  return EXIT.ok;
}
async function policyCheck(args: string[]): Promise<number> {
  const receiptPath = args.find(argument => !argument.startsWith("--"));
  const policyPath = argumentValue(args, "--policy");
  if (!receiptPath || !policyPath)
    throw new Error(
      "policy check requires a receipt path and --policy policy.json."
    );
  const receipt = await readJson(receiptPath);
  if (!isReceipt(receipt) || !validateReceipt(receipt).valid)
    throw new Error("Policy evaluation requires a valid receipt.");
  const policy = (await readJson(policyPath)) as ReceiptPolicy;
  const findings = evaluatePolicy(receipt, policy);
  print({ schemaVersion: POLICY_SCHEMA_VERSION, findings }, outputFormat(args));
  return findings.some(finding => finding.severity === "error")
    ? EXIT.verificationFailure
    : EXIT.ok;
}
async function main(): Promise<number> {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(usage());
    return EXIT.ok;
  }
  if (args[0] === "capture") return capture(args.slice(1));
  if (args[0] === "inspect") return inspect(args.slice(1));
  if (args[0] === "verify") return verify(args.slice(1));
  if (args[0] === "compare") return compare(args.slice(1));
  if (args[0] === "policy" && args[1] === "check")
    return policyCheck(args.slice(2));
  throw new Error(`Unknown command: ${args.join(" ")}`);
}
main()
  .then(code => (process.exitCode = code))
  .catch(error => {
    console.error(
      `attestkit: ${error instanceof Error ? error.message : "unexpected error"}`
    );
    process.exitCode = EXIT.invalidInput;
  });
