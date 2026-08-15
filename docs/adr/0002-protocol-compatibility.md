# ADR-0002: Keep comparison output outside receipt protocol v1

- **Status:** Accepted
- **Date:** 2026-08-16

## Context

The receipt protocol is already published as `attestkit/v1`. Adding comparison metadata inside each receipt would make a pairwise operation part of the capture contract and would complicate independent verifiers.

## Decision

Keep `attestkit/v1` receipts unchanged. Define comparison output as a CLI presentation object with a stable `reportVersion: "attestkit-comparison/v1"`. The report references only normalized facts from the two validated receipts and includes an explicit boundary statement.

## Alternatives considered

Embedding comparison data inside receipts was rejected because it couples independent captures, increases schema surface, and makes a receipt less portable. Introducing a new receipt schema was rejected because the feature does not require new capture facts.

## Consequences

Existing receipts remain compatible. Consumers can ignore comparison reports without changing receipt verification. Future comparison features may add optional report fields while retaining deterministic ordering and explicit versioning.
