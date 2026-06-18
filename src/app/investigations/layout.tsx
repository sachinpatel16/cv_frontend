import { AppShell } from '@/components/layout/AppShell';

export default function InvestigationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
