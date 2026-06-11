import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout';
import { SignupForm } from '@/components/auth/SignupForm';

export default function SignupPage() {
  return (
    <AuthSplitLayout>
      <SignupForm />
    </AuthSplitLayout>
  );
}
