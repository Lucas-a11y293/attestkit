# AttestKit Project Instructions

## Core invariants

1. A receipt is evidence, not a correctness verdict, security approval, or contributor-trust score.
2. The protocol core stays deterministic and independent of React, command execution, filesystem layout, GitHub APIs, and network I/O.
3. Keys, collections, diagnostics, and paths are sorted before canonical serialization. Any protocol-breaking change increments `schemaVersion`.
4. Capture may run only argv supplied after an explicit delimiter; it must never concatenate a command string into a shell expression.
5. Verification must never execute a captured command, invoke a package manager, follow unsafe symlinks, or upload workspace content.
6. All filesystem reads remain below the canonical workspace root. Explicit allowlists, byte limits, and secret redaction apply before persistence.
7. No token, secret, or environment value may enter fixtures, examples, screenshots, source code, or receipt output. A test must cover every discovered redaction regression.
8. GitHub workflows must use least privilege and must not combine `pull_request_target` with checkout or execution of untrusted fork code.
9. Receipt comparison must validate and integrity-check both inputs, remain non-executing, and report differences without claiming semantic correctness.
10. Comparison output is versioned independently as `attestkit-comparison/v1`; it must not mutate or upgrade the `attestkit/v1` receipt protocol.

## Quality gates

Before a feature is merged, run formatting, TypeScript checking, unit tests, integration tests, the protocol determinism fixture, tamper-detection tests, dependency audit, production build, and a CLI smoke test. Document both supported behavior and explicit boundaries; no feature may rely on a fake success response or placeholder implementation.

## Commit convention

Use small Conventional Commits such as `feat(core): add canonical receipt digest` or `test(cli): cover artifact path escape`. Keep generated action distribution files synchronized with their source when a release workflow consumes them.
