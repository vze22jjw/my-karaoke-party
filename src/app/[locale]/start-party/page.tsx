import { getTranslations } from "next-intl/server";
import StartPartyContent from "./start-party-content";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations({ locale, namespace: 'startParty' });
  return {
    title: t('pageTitle')
  };
}

export default function StartPartyPage() {
  return <StartPartyContent />;
}
