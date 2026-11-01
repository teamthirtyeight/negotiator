import Link from "next/link";
import { SocialProof } from "@/components/social-proof";

export const metadata = { title: "GhostCart · Sell with GhostCart" };

export default function SellPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-16 pt-8 sm:px-8">
      <h1 className="mt-4 text-[clamp(2rem,5vw,3.25rem)] font-bold leading-[1] tracking-[-0.02em]">
        Shoppers want to haggle. Let your agent do it for you.
      </h1>
      <p className="mt-5 max-w-xl text-lg text-muted">
        Your GhostCart agent bargains with shoppers within the discount you set, per product or category. Anything bigger comes to you to approve,
        by phone or on your dashboard. No website? You get a free shop link.
      </p>
      <div className="mt-5">
        <SocialProof variant="seller" />
      </div>
      <div className="mt-10 flex flex-wrap items-center gap-4">
        <Link href="/seller/start" className="rounded-xl bg-saffron px-6 py-4 text-lg font-semibold text-paper-ink">
          Set up your store
        </Link>
        <Link href="/seller" className="text-muted underline underline-offset-4 hover:text-fg">
          I already have one
        </Link>
        <Link href="/pricing" className="text-muted underline underline-offset-4 hover:text-fg">
          Pricing
        </Link>
      </div>
      <p className="mt-10 text-sm text-muted">
        Approving deals for an Amazon or Flipkart listing from before?{" "}
        <Link href="/seller/classic" className="underline underline-offset-4 hover:text-fg">
          Open the marketplace console
        </Link>
      </p>
    </main>
  );
}
