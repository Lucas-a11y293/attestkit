# AttestKit Product Specification

## Vision

AttestKit turns software-delivery claims into compact, inspectable evidence receipts. A receipt records the declared command, its bounded result, the repository revision and workspace state, selected verification artifacts, the capture policy, and integrity hashes. It is designed to answer _what was actually run, against which source state, and what a reviewer can independently verify_ without uploading source code or delegating judgment to an opaque model.

## Problem statement

Contributors routinely write “tests passed” or “verified locally” in pull requests, but the claim is disconnected from the exact command, code revision, output, toolchain facts, and artifacts needed for meaningful review. Existing linters, security scanners, and PR bots produce useful findings, but they do not provide a compact evidence contract that a contributor, reviewer, CI job, and future automation can inspect consistently.

## Target users and jobs

| User                         | Job to be done                                                             | Primary outcome                                                     |
| ---------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Contributor                  | Prove a focused verification step without oversharing the workspace.       | A redacted, integrity-protected JSON receipt.                       |
| Reviewer                     | Decide whether a claim is meaningful before spending time on a large diff. | Visible command, source context, status, and verification boundary. |
| Maintainer                   | Define lightweight, explicit evidence expectations for sensitive paths.    | A checked-in policy and a deterministic CI gate.                    |
| Release or security engineer | Retain provenance for important checks and compare evidence across runs.   | Stable protocol data and independently verifiable hashes.           |

## Core use cases

1. A contributor captures a local test or build with `attestkit capture -- npm test` and attaches the resulting receipt to a pull request.
2. CI captures a sanctioned command, embeds its repository revision and selected JUnit/SARIF artifacts, then uploads the receipt as a GitHub Actions artifact.
3. A reviewer runs `attestkit inspect receipt.json` to read the proof boundary and `attestkit verify receipt.json` to validate manifest and artifact hashes without executing the command.
4. A maintainer uses `attestkit policy check` to ensure a pull request includes the expected receipt type for changed paths.

## User stories

| Story                                                                                                                        | Acceptance condition                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| As a contributor, I want the capture command to preserve argv boundaries so untrusted text never becomes a shell expression. | Commands are spawned without a shell and the receipt preserves the argv array.                                           |
| As a reviewer, I want one concise receipt to distinguish executed evidence from a narrative claim.                           | The receipt displays command, exit status, duration, revision, workspace status, redaction policy, and integrity result. |
| As a maintainer, I want policy failures to explain exactly what is missing.                                                  | Policy output carries a stable rule ID, severity, evidence, and remediation text.                                        |
| As a security engineer, I want verification not to execute foreign code.                                                     | `verify` only parses bounded JSON and hashes explicitly referenced files; replay is outside the MVP.                     |

## MVP scope

The first public release contains a typed TypeScript core, a Node.js CLI, a browser-only receipt inspector, a GitHub Action wrapper, a versioned JSON protocol, configuration and redaction rules, deterministic canonicalization and SHA-256 integrity, fixture-driven tests, documentation, and CI.

The MVP deliberately does **not** upload receipts, execute remote code, claim that a receipt proves semantic correctness, automatically approve pull requests, or collect telemetry. It does not turn a local receipt into a supply-chain build attestation; it communicates verifiable execution evidence, with explicit boundaries.

## Advanced features after MVP

The product can later add signed receipts using Sigstore or local keys, GitLab and Forgejo adapters, policy packs, a CI artifact resolver, comparison between receipts, SARIF/JUnit adapters, repository CODEOWNERS awareness, and an optional self-hosted receipt registry. Any AI explanation must remain optional and may only summarize deterministic receipt data.

## Success measures

The technical success measure for the MVP is not a score. It is the ability to generate the same canonical payload digest from a fixed fixture, detect manifest tampering, distinguish failed command execution from invalid receipt structure, and display the proof boundary in both CLI and browser. The community measure is whether a maintainer can adopt it in under ten minutes with one policy file and one workflow step.

## Explicit non-goals

- Detecting whether code was AI-generated.
- Scoring a contributor’s trustworthiness or auto-closing contributions.
- Replacing tests, code review, SLSA provenance, or security scanners.
- Bundling arbitrary source trees or secrets into a receipt.
- Replaying untrusted commands automatically.
