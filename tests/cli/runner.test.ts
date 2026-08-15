import { describe, expect, it } from "vitest";
import { runArgv } from "../../packages/cli/src/runner";

describe("safe argv runner", () => {
  it("runs an explicit argv array and preserves the target exit code", async () => {
    const result = await runArgv(
      [
        process.execPath,
        "-e",
        "process.stdout.write('evidence'); process.exit(3)",
      ],
      process.cwd(),
      1024
    );
    expect(result.exitCode).toBe(3);
    expect(result.stdout).toBe("evidence");
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("bounds noisy output", async () => {
    const result = await runArgv(
      [process.execPath, "-e", "process.stdout.write('x'.repeat(4096))"],
      process.cwd(),
      1024
    );
    expect(result.stdout).toHaveLength(1024);
    expect(result.stdoutTruncated).toBe(true);
  });
});
