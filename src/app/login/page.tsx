import { Suspense } from 'react';
import SocialAuthCard from '@/components/SocialAuthCard';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAF6EE]" />}>
      <SocialAuthCard mode="login" />
    </Suspense>
  );
}
