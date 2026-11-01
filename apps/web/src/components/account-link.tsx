"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { t, type Lang } from "@/lib/i18n";

/** "Log in" or "My deals", depending on whether a shopper session exists. */
export function AccountLink({ lang = "en" }: { lang?: Lang }) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((u) => setSignedIn(!!u))
      .catch(() => setSignedIn(false));
  }, []);
  if (signedIn === null) return null;
  return (
    <Link href={signedIn ? "/account" : "/login"} className="text-muted hover:text-fg">
      {signedIn ? t(lang, "nav.myDeals") : t(lang, "nav.login")}
    </Link>
  );
}
