import { Suspense } from "react";
import { DealTerminal } from "@/components/deal-terminal";

export default function DealPage({ params }: PageProps<"/deal/[id]">) {
  return (
    <main className="flex flex-1 flex-col px-4 pb-16 pt-8 sm:px-8">
      <Suspense fallback={<p className="text-center text-muted">Loading your deal…</p>}>
        <Terminal params={params} />
      </Suspense>
    </main>
  );
}

async function Terminal({ params }: { params: PageProps<"/deal/[id]">["params"] }) {
  const { id } = await params;
  return <DealTerminal id={id} />;
}
