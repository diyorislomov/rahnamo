import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { defaultLocale, isValidLocale, localeCookieName, type Locale } from './config';

// No locale-prefixed routing on purpose -- switching language must never
// change a URL, since real bookings in the database and every shared link
// reference today's exact paths. The only signal is this cookie -- EXCEPT
// when an explicit locale is passed to a server-side call like
// getTranslations({locale}), e.g. from the email route: that locale was
// captured from the student's own browser at booking time and stored on
// the row, and must win over whatever cookie happens to be on the request
// that later triggers the email (often the ADMIN's session, confirming
// payment from their own browser, not the student's).
export default getRequestConfig(async (params) => {
  let locale: Locale;
  if (isValidLocale(params.locale)) {
    locale = params.locale;
  } else {
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get(localeCookieName)?.value;
    locale = isValidLocale(cookieLocale) ? cookieLocale : defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
