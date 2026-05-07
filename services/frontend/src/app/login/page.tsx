'use client';

import { useEffect } from 'react';
import { getTokenFromHash, storeToken } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    const token = getTokenFromHash();
    if (token) {
      storeToken(token);
      router.push('/dashboard');
    } else {
      router.push('/');
    }
  }, [router]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <p>Processing login...</p>
    </div>
  );
}