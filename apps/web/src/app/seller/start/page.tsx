import { SellerOnboarding } from "@/components/seller/onboarding";

export const metadata = { title: "GhostCart · Set up your store" };

export default function SellerStartPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-16 pt-8 sm:px-8">
      <h1 className="mt-4 text-[clamp(2rem,5vw,3rem)] font-bold leading-[1.05] tracking-[-0.02em]">Set up your store</h1>
      <p className="mt-4 max-w-xl text-lg text-muted">About two minutes. You decide how much your agent can take off, and anything bigger comes to you.</p>
      <SellerOnboarding />
    </main>
  );
}
