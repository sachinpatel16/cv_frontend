'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, Menu, X } from 'lucide-react';

export function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <nav className="fixed top-0 right-0 left-0 z-50 border-b border-[#1E3048] bg-[#0A0F1E]/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1565C0]">
            <Eye className="h-4 w-4 text-white" />
          </div>
          <span className="text-base font-semibold text-[#E8EDF5]">
            Vigilens
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {['Features', 'How it works', 'Pricing'].map((label) => (
            <a
              key={label}
              href="#"
              className="text-sm text-[#5A7A9A] transition-colors hover:text-[#E8EDF5]"
            >
              {label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-4 md:flex">
          <Link
            href="/login"
            className="text-sm text-[#5A7A9A] transition-colors hover:text-[#E8EDF5]"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-[#1565C0] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1565C0]/90"
          >
            Get started
          </Link>
        </div>

        <button
          className="text-[#5A7A9A] hover:text-[#E8EDF5] md:hidden"
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="space-y-3 border-t border-[#1E3048] bg-[#0A0F1E] px-6 py-4 md:hidden">
          {['Features', 'How it works', 'Pricing'].map((label) => (
            <a
              key={label}
              href="#"
              className="block text-sm text-[#5A7A9A] hover:text-[#E8EDF5]"
            >
              {label}
            </a>
          ))}
          <div className="flex flex-col gap-2 pt-2">
            <Link href="/login" className="text-sm text-[#5A7A9A]">
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-[#1565C0] px-4 py-2 text-center text-sm font-medium text-white"
            >
              Get started
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
