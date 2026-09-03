const NEWS_INLINE_TAGS = new Map([
  ["strong", "strong"],
  ["b", "strong"],
  ["em", "em"],
  ["i", "em"],
  ["u", "u"],
  ["s", "s"],
  ["strike", "s"],
  ["br", "br"],
]);

export function sanitizeNewsInlineMarkup(value: string | null | undefined) {
  value = (value ?? "").replace(/&lt;br\s*\/?&gt;/gi, "<br>");
  const tagPattern = /<\/?[a-z][^>]*>/gi;
  const spanStack: string[][] = [];
  let result = "";
  let cursor = 0;

  for (const match of value.matchAll(tagPattern)) {
    const token = match[0];
    const index = match.index ?? 0;
    result += escapeNewsText(value.slice(cursor, index));
    const tag = token.match(/^<\/?\s*([a-z]+)\b/i)?.[1]?.toLowerCase();

    if (tag === "span") {
      if (token.startsWith("</")) {
        result += closeTags(spanStack.pop() ?? []);
      } else {
        const tags = spanFormatting(token);
        spanStack.push(tags);
        result += openTags(tags);
      }
    } else {
      const normalized = tag ? NEWS_INLINE_TAGS.get(tag) : undefined;
      result += normalized
        ? token.startsWith("</")
          ? `</${normalized}>`
          : `<${normalized}>`
        : escapeNewsHtml(token);
    }
    cursor = index + token.length;
  }

  return result + escapeNewsText(value.slice(cursor));
}

function spanFormatting(token: string) {
  const style = token.match(/\bstyle\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i)?.slice(1).find(Boolean) ?? "";
  const declarations = new Map(
    style.split(";").flatMap((declaration) => {
      const [property, ...parts] = declaration.split(":");
      return property && parts.length ? [[property.trim().toLowerCase(), parts.join(":").trim().toLowerCase()]] : [];
    }),
  );
  const tags: string[] = [];
  if (/^(bold|bolder|[6-9]00)$/.test(declarations.get("font-weight") ?? "")) tags.push("strong");
  if (/^(italic|oblique)$/.test(declarations.get("font-style") ?? "")) tags.push("em");
  if (/underline/.test(declarations.get("text-decoration") ?? "")) tags.push("u");
  if (/line-through/.test(declarations.get("text-decoration") ?? "")) tags.push("s");
  return tags;
}

function openTags(tags: string[]) {
  return tags.map((tag) => `<${tag}>`).join("");
}

function closeTags(tags: string[]) {
  return [...tags].reverse().map((tag) => `</${tag}>`).join("");
}

function escapeNewsHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeNewsText(value: string) {
  return value
    .replace(/&(?!amp;|lt;|gt;|quot;|#\d+;|#x[\da-f]+;)/gi, "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
