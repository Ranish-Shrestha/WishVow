import Link from "next/link";
import type { ReactNode } from "react";

type Breadcrumb = { href: string; label: string; text?: string };

export function HostPageHeader({
  title,
  back,
  ancestors = [],
  description,
  actions,
  preview = false,
}: {
  title: string;
  back?: Breadcrumb;
  ancestors?: readonly Breadcrumb[];
  description?: ReactNode;
  actions?: ReactNode;
  preview?: boolean;
}) {
  const Title = preview ? "p" : "h1";
  const breadcrumbs = back
    ? [
        ...(back.href === "/dashboard"
          ? []
          : [{ href: "/dashboard", label: "My events" }]),
        ...ancestors,
        back,
      ]
    : [];

  return (
    <header className="space-y-3">
      {breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            {breadcrumbs.map(({ href, label, text }, index) => (
              <li
                key={href}
                className="flex min-w-0 max-w-full items-baseline gap-2"
              >
                {index > 0 && (
                  <span aria-hidden="true" className="text-muted-foreground">
                    /
                  </span>
                )}
                <Link
                  href={href}
                  aria-label={text ? `${label}: ${text}` : undefined}
                  className="font-semibold wrap-anywhere text-primary hover:underline"
                >
                  {text ?? label}
                </Link>
              </li>
            ))}
            <li className="flex min-w-0 max-w-full items-baseline gap-2 text-muted-foreground">
              <span aria-hidden="true">/</span>
              <span aria-current="page" className="wrap-anywhere">
                {preview ? "Preview" : title}
              </span>
            </li>
          </ol>
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-full space-y-2">
          <Title className="font-serif wrap-anywhere text-3xl sm:text-5xl">
            {title}
          </Title>
          {description && (
            <div className="space-y-1 wrap-anywhere text-muted-foreground">
              {description}
            </div>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-3">{actions}</div>
        )}
      </div>
    </header>
  );
}
