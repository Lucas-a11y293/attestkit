import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  hashArtifact,
  pathWithinRoot,
  safeWorkspaceRoot,
} from "../../packages/cli/src/workspace";

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map(directory => rm(directory, { recursive: true, force: true }))
  );
});

describe("workspace boundaries", () => {
  it("rejects traversal outside the canonical root", async () => {
    const directory = await mkdtemp(join(tmpdir(), "attestkit-path-"));
    directories.push(directory);
    const root = await safeWorkspaceRoot(directory);
    expect(() => pathWithinRoot(root, "../outside.txt")).toThrow(
      "Unsafe path outside workspace root"
    );
  });

  it("hashes a bounded regular artifact but refuses symlinks", async () => {
    const directory = await mkdtemp(join(tmpdir(), "attestkit-artifact-"));
    directories.push(directory);
    await mkdir(join(directory, "reports"));
    await writeFile(join(directory, "reports", "junit.xml"), "<testsuite />");
    await symlink(
      join(directory, "reports", "junit.xml"),
      join(directory, "reports", "linked.xml")
    );
    const root = await safeWorkspaceRoot(directory);
    const artifact = await hashArtifact(root, "reports/junit.xml", 1024);
    expect(artifact.kind).toBe("junit");
    expect(artifact.sha256).toHaveLength(64);
    await expect(
      hashArtifact(root, "reports/linked.xml", 1024)
    ).rejects.toThrow("Refusing symlink artifact");
  });
});
