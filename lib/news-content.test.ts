import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readPastedNewsImage, sanitizeNewsInlineMarkup } from "./news-content.ts";

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

  it("cleans pasted caption spans while retaining inline emphasis", () => {
    assert.equal(
      sanitizeNewsInlineMarkup(
        "&lt;span style=&quot;font-size: 14px;&quot;&gt;Chú thích: &lt;/span&gt;<i>Tác giả</i>",
      ),
      "Chú thích: <em>Tác giả</em>",
    );
  });
});

describe("pasted news images", () => {
  it("reads the URL and alt text from a standalone escaped CDN image", () => {
    assert.deepEqual(
      readPastedNewsImage(
        "&lt;img src=&quot;https://vcdn1-kinhdoanh.vnecdn.net/news.png?w=1020&amp;amp;h=0&quot; alt=&quot;Ảnh &amp;amp; chú thích&quot;&gt;",
      ),
      { src: "https://vcdn1-kinhdoanh.vnecdn.net/news.png?w=1020&h=0", alt: "Ảnh & chú thích" },
    );
  });

  it("rejects other hosts, insecure URLs, and markup mixed with text", () => {
    assert.equal(readPastedNewsImage("&lt;img src=&quot;https://vnecdn.net.example.org/news.png&quot;&gt;"), null);
    assert.equal(readPastedNewsImage("&lt;img src=&quot;http://vcdn1-kinhdoanh.vnecdn.net/news.png&quot;&gt;"), null);
    assert.equal(readPastedNewsImage("Caption &lt;img src=&quot;https://vcdn1-kinhdoanh.vnecdn.net/news.png&quot;&gt;"), null);
  });
});
