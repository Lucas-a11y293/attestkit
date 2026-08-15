import { createHash } from "node:crypto";
import { lstat, readFile, readdir, realpath, stat } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ArtifactEvidence, SourceContext } from "@attestkit/core";
const execFileAsync = promisify(execFile);
export async function safeWorkspaceRoot(candidate: string): Promise<string> {
  const workspace = await realpath(resolve(candidate));
  const info = await stat(workspace);
  if (!info.isDirectory())
    throw new Error("Workspace root must be a directory.");
  return workspace;
}
export function pathWithinRoot(root: string, candidate: string): string {
  const absolute = resolve(root, candidate);
  const path = relative(root, absolute);
  if (
    path === "" ||
    path.startsWith(`..${sep}`) ||
    path === ".." ||
    path.includes(`${sep}..${sep}`)
  )
    throw new Error(`Unsafe path outside workspace root: ${candidate}`);
  return absolute;
}
async function git(root: string, args: string[]): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("git", args, {
      cwd: root,
      maxBuffer: 256 * 1024,
    });
    return stdout.trim();
  } catch {
    return null;
  }
}
export async function readSourceContext(root: string): Promise<SourceContext> {
  const [head, branch, status] = await Promise.all([
    git(root, ["rev-parse", "HEAD"]),
    git(root, ["branch", "--show-current"]),
    git(root, ["status", "--porcelain=v1"]),
  ]);
  const changedPaths = status
    ? status
        .split("\n")
        .filter(Boolean)
        .map(line => line.slice(3).split(" -> ").at(-1) ?? "")
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right))
    : [];
  return {
    head,
    branch,
    dirty: status === null ? null : status.length > 0,
    changedPaths,
  };
}
export async function hashArtifact(
  root: string,
  candidate: string,
  maxBytes: number
): Promise<ArtifactEvidence> {
  const absolute = pathWithinRoot(root, candidate);
  const fileInfo = await lstat(absolute);
  if (fileInfo.isSymbolicLink())
    throw new Error(`Refusing symlink artifact: ${candidate}`);
  if (!fileInfo.isFile())
    throw new Error(`Artifact is not a regular file: ${candidate}`);
  if (fileInfo.size > maxBytes)
    throw new Error(`Artifact exceeds configured maximum bytes: ${candidate}`);
  const digest = createHash("sha256")
    .update(await readFile(absolute))
    .digest("hex");
  const relativePath = relative(root, absolute).split(sep).join("/");
  return {
    kind: relativePath.endsWith(".sarif")
      ? "sarif"
      : relativePath.endsWith(".xml")
        ? "junit"
        : "file",
    path: relativePath,
    sha256: digest,
    sizeBytes: fileInfo.size,
  };
}
function globExpression(pattern: string): RegExp {
  const escaped = pattern
    .split("")
    .map(character =>
      /[.+^${}()|[\]\\]/.test(character) ? `\\${character}` : character
    )
    .join("")
    .replace(/\*\*/g, "§§")
    .replace(/\*/g, "[^/]*")
    .replace(/§§/g, ".*");
  return new RegExp(`^${escaped}$`);
}
async function listFiles(
  root: string,
  directory: string,
  maxFiles: number,
  collected: string[]
): Promise<void> {
  if (collected.length > maxFiles)
    throw new Error(`Artifact discovery exceeded ${maxFiles} files.`);
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if ([".git", "node_modules", "dist", "coverage"].includes(entry.name))
      continue;
    const fullPath = join(directory, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory())
      await listFiles(root, fullPath, maxFiles, collected);
    if (entry.isFile())
      collected.push(relative(root, fullPath).split(sep).join("/"));
  }
}
export async function findConfiguredArtifacts(
  root: string,
  patterns: string[],
  maxFiles: number
): Promise<string[]> {
  if (patterns.length === 0) return [];
  const all: string[] = [];
  await listFiles(root, root, maxFiles, all);
  const expressions = patterns.map(globExpression);
  return all
    .filter(path => expressions.some(expression => expression.test(path)))
    .sort((left, right) => left.localeCompare(right));
}
