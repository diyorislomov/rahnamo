import { Suspense } from 'react';
import SocialAuthCard from '@/components/SocialAuthCard';

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAF6EE]" />}>
      <SocialAuthCard mode="signup" />
    </Suspense>
  );
}
