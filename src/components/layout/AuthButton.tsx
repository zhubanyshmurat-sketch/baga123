"use client";

import { LogIn, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useSession } from "./SessionProvider";

export function AuthButton() {
  const t = useTranslations("header");
  const { user, ready } = useSession();

  const signedIn = ready && user;
  return (
    <Link
      href={signedIn ? "/me" : "/auth"}
      aria-label={signedIn ? t("account") : t("login")}
      title={signedIn ? t("account") : t("login")}
      className="hidden min-h-11 items-center gap-2 rounded-full border border-border-strong px-3 text-sm font-semibold transition-colors hover:bg-surface-2 sm:inline-flex"
    >
      {signedIn ? (
        <UserRound className="size-4" aria-hidden="true" />
      ) : (
        <LogIn className="size-4" aria-hidden="true" />
      )}
      <span className="hidden 2xl:inline">{signedIn ? t("account") : t("login")}</span>
    </Link>
  );
}
