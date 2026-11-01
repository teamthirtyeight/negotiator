import Link from "next/link";
import { t, type Lang } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { SiteChrome } from "./site-chrome";

/** The site-wide footer: every shopper, seller and policy page one tap away. */
export async function SiteFooter() {
  return <SiteFooterView lang={await getLang()} />;
}

export function SiteFooterView({ lang }: { lang: Lang }) {
  const groups: { title: string; links: [string, string][] }[] = [
    {
      title: t(lang, "footer.shop"),
      links: [
        ["/", t(lang, "footer.browse")],
        ["/search", t(lang, "footer.search")],
        ["/rescue", t(lang, "nav.rescue")],
        ["/dashboard", t(lang, "nav.live")],
        ["/account", t(lang, "nav.myDeals")],
      ],
    },
    {
      title: t(lang, "footer.sell"),
      links: [
        ["/sell", t(lang, "footer.sellWith")],
        ["/seller/start", t(lang, "footer.setup")],
        ["/seller", t(lang, "footer.dashboard")],
        ["/pricing", t(lang, "nav.pricing")],
      ],
    },
    {
      title: t(lang, "footer.help"),
      links: [
        ["/grievance", t(lang, "footer.complaint")],
        ["/account", t(lang, "footer.account")],
        ["/legal#terms", t(lang, "footer.terms")],
        ["/legal#privacy", t(lang, "footer.privacy")],
        ["/legal#returns", t(lang, "footer.returns")],
        ["/legal#sellers", t(lang, "footer.sellerTerms")],
      ],
    },
  ];
  return (
    <SiteChrome>
      <footer lang={lang} className="mt-auto border-t border-line bg-panel/40">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 pb-10 pt-12 sm:px-8 md:grid-cols-[1.3fr_repeat(3,1fr)]">
          <div>
            <Link href="/" className="text-xl font-bold tracking-tight">
              GhostCart
            </Link>
            <p className="mt-3 max-w-xs text-sm text-muted">{t(lang, "footer.tagline")}</p>
          </div>
          {groups.map((g) => (
            <nav key={g.title} aria-label={g.title}>
              <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-saffron">{g.title}</h2>
              <ul className="mt-3 grid gap-2 text-sm">
                {g.links.map(([href, label]) => (
                  <li key={href + label}>
                    <Link href={href} className="text-muted hover:text-fg">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="border-t border-line">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap justify-between gap-x-8 gap-y-2 px-4 py-5 text-xs text-muted sm:px-8">
            <p>{t(lang, "footer.payments")}</p>
            <p>© {COPYRIGHT_YEAR} GhostCart</p>
          </div>
        </div>
      </footer>
    </SiteChrome>
  );
}

/** Fixed rather than read from the clock, so the footer can be prerendered (Next 16 cacheComponents). */
const COPYRIGHT_YEAR = 2026;
