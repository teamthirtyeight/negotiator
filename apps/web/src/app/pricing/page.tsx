import { orderMoney, TIER_LIMITS } from "@ghostcart/core";
import Link from "next/link";
import { inr } from "@/lib/format";

export const metadata = {
  title: "Pricing · GhostCart",
  description: "No sign-up or monthly fee. GhostCart takes a small fee on each sale your agent wins, plus GST.",
};

const feeBps = () => Number(process.env.PLATFORM_FEE_BPS ?? 200);
const pct = (bps: number) => `${(bps / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}%`;

export default function PricingPage() {
  const bps = feeBps();
  const example = orderMoney({ priceInr: 1000, lockFeeInr: 0, feeBps: bps });
  const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: paise % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-16 pt-8 sm:px-8">
      <h1 className="mt-4 text-[clamp(2rem,5vw,3.25rem)] font-bold leading-[1] tracking-[-0.02em]">You pay only when your agent makes a sale.</h1>
      <p className="mt-5 max-w-xl text-lg text-muted">
        No sign-up fee, no monthly fee. GhostCart takes {pct(bps)} of each sale won through a haggle, plus 18% GST on that fee. Haggles that don&apos;t end in a sale cost
        you nothing.
      </p>

      <section className="mt-10 rounded-2xl border border-line p-5">
        <h2 className="font-semibold">On a {inr(1000)} sale</h2>
        <dl className="mt-3 grid max-w-sm grid-cols-[1fr_auto] gap-x-6 gap-y-1">
          <dt className="text-muted">Shopper pays</dt>
          <dd className="text-right tabular-nums">{rupees(example.total)}</dd>
          <dt className="text-muted">GhostCart fee ({pct(bps)})</dt>
          <dd className="text-right tabular-nums">− {rupees(example.fee)}</dd>
          <dt className="text-muted">GST on the fee (18%)</dt>
          <dd className="text-right tabular-nums">− {rupees(example.gst)}</dd>
          <dt className="font-semibold">You get</dt>
          <dd className="text-right font-semibold tabular-nums">{rupees(example.sellerShare)}</dd>
        </dl>
        <p className="mt-3 text-sm text-muted">The discount your agent gives comes from your own limits, which you set per product or category. GhostCart never discounts on your behalf.</p>
      </section>

      <section className="mt-8 grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="font-semibold">How you&apos;re charged</h2>
          <ul className="mt-2 grid gap-2 text-muted">
            <li>GhostCart Shop and widget orders: the fee comes out of the payment before your payout.</li>
            <li>Shopify: through Shopify Billing, which you approve once in your Shopify admin.</li>
            <li>WooCommerce and other checkouts: on a monthly GST invoice.</li>
            <li>Orders refunded through GhostCart: the fee is refunded with them.</li>
          </ul>
        </div>
        <div>
          <h2 className="font-semibold">When you&apos;re paid</h2>
          <p className="mt-2 text-muted">For orders paid on GhostCart, your money is held by our payment partner until the buyer has the item, then paid out after a short window for problems:</p>
          <ul className="mt-2 grid gap-1 text-muted">
            <li>New sellers: {TIER_LIMITS.new.payoutHoldDays} days after delivery</li>
            <li>Verified: {TIER_LIMITS.verified.payoutHoldDays} days</li>
            <li>Trusted: {TIER_LIMITS.trusted.payoutHoldDays} day</li>
          </ul>
          <p className="mt-2 text-sm text-muted">If your return window is longer, the payout waits until it closes, so a return can be refunded.</p>
          <p className="mt-2 text-sm text-muted">Orders paid on your own Shopify or WooCommerce checkout are paid to you by that checkout as usual.</p>
        </div>
      </section>

      <div className="mt-12 flex flex-wrap items-center gap-4">
        <Link href="/seller/start" className="rounded-xl bg-saffron px-6 py-4 text-lg font-semibold text-paper-ink">
          Set up your store
        </Link>
        <Link href="/legal" className="text-muted underline underline-offset-4 hover:text-fg">
          Terms and policies
        </Link>
      </div>
    </main>
  );
}
