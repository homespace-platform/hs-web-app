import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Breadcrumb from "@/components/common/Breadcrumb";
import { SITE_URL } from "@/lib/listing-public-server";
import { publicInfoPages, type PublicInfoPath } from "./pages";

const inlineLink = "break-words rounded-sm font-semibold text-primary underline decoration-primary/50 underline-offset-4 hover:decoration-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring";

export function publicInfoMetadata(path: PublicInfoPath): Metadata {
  const { title, intro } = publicInfoPages[path];
  return { title: `${title} | HomeSpace`, description: intro, alternates: { canonical: `${SITE_URL}${path}` } };
}

export default function PublicInfoPage({ path }: { path: PublicInfoPath }) {
  const { title, category, intro, sections, related } = publicInfoPages[path];

  return (
    <main className="flex-1 pt-20">
      <div className="border-b border-border bg-linear-to-br from-primary/8 via-card to-card">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
          <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: title }]} />
          <p className="mt-7 text-xs font-bold tracking-wide text-primary uppercase sm:mt-10">{category}</p>
          <h1 className="mt-2 max-w-3xl font-heading text-3xl leading-tight font-extrabold tracking-tight text-foreground sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">{intro}</p>
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl gap-7 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12 lg:px-8">
        <nav aria-label="Trong trang" className="self-start rounded-2xl border border-border bg-card p-4 lg:sticky lg:top-28">
          <h2 className="text-sm font-bold text-foreground">Trong trang</h2>
          <ul className="mt-2">
            {sections.map(({ id, title }) => (
              <li key={id}>
                <a href={`#${id}`} className="inline-flex min-h-9 items-center rounded-md px-2 py-1.5 text-sm leading-snug text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
                  {title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 rounded-2xl border border-border bg-card px-5 sm:px-8">
          {sections.map(({ id, title, paragraphs, items, link }) => (
            <section
              key={id}
              id={id}
              aria-labelledby={`${id}-title`}
              tabIndex={-1}
              className="scroll-mt-28 border-b border-border py-6 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring sm:py-8"
            >
              <h2 id={`${id}-title`} className="font-heading text-xl font-bold tracking-tight text-foreground">{title}</h2>
              <div className="mt-3 space-y-3 text-base leading-relaxed text-muted-foreground">
                {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {items && <ul className="list-disc space-y-2 pl-5">{items.map((item) => <li key={item}>{item}</li>)}</ul>}
                {link && (
                  <p>
                    {link.href.startsWith("mailto:") ? (
                      <a href={link.href} className={inlineLink}>{link.label}</a>
                    ) : (
                      <Link href={link.href} className={inlineLink}>{link.label}</Link>
                    )}
                  </p>
                )}
              </div>
            </section>
          ))}
          <nav aria-label="Xem thêm" className="flex flex-wrap gap-x-6 gap-y-2 py-4">
            {related.map(({ href, label }) => (
              <Link key={href} href={href} className="inline-flex min-h-11 items-center gap-2 rounded-sm text-sm font-semibold text-primary hover:underline hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
                {label} <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </main>
  );
}
