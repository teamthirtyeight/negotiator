import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { CatalogueGrid } from "@/components/catalogue-grid";
import { Ticker } from "@/components/ticker";
import { t, type Lang } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { liveShops, searchCatalogue } from "@/lib/shop/catalogue";

export default function Home() {
  return (
    <>
      <Suspense fallback={<main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 sm:px-8" />}>
        <HomeBody />
      </Suspense>
      <Ticker />
    </>
  );
}

async function HomeBody() {
  const lang = await getLang();
  return (
    <main lang={lang} className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-16 pt-8 sm:px-8">
      <section className="mt-6 sm:mt-10">
        <h1 className="max-w-3xl text-[clamp(2.4rem,6.5vw,5rem)] font-bold leading-[0.95] tracking-[-0.03em]">{t(lang, "home.tagline")}</h1>
        <p className="mt-6 max-w-xl text-lg text-muted sm:text-xl">{t(lang, "home.intro")}</p>
        <form action="/search" className="mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row">
          <label htmlFor="q" className="sr-only">
            {t(lang, "home.search")}
          </label>
          <input
            id="q"
            name="q"
            type="search"
            placeholder={t(lang, "home.search")}
            className="min-w-0 flex-1 rounded-xl border border-line bg-panel px-4 py-4 text-lg text-fg placeholder:text-muted/60 focus:border-saffron focus:outline-none"
          />
          <button className="rounded-xl bg-saffron px-6 py-4 text-lg font-semibold text-paper-ink">{t(lang, "home.searchButton")}</button>
        </form>
      </section>

      <Suspense fallback={<p className="mt-16 text-muted">{t(lang, "home.loading")}</p>}>
        <OnOffer lang={lang} />
      </Suspense>

      <section aria-label="How it works" className="mt-20 grid grid-cols-1 gap-6 border-t border-line pt-8 sm:grid-cols-3">
        {(
          [
            ["home.how1", "home.how1b"],
            ["home.how2", "home.how2b"],
            ["home.how3", "home.how3b"],
          ] as const
        ).map(([h, b]) => (
          <div key={h}>
            <p className="font-semibold">{t(lang, h)}</p>
            <p className="mt-1 text-muted">{t(lang, b)}</p>
          </div>
        ))}
      </section>
    </main>
  );
}

async function OnOffer({ lang }: { lang: Lang }) {
  await connection();
  const [items, shops] = await Promise.all([searchCatalogue("", 12), liveShops(8)]);
  if (!items.length) return <p className="mt-16 text-muted">{t(lang, "home.empty")}</p>;
  return (
    <>
      <section className="mt-16">
        <h2 className="text-2xl font-semibold">{t(lang, "home.onOffer")}</h2>
        <div className="mt-6">
          <CatalogueGrid items={items} />
        </div>
      </section>
      {shops.length > 0 && (
        <section className="mt-14">
          <h2 className="text-2xl font-semibold">{t(lang, "home.shops")}</h2>
          <ul className="mt-4 flex flex-wrap gap-3">
            {shops.map((s) => (
              <li key={s.slug}>
                <Link href={`/s/${s.slug}`} className="block rounded-full border border-line px-4 py-2 hover:border-saffron">
                  {s.name} <span className="text-muted">· {s.products}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
