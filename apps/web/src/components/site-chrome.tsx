"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Pages that are their own full-screen tool keep their own top bar and get no site header or footer:
 * the seller and staff consoles, a shopper's private offer page, the widget redirect, the test payment
 * page and printable invoices.
 */
const OWN_LAYOUT = [/^\/admin(\/|$)/, /^\/seller$/, /^\/seller\/(classic|invoices|connect)(\/|$)/, /^\/w\//, /^\/pay\//, /^\/p\//, /^\/userloggedin(\/|$)/];

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const path = usePathname() ?? "/";
  return OWN_LAYOUT.some((r) => r.test(path)) ? null : <>{children}</>;
}

/** Header links, with the current page marked for screen readers and styled to match. */
export function NavLinks({ links, className, linkClass }: { links: { href: string; label: string }[]; className?: string; linkClass: string }) {
  const path = usePathname() ?? "/";
  return (
    <ul className={className}>
      {links.map((l) => {
        const current = l.href === "/" ? path === "/" : path === l.href || path.startsWith(`${l.href}/`);
        return (
          <li key={l.href}>
            <Link href={l.href} aria-current={current ? "page" : undefined} className={`${linkClass} ${current ? "text-fg" : "text-muted hover:text-fg"}`}>
              {l.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
