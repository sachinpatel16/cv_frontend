'use client';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Bell } from 'lucide-react';

const BREADCRUMB_MAP: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/investigations/new': 'New Investigation',
  '/services/object-counting': 'Object Counting',
  '/services/activity-detection': 'Activity Detection',
  '/services/activity-detection/activity': 'Human Activity Detection',
  '/services/person-search': 'Person Search',
  '/services/people-count': 'People Count',
  '/reports': 'Reports',
  '/settings': 'Settings',
};

function getInitials(name?: string | null) {
  if (!name) return 'U';
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function Header() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const label =
    BREADCRUMB_MAP[pathname] ??
    (pathname.startsWith('/investigations/')
      ? 'Investigation Results'
      : 'Vigilens');
  const name = session?.user?.name ?? session?.user?.email ?? 'User';

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#1E3048] bg-[#0D1628] px-5">
      <p className="text-sm font-semibold text-[#E8EDF5]">{label}</p>

      <div className="flex items-center gap-3">
        <button className="relative rounded-md p-1.5 text-[#5A7A9A] transition-colors hover:bg-[#1E3048] hover:text-[#E8EDF5]">
          <Bell className="h-4.5 w-4.5" />
          <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
        </button>

        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1565C0] text-[10px] font-bold text-white">
            {getInitials(name)}
          </div>
          <span className="hidden max-w-[120px] truncate text-sm text-[#E8EDF5] sm:block">
            {name}
          </span>
        </div>
      </div>
    </header>
  );
}
