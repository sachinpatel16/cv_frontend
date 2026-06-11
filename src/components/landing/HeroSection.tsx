'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Play, X } from 'lucide-react';

export function HeroSection() {
  const [demo, setDemo] = useState(false);
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0A0F1E] pt-16">
      {/* Background gradient */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#1565C0]/10 via-transparent to-transparent" />
      <div className="pointer-events-none absolute top-1/4 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[#1565C0]/5 blur-3xl" />

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#1565C0]/30 bg-[#1565C0]/10 px-3 py-1 text-xs text-[#60A5FA]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#60A5FA]" />
          YOLO-powered video analytics
        </div>

        <h1 className="mb-6 text-5xl leading-tight font-bold tracking-tight text-[#E8EDF5] md:text-6xl">
          See what your
          <br />
          <span className="text-[#1565C0]">cameras see.</span>
        </h1>

        <p className="mx-auto mb-10 max-w-xl text-lg text-[#5A7A9A]">
          Upload footage. Configure detection. Get instant reports.
        </p>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/signup"
            className="flex items-center gap-2 rounded-md bg-[#1565C0] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1565C0]/90"
          >
            Start for free <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            onClick={() => setDemo(true)}
            className="flex items-center gap-2 rounded-md border border-[#1E3048] px-6 py-3 text-sm font-medium text-[#E8EDF5] transition-colors hover:bg-[#1E3048]"
          >
            <Play className="h-4 w-4 text-[#1565C0]" /> See a demo
          </button>
        </div>
      </div>

      {/* Demo Modal */}
      {demo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl border border-[#1E3048] bg-[#0D1628] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#E8EDF5]">
                Vigilens Demo
              </h2>
              <button
                onClick={() => setDemo(false)}
                className="text-[#5A7A9A] hover:text-[#E8EDF5]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex aspect-video items-center justify-center rounded-lg border border-[#1E3048] bg-[#0A0F1E]">
              <div className="text-center">
                <Play className="mx-auto mb-3 h-12 w-12 text-[#1565C0]" />
                <p className="text-sm text-[#5A7A9A]">Demo video coming soon</p>
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-[#5A7A9A]">
              See object counting, activity detection, and person search in
              action
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
