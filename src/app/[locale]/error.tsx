"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");
  const tc = useTranslations("common");

  useEffect(() => {
    // Never log user content here: only the error identity.
    console.error("Page error", error.digest ?? error.message);
  }, [error]);

  return (
    <Container narrow className="py-20 text-center">
      <h1 className="text-3xl font-bold">{t("errorTitle")}</h1>
      <p className="mx-auto mt-3 max-w-md text-muted">{t("errorText")}</p>
      <Button onClick={reset} className="mt-8">
        {tc("retry")}
      </Button>
    </Container>
  );
}
