import { Link } from "~/navigation"; 
import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";

type Props = {
  params: { locale: string };
};

export async function generateMetadata({ params: { locale } }: Props) {
  const t = await getTranslations({ locale, namespace: 'terms' });
  return {
    title: t('title'),
  };
}

export default function TermsOfServicePage() {
  const t = useTranslations('terms');

  return (
    <article className="container prose mx-auto p-6 lg:prose-xl bg-slate-100 sm:my-8 rounded-lg shadow-lg">
      <h1>{t('title')}</h1>

      <h2>{t('introTitle')}</h2>
      <p>{t('introText')}</p>

      <h2>{t('personalUseTitle')}</h2>
      <h3>{t('nonCommercialTitle')}</h3>
      <p>{t('nonCommercialText')}</p>
      <ul>
        <li>You may not use the App in any public place.</li>
        <li>You may not charge any fee.</li>
        <li>The App must not be used in any professional setting.</li>
      </ul>

      <h3>{t('privateLocTitle')}</h3>
      <p>{t('privateLocText')}</p>

      <h2>{t('rightsTitle')}</h2>
      <h3>Performing Rights</h3>
      <p>{t('rightsText')}</p>
      <ul>
        <li>You are responsible for ensuring public performance is properly licensed.</li>
        <li>&quot;My Karaoke Party&quot; does not provide any licenses.</li>
      </ul>

      <h2>User Responsibilities</h2>
      <h3>Compliance with Laws</h3>
      <p>You agree to use the App in compliance with all applicable laws.</p>

      <h3>Prohibited Conduct</h3>
      <p>You agree not to:</p>
      <ul>
        <li>Use the App for unlawful purposes.</li>
        <li>Interfere with others&apos; enjoyment.</li>
        <li>Attempt unauthorized access.</li>
      </ul>

      <h2>{t('liabilityTitle')}</h2>
      <h3>No Liability for Unauthorized Use</h3>
      <p>{t('liabilityText')}</p>

      <h3>Disclaimer of Warranties</h3>
      <p>The App is provided &quot;as is&quot; without warranties of any kind.</p>

      <h2>Changes to Terms</h2>
      <h3>Modifications</h3>
      <p>We reserve the right to modify these Terms at any time.</p>

      <h2>{t('contactTitle')}</h2>
      <p>
        {t('contactText')} <a href="mailto:hello@mykaraoke.party">hello@mykaraoke.party</a>.
      </p>

      <p>
        <Link className="link link-secondary" href="/">
          {t('back')}
        </Link>
      </p>
    </article>
  );
}
