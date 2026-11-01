import { LiveBoard } from "@/components/live-board";

export const metadata = { title: "GhostCart · Live deals" };

export default function DashboardPage() {
  return (
    <main className="flex flex-1 flex-col px-4 pb-16 pt-8 sm:px-8">
      <p className="mx-auto mb-8 flex w-full max-w-6xl items-center justify-end gap-2 text-muted">
        <span className="size-2 animate-pulse rounded-full bg-paid" aria-hidden />
        Live
      </p>
      <LiveBoard />
    </main>
  );
}
