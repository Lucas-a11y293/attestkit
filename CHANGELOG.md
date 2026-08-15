# Changelog

All notable changes to AttestKit are documented in this file. The project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and uses Semantic Versioning as a release policy.

## [0.1.0] - 2026-08-16

### Added

- A versioned `attestkit/v1` receipt protocol with canonical payload hashing.
- A safe argv-based CLI for `capture`, `inspect`, `verify`, and data-only `policy check`.
- Bounded output capture, recognized secret-shaped value redaction, canonical workspace boundaries, regular-file artifact hashing, and symlink refusal.
- A local static browser inspector that verifies an uploaded receipt manifest without uploading it.
- Protocol, redaction, runner, and filesystem-safety tests; GitHub Actions CI, CodeQL, and Dependabot configuration.
- Open-source documentation, examples, contribution guidance, and a security reporting policy.
