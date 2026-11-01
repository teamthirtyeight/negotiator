import Link from "next/link";
import { BuyerLogin } from "@/components/buyer-login";

export const metadata = { title: "GhostCart · Log in" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-16 pt-8">
      <h1 className="mt-4 text-3xl font-bold tracking-tight">Welcome back</h1>
      <p className="mt-2 text-muted">No passwords. We call your number and read out a one-time code.</p>
      <div className="mt-8">
        <BuyerLogin />
      </div>
      <p className="mt-8 text-muted">
        New here?{" "}
        <Link href="/" className="text-fg underline underline-offset-4">
          Paste a product link to start
        </Link>
      </p>
    </main>
  );
}
