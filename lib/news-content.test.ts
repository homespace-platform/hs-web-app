import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sanitizeNewsInlineMarkup } from "./news-content.ts";

describe("news content sanitizer", () => {
  it("converts editor style spans into semantic formatting", () => {
    assert.equal(
      sanitizeNewsInlineMarkup(
        '<span style="font-weight: bolder; font-style: italic; text-decoration: underline">Nội dung</span><br>Tiếp theo',
      ),
      "<strong><em><u>Nội dung</u></em></strong><br>Tiếp theo",
    );
  });

  it("escapes unsupported markup", () => {
    assert.equal(
      sanitizeNewsInlineMarkup("<script>alert(1)</script>"),
      "&lt;script&gt;alert(1)&lt;/script&gt;",
    );
  });
});
