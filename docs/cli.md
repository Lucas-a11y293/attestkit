# CLI reference

## Commands

| Command        | Purpose                                                             | Does it execute captured work?              |
| -------------- | ------------------------------------------------------------------- | ------------------------------------------- |
| `capture`      | Run an explicit argv command and create a receipt.                  | **Yes**, only the argv supplied after `--`. |
| `inspect`      | Validate structure and render a receipt.                            | No.                                         |
| `verify`       | Recompute the payload digest; optionally hash local artifact paths. | No.                                         |
| `policy check` | Evaluate a data-only policy against a valid receipt.                | No.                                         |

## `capture`

```bash
pnpm cli capture [options] -- <command> [args...]
```

The delimiter is mandatory. Everything after it is passed to Node’s process-spawn API as an argv array with `shell: false`; AttestKit never joins that array into a shell string.

| Option                     |                   Default | Description                                                               |
| -------------------------- | ------------------------: | ------------------------------------------------------------------------- |
| `--out <path>`             | `.attestkit/receipt.json` | Destination written atomically with owner-only mode on supported systems. |
| `--workspace <path>`       |                       `.` | Canonical root for Git facts and artifact paths.                          |
| `--artifact <path>`        |                      none | Explicit regular file to hash. Repeatable. Symlinks are refused.          |
| `--config <path>`          |                      none | JSON configuration below workspace root.                                  |
| `--allow-env <key>`        |                      none | Extra non-secret environment key to record. Repeatable.                   |
| `--max-output-bytes <n>`   |                   `65536` | Bound per captured standard stream; minimum is 1024.                      |
| `--max-artifact-bytes <n>` |                 `2097152` | Per-artifact maximum.                                                     |
| `--max-files <n>`          |                      `20` | Maximum selected artifacts.                                               |

Recognized GitHub token shapes, AWS access keys, and `token`/`secret`/`password`/`api-key` assignments are redacted from command argv and output before a receipt is written. Treat this as defense in depth: do not pass secrets on a command line if a safer mechanism exists.

## `inspect`

```bash
pnpm cli inspect .attestkit/receipt.json --format markdown
```

Formats are `text`, `json`, and `markdown`. Inspection validates the supported protocol version and required integrity framing; it does not claim semantic correctness.

## `verify`

```bash
# Manifest integrity only
pnpm cli verify .attestkit/receipt.json

# Manifest integrity and artifacts relative to this local workspace
pnpm cli verify .attestkit/receipt.json --workspace . --format json
```

Verification does not execute the original command. When `--workspace` is supplied, artifact paths are constrained beneath that canonical root, symlinks are refused, and fresh file digests are compared with the receipt.

## `policy check`

```bash
pnpm cli policy check .attestkit/receipt.json --policy examples/policy.json --format json
```

Policies are plain JSON data. The MVP supports `command-succeeded`, `has-artifact`, and `clean-workspace` requirements. A finding includes a stable identifier, severity, message, and remediation; policy evaluation never executes external code.

## Exit codes

| Code | Meaning                                                                                                     |
| ---: | ----------------------------------------------------------------------------------------------------------- |
|  `0` | Successful command/capture, valid receipt, or passing policy.                                               |
|  `1` | Target command failed, integrity failed, or an error-severity policy finding exists.                        |
|  `2` | Invalid CLI input, invalid configuration, malformed protocol document, unsafe path, or unreadable artifact. |
|  `3` | Manifest is valid but a requested local artifact cannot be independently matched.                           |
