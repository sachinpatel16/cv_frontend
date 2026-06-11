import Link from 'next/link';
import {
  Eye,
  BarChart2,
  Activity,
  Search,
  Upload,
  Settings,
  FileText,
  ArrowRight,
} from 'lucide-react';

const features = [
  {
    icon: BarChart2,
    title: 'Object Counting',
    description:
      'Count any of 80 COCO classes per frame. Track entries and exits, generate heatmaps, and measure crowd density over time.',
  },
  {
    icon: Activity,
    title: 'Activity Detection',
    description:
      'Automatically flag suspicious events — loitering, perimeter breaches, crowd formations — with timestamped screenshots.',
  },
  {
    icon: Search,
    title: 'Person / Object Search',
    description:
      'Find any person or object across hours of footage using visual similarity matching with adjustable confidence thresholds.',
  },
];

const steps = [
  {
    num: '01',
    icon: Upload,
    title: 'Upload footage',
    desc: 'Drag & drop your MP4, MOV, or AVI files. Up to 4 GB per video.',
  },
  {
    num: '02',
    icon: Settings,
    title: 'Configure analysis',
    desc: 'Choose detection class, sensitivity, triggers, and output format.',
  },
  {
    num: '03',
    icon: FileText,
    title: 'Download report',
    desc: 'Get a structured PDF report with events, counts, and thumbnails.',
  },
];

export function FeatureGrid() {
  return (
    <>
      {/* Features */}
      <section className="bg-[#111827] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-14 text-center">
            <h2 className="mb-4 text-3xl font-bold text-[#E8EDF5]">
              Three powerful services
            </h2>
            <p className="mx-auto max-w-xl text-[#5A7A9A]">
              YOLO-powered analytics for any recorded video footage.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {features.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-6 transition-colors hover:border-[#1565C0]/40"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[#1565C0]/10">
                  <Icon className="h-5 w-5 text-[#1565C0]" />
                </div>
                <h3 className="mb-2 text-base font-semibold text-[#E8EDF5]">
                  {title}
                </h3>
                <p className="text-sm leading-relaxed text-[#5A7A9A]">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-[#0A0F1E] py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-14 text-center">
            <h2 className="mb-4 text-3xl font-bold text-[#E8EDF5]">
              How it works
            </h2>
            <p className="text-[#5A7A9A]">From upload to report in minutes.</p>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {steps.map(({ num, icon: Icon, title, desc }) => (
              <div key={num} className="flex flex-col items-center text-center">
                <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[#1565C0]/20 bg-[#1565C0]/10">
                  <Icon className="h-6 w-6 text-[#1565C0]" />
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#1565C0] text-[10px] font-bold text-white">
                    {num}
                  </span>
                </div>
                <h3 className="mb-2 text-sm font-semibold text-[#E8EDF5]">
                  {title}
                </h3>
                <p className="text-xs leading-relaxed text-[#5A7A9A]">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[#1E3048] bg-[#111827] py-24">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="mb-4 text-3xl font-bold text-[#E8EDF5]">
            Ready to get started?
          </h2>
          <p className="mb-8 text-[#5A7A9A]">
            Upload your first video and see what Vigilens finds.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-md bg-[#1565C0] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1565C0]/90"
          >
            Start for free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1E3048] bg-[#0A0F1E] py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-[#1565C0]">
              <Eye className="h-3 w-3 text-white" />
            </div>
            <span className="text-sm font-semibold text-[#E8EDF5]">
              Vigilens
            </span>
          </div>
          <p className="text-xs text-[#5A7A9A]">
            © 2024 Vigilens. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-xs text-[#5A7A9A] hover:text-[#E8EDF5]">
              Terms
            </a>
            <a href="#" className="text-xs text-[#5A7A9A] hover:text-[#E8EDF5]">
              Privacy
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
