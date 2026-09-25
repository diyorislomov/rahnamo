import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('support.survey');
  return {
    title: t('metaTitle'), description: t('metaDescription'),
    openGraph: { title: t('metaTitle'), description: t('metaDescription'), images: [] },
    twitter: { card: 'summary', title: t('metaTitle'), description: t('metaDescription') },
  };
}

export default function SurveyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
