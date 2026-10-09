"use client";

import React from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
            <div className="overflow-x-auto my-3">
              <table className="min-w-full divide-y divide-border border border-border text-xs rounded-lg overflow-hidden">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="bg-muted px-3 py-2 text-left font-semibold text-foreground border-b border-border">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 border-b border-border/50 text-foreground">
              {children}
            </td>
          ),
          a: ({ href, children }) => {
            const className = "text-primary underline hover:text-primary/80 transition-colors";
            // Listing answers link to published detail pages inside HomeSpace.
            if (href && /^\/rent\/[0-9a-fA-F-]{36}$/.test(href)) {
              return <Link href={href} className={className}>{children}</Link>;
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
