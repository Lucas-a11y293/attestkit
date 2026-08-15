import { describe, expect, it } from "vitest";
import {
  mergeRedactionCounts,
  redactText,
} from "../../packages/core/src/index";

describe("redaction", () => {
  it("removes token-shaped values before output is persisted", () => {
    const result = redactText(
      "GITHUB_TOKEN=ghp_abcdefghijklmnopqrstuvwxyz123456\nAWS=AKIAABCDEFGHIJKLMNOP\n"
    );
    expect(result.value).not.toContain("ghp_abcdefghijklmnopqrstuvwxyz123456");
    expect(result.value).not.toContain("AKIAABCDEFGHIJKLMNOP");
    expect(result.counts["github-token"]).toBe(1);
    expect(result.counts["aws-access-key"]).toBe(1);
  });

  it("merges counts deterministically", () => {
    expect(mergeRedactionCounts({ token: 1 }, { aws: 2, token: 3 })).toEqual({
      aws: 2,
      token: 4,
    });
  });
});
