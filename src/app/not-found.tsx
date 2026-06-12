import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0A0F1E] px-4">
      <div className="text-center">
        <p className="text-8xl font-extrabold tracking-tight text-[#1565C0]">
          404
        </p>
        <h1 className="mt-4 text-2xl font-bold text-[#E8EDF5]">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-[#5A7A9A]">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-md bg-[#1565C0] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1565C0]/90"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/"
            className="rounded-md border border-[#1E3048] px-5 py-2.5 text-sm font-medium text-[#5A7A9A] transition-colors hover:bg-[#1E3048] hover:text-[#E8EDF5]"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
