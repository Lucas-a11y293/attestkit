# AttestKit

> **Don’t ask for trust. Attach the proof.**

AttestKit is a local-first toolkit for producing and checking **execution evidence receipts**. A receipt records an explicit command, bounded output, source context, selected artifacts, redaction metadata, and a canonical SHA-256 payload digest. It is intended to make a software-delivery claim easier to inspect—not to replace code review, test design, or security judgment.

![License](https://img.shields.io/badge/license-MIT-16876A.svg) ![Node](https://img.shields.io/badge/node-%3E%3D22-10233A.svg) ![Protocol](https://img.shields.io/badge/protocol-attestkit%2Fv1-16876A.svg)

## Why AttestKit?

“Tests passed locally” is useful but incomplete. A reviewer still needs to know what command ran, which revision it ran against, whether the workspace was dirty, whether the output was truncated or redacted, and which artifacts can be checked independently. AttestKit makes those boundaries explicit in one portable JSON document.

| AttestKit does                                                            | AttestKit intentionally does not do                                   |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Captures an explicit argv command without a shell.                        | Decide whether a patch is correct, safe, or ready to merge.           |
| Records bounded stdout/stderr, Git context, and selected artifact hashes. | Replay a contributor command during verification.                     |
| Redacts recognized secret-shaped values before receipt persistence.       | Upload source code, collect telemetry, or create a contributor score. |
| Verifies the canonical payload digest and optional local artifacts.       | Replace SLSA provenance, tests, linters, or human review.             |

## Quick start

AttestKit requires **Node.js 22+** and pnpm 10. The project is a pnpm workspace; use the lockfile for reproducible local and CI installs.

```bash
git clone https://github.com/Lucas-a11y293/attestkit.git
cd attestkit
corepack enable
pnpm install --frozen-lockfile

# Capture a verification command and one explicit artifact.
pnpm cli capture \
  --out .attestkit/receipt.json \
  --artifact reports/junit.xml \
  -- pnpm test

# Read and verify the receipt without rerunning the captured command.
pnpm cli inspect .attestkit/receipt.json --format markdown
pnpm cli verify .attestkit/receipt.json --workspace .
```

The capture command returns exit code `1` if its target command fails, but still writes a receipt where possible. This preserves useful failure evidence without converting a failed test into a malformed protocol document.

Compare two validated runs without rerunning either command:

```bash
pnpm cli compare baseline.json current.json --format markdown
```

Comparison verifies both receipt digests first, then reports status, command, source, warning, and artifact additions/removals/changes. It is deliberately an observation of receipt data; it does not inspect source semantics, execute commands, or approve correctness or security.

## Receipt shape

Receipts use the explicit version `attestkit/v1`. The `integrity.payloadSha256` value is computed from recursively key-sorted canonical JSON of `payload`, making the integrity boundary clear and independently checkable.

```json
{
  "schemaVersion": "attestkit/v1",
  "payload": {
    "status": "passed",
    "command": { "argv": ["pnpm", "test"], "exitCode": 0 },
    "source": { "head": "<git-sha>", "dirty": false },
    "artifacts": [{ "path": "reports/junit.xml", "sha256": "<digest>" }]
  },
  "integrity": { "algorithm": "sha256", "payloadSha256": "<digest>" }
}
```

Read the full protocol and architectural boundaries in [ARCHITECTURE.md](ARCHITECTURE.md). For every field and exit code, see [docs/cli.md](docs/cli.md).

## GitHub Actions integration

The repository’s [CI workflow](.github/workflows/ci.yml) runs format checks, types, tests, build, and a production dependency audit with read-only repository permissions. An example workflow can add a receipt to any project:

```yaml
- name: Capture test evidence
  run: pnpm cli capture --out .attestkit/test-receipt.json --artifact reports/junit.xml -- pnpm test

- name: Upload receipt
  uses: actions/upload-artifact@v4
  with:
    name: attestkit-test-receipt
    path: .attestkit/test-receipt.json
```

The verifier never runs the captured command. The comparison command also validates both digests and never replays either command. See [docs/github-actions.md](docs/github-actions.md) for permission boundaries and pull-request guidance.

## Local browser inspector

The included React interface lets a reviewer load a local receipt JSON and verify its manifest digest in the browser. It performs no upload. Run it with:

```bash
pnpm dev
```

## Development

| Command                                       | Purpose                                                 |
| --------------------------------------------- | ------------------------------------------------------- |
| `pnpm dev`                                    | Run the static inspector locally.                       |
| `pnpm cli --help`                             | Show CLI commands.                                      |
| `pnpm cli compare baseline.json current.json` | Compare two receipts without replay.                    |
| `pnpm test`                                   | Run protocol, redaction, path-safety, and runner tests. |
| `pnpm run check`                              | Check the web app and build both workspace packages.    |
| `pnpm run build`                              | Build the production web app and CLI packages.          |
| `pnpm audit --prod --audit-level high`        | Audit production dependencies.                          |

## Roadmap

The MVP focuses on deterministic local receipts. The 0.2 line adds receipt comparison while preserving the non-executing boundary. Future candidates include signed receipt envelopes, SARIF/JUnit adapters, GitLab and Forgejo integrations, policy packs, and an optional self-hosted registry. These are tracked in [ROADMAP.md](ROADMAP.md); none changes the core promise that reviewers keep the final judgment.

## Community and security

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md), follow the [Code of Conduct](CODE_OF_CONDUCT.md), and report vulnerabilities through the private process in [SECURITY.md](SECURITY.md). The project is released under the [MIT License](LICENSE).
