import { InviteCard } from "@/components/invite-card";
import { MyDeals } from "@/components/my-deals";

export const metadata = { title: "GhostCart · My deals", robots: { index: false } };

export default function AccountPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-16 pt-8 sm:px-8">
      <MyDeals />
      <InviteCard />
    </main>
  );
}
