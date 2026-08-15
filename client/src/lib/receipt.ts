/** Room of Evidence design: browser-only receipt inspection shares AttestKit's transparent proof boundary. */
import { verifyReceipt, type Receipt } from "../../../packages/core/src/index";

export type BrowserVerification = {
  valid: boolean;
  expected: string;
  actual: string | null;
  errors: string[];
};

export async function parseAndVerifyReceipt(
  file: File
): Promise<{ receipt: Receipt; verification: BrowserVerification }> {
  const parsed: unknown = JSON.parse(await file.text());
  const verification = await verifyReceipt(parsed);
  if (
    !verification.valid ||
    !parsed ||
    typeof parsed !== "object" ||
    !("payload" in parsed)
  ) {
    throw new Error(
      verification.errors.join(" ") ||
        "This file is not a valid AttestKit receipt."
    );
  }
  return { receipt: parsed as Receipt, verification };
}

export const demoReceipt: Receipt = {
  schemaVersion: "attestkit/v1",
  payload: {
    capturedAt: "2026-08-15T21:45:00.000Z",
    status: "passed",
    command: {
      argv: ["pnpm", "test"],
      exitCode: 0,
      durationMs: 4821,
      stdout: "23 tests passed\n",
      stderr: "",
      stdoutTruncated: false,
      stderrTruncated: false,
    },
    source: {
      head: "9e4a3f1b7c2d",
      branch: "feat/evidence",
      dirty: false,
      changedPaths: ["packages/core/src/receipt.ts"],
    },
    environment: {
      platform: "linux",
      arch: "x64",
      runtime: { node: "v22.13.0" },
      ci: true,
      safeEnvironment: { CI: "true" },
      redactedEnvironmentKeys: [],
    },
    artifacts: [
      {
        kind: "junit",
        path: "reports/junit.xml",
        sha256:
          "665d8d3f5d2c38ca4a1b9570fd5242d56dc312c48e6be7fa9c12504d7d9dbd11",
        sizeBytes: 2318,
      },
    ],
    redaction: {
      profile: "default",
      applied: ["assignment-secret", "aws-access-key", "github-token"],
      counts: {},
    },
    warnings: [],
  },
  integrity: {
    algorithm: "sha256",
    payloadSha256: "demo-fixture-verify-a-real-receipt",
  },
};
