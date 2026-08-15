# GitHub Actions integration

AttestKit works well as a transparent artifact producer in CI. It should complement, not replace, test reports and human review.

## Recommended workflow

Use a normal `pull_request` workflow for contributions from forks. Give the job only `contents: read` unless it needs a separate, explicitly scoped capability. Generate a receipt after the project’s test command and upload it as a GitHub Actions artifact.

```yaml
name: Evidence receipt
on: [pull_request]
permissions:
  contents: read

jobs:
  test-and-attest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: false
      - uses: pnpm/action-setup@v4
        with:
          version: 10.4.1
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm cli capture --out .attestkit/test-receipt.json --artifact reports/junit.xml -- pnpm test
      - uses: actions/upload-artifact@v4
        with:
          name: attestkit-receipt
          path: .attestkit/test-receipt.json
          if-no-files-found: error
```

## Security boundaries

Never use `pull_request_target` to check out, install, or run code from an untrusted pull request. Do not reconstruct an AttestKit command from a PR title, body, issue comment, or label. Keep commands static in the trusted workflow and upload only the resulting receipt. Verification can then run separately because it does not replay a captured command.

The repository’s own CI and CodeQL workflows model these principles. Their action references should be periodically pinned to full commit SHAs by a maintainer when the project is used in a higher-assurance environment.
