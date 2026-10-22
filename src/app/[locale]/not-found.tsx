import { useTranslations } from "next-intl";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

export default function NotFound() {
  const t = useTranslations("errors");
  return (
    <Container narrow className="py-20 text-center">
      <p className="text-6xl font-bold text-primary-strong" aria-hidden="true">
        404
      </p>
      <h1 className="mt-4 text-3xl font-bold">{t("notFoundTitle")}</h1>
      <p className="mx-auto mt-3 max-w-md text-muted">{t("notFoundText")}</p>
      <ButtonLink href="/" className="mt-8">
        {t("home")}
      </ButtonLink>
    </Container>
  );
}
