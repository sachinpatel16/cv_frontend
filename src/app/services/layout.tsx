import { AppShell } from '@/components/layout/AppShell';

export default function ServicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
