import JoinScene from "./join-scene";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations({ locale, namespace: 'join' });
  return {
    title: t('title')
  };
}

export default function JoinPage() {
  return <JoinScene />;
}
