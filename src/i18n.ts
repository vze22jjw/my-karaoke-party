/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */

import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

const locales = ['en', 'pt'];
const defaultLocale = 'en';

export default getRequestConfig(async ({ locale }) => {
  if (!locales.includes(locale as any)) notFound();

  const baseLocale = locales.includes(locale) ? locale : defaultLocale;
  try {
    return {
      messages: (await import(`../messages/${baseLocale}.json`)).default
    };
  } catch (error) {
    notFound();
  }
});
