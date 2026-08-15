# Contributing to AttestKit

Thank you for improving AttestKit. The project values small, well-explained changes with deterministic behavior, explicit security boundaries, and tests that describe observable outcomes.

## Development flow

Fork the repository, create a focused branch, install with `pnpm install --frozen-lockfile`, and run `pnpm test`, `pnpm run check`, and `pnpm run build` before opening a pull request. Use Conventional Commit-style subjects such as `feat(core): add receipt comparison` or `test(cli): cover symlink refusal`.

| Change type       | Expectations                                                                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Protocol change   | Explain compatibility, update the schema documentation, add deterministic fixture coverage, and version the protocol if compatibility breaks. |
| CLI behavior      | Document command and exit-code changes; never turn user input into a shell string.                                                            |
| Security behavior | Add regression coverage and explain the threat model in the PR description.                                                                   |
| UI change         | Preserve the “Room of Evidence” design language and keyboard/accessibility behavior.                                                          |

## Pull requests

Describe the problem, the chosen approach, any limitations, and the commands you ran. Keep unrelated formatting or dependency churn out of a functional PR. Do not include secrets or real customer/source data in fixtures. The maintainer may request a receipt for a changed verification path, but a receipt is evidence—not a substitute for review.

## Design principles

The core package must remain independent of Node filesystem, process execution, React, GitHub APIs, and network I/O. Verification must not execute captured work. Policy files stay declarative and cannot run code. These constraints are intentionally more important than adding features quickly.

By contributing, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
