'use client';

import { useState } from 'react';
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignupForm } from '@/components/auth/SignupForm';

export default function LoginPage() {
  const [view, setView] = useState<'login' | 'signup'>('login');
  return (
    <AuthSplitLayout>
      {view === 'login' ? (
        <LoginForm onSwitchToSignup={() => setView('signup')} />
      ) : (
        <SignupForm onSwitchToLogin={() => setView('login')} />
      )}
    </AuthSplitLayout>
  );
}
