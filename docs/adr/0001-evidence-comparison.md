# ADR-0001: Receipt-to-receipt comparison

- **Status:** Accepted
- **Date:** 2026-08-16
- **Decision owner:** AttestKit maintainers

## Context

AttestKit already makes one execution claim inspectable, but reviewers and release/security engineers also need to answer whether two verification runs differ. The comparison must not imply semantic correctness or rerun commands. It must remain useful when artifacts are missing, source context is unavailable, or commands differ.

## Decision

Add a pure core comparison function and a CLI command:

```text
attestkit compare <baseline.json> <current.json> [--format text|json|markdown]
```

The command validates both receipts structurally and verifies both payload digests before comparing them. It reports a deterministic summary containing status change, command change, source change, workspace-state change, artifact additions/removals/changes, warnings, and a `verificationBoundary` statement. It never executes a captured command and never reads arbitrary paths from the compared receipt.

A comparison is an observation of receipt data, not a pass/fail judgment about software correctness. A non-identical receipt may be expected; the tool will expose differences and leave policy or human review to decide their meaning.

## Alternatives considered

1. **Compare raw JSON text.** Rejected because key ordering, formatting, and captured timestamps create noise.
2. **Re-run both commands.** Rejected because replay is outside the safety contract and can execute foreign code.
3. **Compare only payload digests.** Rejected because it hides the actionable evidence needed by reviewers.
4. **Add a remote registry first.** Rejected because it increases privacy, deployment, and maintenance burden before the local workflow is proven.

## Consequences

Positive: a small cross-language-friendly feature strengthens the product thesis, creates a concrete before/after workflow, and preserves local-first privacy. Negative: the report schema becomes a new public surface that requires versioning and compatibility tests. The first version will compare only fields already present in `attestkit/v1` and will not parse JUnit/SARIF internals.

## Acceptance criteria

- Both inputs must be structurally valid and have valid payload digests.
- Output ordering must be deterministic.
- Artifact comparison must distinguish added, removed, and changed paths using path and SHA-256.
- The command must return an integrity/invalid-input failure when either receipt is malformed or tampered.
- Tests must cover identical receipts, status/command/source differences, artifact changes, tampered inputs, and CLI JSON output.
- README and CLI help must document the non-executing boundary.
