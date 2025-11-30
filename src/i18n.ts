import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

const locales = ['en', 'pt'];

export default getRequestConfig(async ({ locale }) => {
  // FIX: Validating without casting to 'any'
  if (!locales.includes(locale)) notFound();

  return {
    // FIX: ESLint disable for unsafe assignment from dynamic import
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
