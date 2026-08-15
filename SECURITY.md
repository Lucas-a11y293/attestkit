# Security policy

## Reporting a vulnerability

Please do not open a public issue for a suspected vulnerability. Use GitHub’s private security advisory reporting for this repository, including the affected version, a minimal reproduction, impact, and any mitigation you have identified. If private reporting is unavailable, contact the repository owner through the GitHub profile and request a private channel.

The maintainer will acknowledge a good-faith report within seven days, provide periodic status updates, and coordinate disclosure after a fix or mitigation is available. Please avoid accessing data that is not yours, disrupting services, or publishing a proof of concept before coordinated disclosure.

## Supported versions

| Version line     | Security support                     |
| ---------------- | ------------------------------------ |
| `0.1.x`          | Supported during active development. |
| Earlier versions | Not supported.                       |

## Security design boundaries

AttestKit is local-first and makes no network request in its core commands. Capture runs an explicit argv array with no shell; verification never replays that command. Artifact paths are constrained below a canonical workspace root, symlinks are refused, byte limits apply, and recognized secret-shaped values are redacted before receipt persistence. These controls reduce risk but do not make command-line secret handling safe by itself.

Receipts are integrity-protected, not signed in the MVP. A SHA-256 digest detects payload modification but does not authenticate the human or system that created the receipt. Signed envelope support is a future feature; users requiring authenticated provenance should employ their existing signing and supply-chain controls alongside AttestKit.
