"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowUpRight, ImageOff } from "lucide-react";

const LISTING_HREF = /^\/rent\/[0-9a-fA-F-]{36}$/;
const SAFE_IMAGE = /^https:\/\/[^\s<>()"'\\]+$/;

function TableImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  return <span className="relative block h-16 w-24 overflow-hidden rounded-md border border-border bg-muted sm:h-20 sm:w-28">
    {failed
      ? <span className="flex h-full flex-col items-center justify-center gap-0.5 text-[10px] text-muted-foreground" role="img" aria-label={alt}>
          <ImageOff className="size-4 opacity-60" aria-hidden="true" />Chưa tải được ảnh
        </span>
      : <Image src={src} alt={alt} fill sizes="112px" unoptimized loading="lazy" referrerPolicy="no-referrer"
          className="object-cover transition-transform duration-200 hover:scale-105" onError={() => setFailed(true)} />}
  </span>;
}

interface AiMarkdownMessageProps {
  content: string;
  className?: string;
}

export default function AiMarkdownMessage({
  content,
  className = "",
}: AiMarkdownMessageProps) {
  return (
    <div
      className={`ai-markdown-content leading-relaxed text-xs sm:text-sm text-foreground break-words ${className}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => (
            <ul className="my-2 ml-4 list-disc space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 ml-4 list-decimal space-y-1">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed pl-0.5">{children}</li>
          ),
          h1: ({ children }) => (
            <h1 className="text-base font-bold text-foreground mt-3 mb-1.5 border-b pb-1">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm font-bold text-foreground mt-2.5 mb-1">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs sm:text-sm font-semibold text-foreground mt-2 mb-1">
              {children}
            </h3>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-primary/50 pl-3 my-2 text-muted-foreground italic bg-muted/20 py-1 rounded-r">
              {children}
            </blockquote>
          ),
          code: ({ className: codeClassName, children, ...props }) => {
            const isInline = !codeClassName;
            if (isInline) {
              return (
                <code
                  className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] sm:text-xs text-primary"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <pre className="overflow-x-auto rounded-lg bg-muted/80 p-3 my-2 text-[11px] sm:text-xs font-mono text-foreground border border-border">
                <code {...props}>{children}</code>
              </pre>
            );
          },
          table: ({ children }) => (
            <div className="max-w-full overflow-x-auto my-3 rounded-xl border border-border shadow-2xs" role="region" aria-label="Bảng thông tin" tabIndex={0}>
              <table className="w-full min-w-0 border-separate border-spacing-0 text-xs [&_tr>*:first-child]:sticky [&_tr>*:first-child]:left-0 [&_tr>*:first-child]:z-10 [&_tr>*:first-child]:w-24 sm:[&_tr>*:first-child]:w-28 [&_tr>*:first-child]:border-r [&_tr>*:first-child]:border-border [&_tbody_tr:hover>td]:bg-muted [&_tbody_tr:last-child>td]:border-b-0">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="bg-muted px-2.5 py-2 sm:px-3 sm:py-2.5 text-left align-bottom font-semibold text-foreground border-b border-border whitespace-nowrap">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="min-w-[7.25rem] sm:min-w-[8rem] bg-card px-2.5 py-2 sm:px-3 align-top border-b border-border/50 text-foreground first:min-w-0 first:font-medium first:text-muted-foreground first:whitespace-nowrap">
              {children}
            </td>
          ),
          img: ({ src, alt }) => (
            typeof src === "string" && SAFE_IMAGE.test(src) ? <TableImage src={src} alt={alt || "Ảnh tin đăng"} /> : null
          ),
          a: ({ href, children, title, node }) => {
            const className = "text-primary underline hover:text-primary/80 transition-colors";
            // Listing answers link to published detail pages inside HomeSpace.
            if (href && LISTING_HREF.test(href)) {
              const wrapsImage = node?.children?.some((child) => child.type === "element" && child.tagName === "img");
              if (wrapsImage) {
                return <Link href={href} target="_blank" rel="noopener noreferrer" prefetch={false} title={title || "Mở tin trong tab mới"}
                  className="inline-block rounded-md focus-visible:outline-2 focus-visible:outline-primary">{children}</Link>;
              }
              return <Link href={href} target="_blank" rel="noopener noreferrer" prefetch={false} title={title || "Mở tin trong tab mới"}
                className="group/listing inline-flex items-center gap-1 rounded-md font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary">
                {children}
                <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover/listing:bg-primary group-hover/listing:text-primary-foreground" aria-hidden="true">
                  <ArrowUpRight className="size-3.5" />
                </span>
                <span className="sr-only">(mở tab mới)</span>
              </Link>;
            }
            return <a href={href} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>;
          },
          hr: () => <hr className="my-3 border-border" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
