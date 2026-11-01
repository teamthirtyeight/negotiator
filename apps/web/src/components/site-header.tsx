import Link from "next/link";
import { t, type Lang } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { AccountLink } from "./account-link";
import { LanguageSwitch } from "./language-switch";
import { NavLinks, SiteChrome } from "./site-chrome";

/** The site-wide header in the shopper's language (English until the language is known). */
export async function SiteHeader() {
  return <SiteHeaderView lang={await getLang()} />;
}

export function SiteHeaderView({ lang }: { lang: Lang }) {
  const links = [
    { href: "/", label: t(lang, "nav.shop") },
    { href: "/rescue", label: t(lang, "nav.rescue") },
    { href: "/dashboard", label: t(lang, "nav.live") },
    { href: "/pricing", label: t(lang, "nav.pricing") },
    { href: "/sell", label: t(lang, "home.forSellers") },
  ];
  return (
    <SiteChrome>
      <header lang={lang} className="border-b border-line">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-8">
          <Link href="/" className="text-xl font-bold tracking-tight">
            GhostCart
          </Link>
          <nav aria-label={t(lang, "nav.main")} className="hidden flex-1 justify-center md:flex">
            <NavLinks links={links} className="flex items-center gap-6" linkClass="py-1" />
          </nav>
          <div className="flex items-center gap-4 md:gap-5">
            <div className="hidden md:block">
              <LanguageSwitch lang={lang} />
            </div>
            <AccountLink lang={lang} />
            {/* Phones: everything else is one tap away. */}
            <details className="relative md:hidden">
              <summary className="cursor-pointer list-none rounded-lg border border-line px-3 py-1.5 text-sm [&::-webkit-details-marker]:hidden">{t(lang, "nav.menu")}</summary>
              <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-line bg-panel p-3 shadow-lg">
                <nav aria-label={t(lang, "nav.main")}>
                  <NavLinks links={links} className="grid gap-1" linkClass="block rounded-lg px-2 py-2" />
                </nav>
                <div className="mt-2 border-t border-line px-2 pt-3">
                  <LanguageSwitch lang={lang} />
                </div>
              </div>
            </details>
          </div>
        </div>
      </header>
    </SiteChrome>
  );
}
