import { spawn } from "node:child_process";
import type { CommandEvidence } from "@attestkit/core";
function appendBounded(
  current: Buffer,
  next: Buffer,
  limit: number
): { value: Buffer; truncated: boolean } {
  if (current.length >= limit) return { value: current, truncated: true };
  const remaining = limit - current.length;
  return next.length <= remaining
    ? { value: Buffer.concat([current, next]), truncated: false }
    : {
        value: Buffer.concat([current, next.subarray(0, remaining)]),
        truncated: true,
      };
}
export async function runArgv(
  argv: string[],
  cwd: string,
  maxBytes: number
): Promise<CommandEvidence> {
  if (argv.length === 0 || argv.some(part => part.length === 0))
    throw new Error(
      "A capture command must contain non-empty argv entries after --."
    );
  return new Promise(resolve => {
    const started = performance.now();
    const child = spawn(argv[0], argv.slice(1), {
      cwd,
      shell: false,
      windowsHide: true,
    });
    let stdout = Buffer.alloc(0);
    let stderr = Buffer.alloc(0);
    let stdoutTruncated = false;
    let stderrTruncated = false;
    child.stdout.on("data", (chunk: Buffer) => {
      const bounded = appendBounded(stdout, Buffer.from(chunk), maxBytes);
      stdout = bounded.value;
      stdoutTruncated ||= bounded.truncated;
    });
    child.stderr.on("data", (chunk: Buffer) => {
      const bounded = appendBounded(stderr, Buffer.from(chunk), maxBytes);
      stderr = bounded.value;
      stderrTruncated ||= bounded.truncated;
    });
    child.once("error", error => {
      stderr = Buffer.concat([
        stderr,
        Buffer.from(`Could not start command: ${error.message}\n`),
      ]).subarray(0, maxBytes);
      stderrTruncated ||= stderr.length >= maxBytes;
    });
    child.once("close", exitCode =>
      resolve({
        argv,
        exitCode,
        durationMs: Math.round(performance.now() - started),
        stdout: stdout.toString("utf8"),
        stderr: stderr.toString("utf8"),
        stdoutTruncated,
        stderrTruncated,
      })
    );
  });
}
