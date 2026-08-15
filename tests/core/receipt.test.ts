import { describe, expect, it } from "vitest";
import {
  compareReceipts,
  createReceipt,
  evaluatePolicy,
  verifyReceipt,
  type ReceiptPayload,
} from "../../packages/core/src/index";

function payload(): ReceiptPayload {
  return {
    capturedAt: "2026-08-15T00:00:00.000Z",
    status: "passed",
    command: {
      argv: ["node", "--version"],
      exitCode: 0,
      durationMs: 12,
      stdout: "v22.13.0",
      stderr: "",
      stdoutTruncated: false,
      stderrTruncated: false,
    },
    source: {
      head: "a".repeat(40),
      branch: "main",
      dirty: false,
      changedPaths: ["z.ts", "a.ts", "z.ts"],
    },
    environment: {
      platform: "linux",
      arch: "x64",
      runtime: { node: "v22.13.0" },
      ci: true,
      safeEnvironment: { TZ: "UTC", CI: "true" },
      redactedEnvironmentKeys: [],
    },
    artifacts: [
      {
        kind: "junit",
        path: "reports/junit.xml",
        sha256: "b".repeat(64),
        sizeBytes: 21,
      },
    ],
    redaction: { profile: "default", applied: ["github-token"], counts: {} },
    warnings: [],
  };
}

describe("receipt integrity", () => {
  it("canonicalizes equivalent data and verifies a created receipt", async () => {
    const receipt = await createReceipt(payload());
    const result = await verifyReceipt(receipt);
    expect(result.valid).toBe(true);
    expect(receipt.payload.source.changedPaths).toEqual(["a.ts", "z.ts"]);
    expect(Object.keys(receipt.payload.environment.safeEnvironment)).toEqual([
      "CI",
      "TZ",
    ]);
  });

  it("detects payload tampering without executing any command", async () => {
    const receipt = await createReceipt(payload());
    const tampered = structuredClone(receipt);
    tampered.payload.command.exitCode = 1;
    const result = await verifyReceipt(tampered);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Payload digest does not match the receipt integrity value."
    );
  });
});

describe("policy evaluation", () => {
  it("reports stable evidence findings when receipt requirements are missing", async () => {
    const receipt = await createReceipt({
      ...payload(),
      status: "failed",
      artifacts: [],
    });
    const findings = evaluatePolicy(receipt, {
      schemaVersion: "attestkit-policy/v1",
      rules: [
        { id: "needs-success", require: "command-succeeded" },
        { id: "needs-artifact", require: "has-artifact", severity: "warning" },
      ],
    });
    expect(findings.map(finding => finding.id)).toEqual([
      "needs-artifact",
      "needs-success",
    ]);
    expect(findings[0].severity).toBe("warning");
  });
});

describe("receipt comparison", () => {
  it("reports an identical pair without executing anything", async () => {
    const baseline = await createReceipt(payload());
    const result = await compareReceipts(baseline, structuredClone(baseline));
    expect(result.valid).toBe(true);
    expect(result.report?.identical).toBe(true);
    expect(result.report?.artifacts).toEqual({
      added: [],
      removed: [],
      changed: [],
      unchanged: ["reports/junit.xml"],
    });
  });

  it("summarizes status, source, and artifact changes", async () => {
    const baseline = await createReceipt(payload());
    const current = await createReceipt({
      ...payload(),
      status: "failed",
      command: { ...payload().command, argv: ["pnpm", "test"] },
      source: { ...payload().source, head: "c".repeat(40), dirty: true },
      artifacts: [
        {
          kind: "junit",
          path: "reports/junit.xml",
          sha256: "d".repeat(64),
          sizeBytes: 22,
        },
        {
          kind: "sarif",
          path: "reports/scan.sarif",
          sha256: "e".repeat(64),
          sizeBytes: 30,
        },
      ],
    });
    const result = await compareReceipts(baseline, current);
    expect(result.valid).toBe(true);
    expect(result.report?.status.changed).toBe(true);
    expect(result.report?.command.changed).toBe(true);
    expect(result.report?.source.changed).toBe(true);
    expect(result.report?.artifacts).toEqual({
      added: ["reports/scan.sarif"],
      removed: [],
      changed: ["reports/junit.xml"],
      unchanged: [],
    });
  });

  it("rejects a tampered input before comparing it", async () => {
    const baseline = await createReceipt(payload());
    const tampered = structuredClone(baseline);
    tampered.payload.status = "failed";
    const result = await compareReceipts(tampered, baseline);
    expect(result.valid).toBe(false);
    expect(result.report).toBeNull();
    expect(result.errors.join(" ")).toContain("baseline:");
  });
});
