import { describe, expect, it } from "vitest";
import {
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
