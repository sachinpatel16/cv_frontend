'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  Eye,
  LayoutDashboard,
  FileText,
  Settings,
  LogOut,
  Microscope,
} from 'lucide-react';
import { SERVICES_REGISTRY } from '@/lib/services';
import { cn } from '@/lib/utils';
import { logout } from '@/lib/api/auth';

const topNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

const bottomNav = [
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/settings', label: 'Settings', icon: Settings },
];

function NavItem({
  href,
  label,
  icon: Icon,
  disabled = false,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  disabled?: boolean;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + '/');
  return (
    <Link
      href={disabled ? '#' : href}
      aria-disabled={disabled}
      className={cn(
        'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
        active
          ? 'bg-[#1565C0]/20 font-medium text-[#60A5FA]'
          : 'text-[#5A7A9A] hover:bg-[#1E3048] hover:text-[#E8EDF5]',
        disabled && 'pointer-events-none cursor-default opacity-40',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-auto shrink-0 flex-col border-r border-[#1E3048] bg-[#0A0F1E]">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-[#1E3048] px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#1565C0]">
          <Eye className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-semibold text-[#E8EDF5]">Vigilens</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
        {topNav.map(({ href, label, icon }) => (
          <NavItem key={href} href={href} label={label} icon={icon} />
        ))}

        <p className="mt-4 mb-1 px-3 text-[10px] font-semibold tracking-widest text-[#1E3048] uppercase">
          Investigations
        </p>

        <NavItem
          href="/investigations/new"
          label="New Investigation"
          icon={Microscope}
        />

        <p className="mt-4 mb-1 px-3 text-[10px] font-semibold tracking-widest text-[#1E3048] uppercase">
          Services
        </p>

        {SERVICES_REGISTRY.map((s) => (
          <div key={s.id} className="relative">
            <NavItem
              href={s.href}
              label={s.label}
              icon={s.icon}
              disabled={s.comingSoon}
            />
            {s.comingSoon && (
              <span className="absolute top-1/2 right-3 -translate-y-1/2 rounded bg-[#F59E0B]/10 px-1.5 py-0.5 text-[9px] font-semibold text-[#F59E0B]">
                Soon
              </span>
            )}
          </div>
        ))}

        <div className="mt-4 space-y-0.5 border-t border-[#1E3048] pt-3">
          {bottomNav.map(({ href, label, icon }) => (
            <NavItem key={href} href={href} label={label} icon={icon} />
          ))}
        </div>
      </nav>

      {/* Sign out */}
      <div className="border-t border-[#1E3048] p-3">
        <button
          onClick={async () => {
            try {
              await logout();
            } catch {}
            signOut({ callbackUrl: '/login' });
          }}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-[#5A7A9A] transition-colors hover:bg-[#1E3048] hover:text-[#E8EDF5]"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
