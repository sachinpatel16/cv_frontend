import { Eye, Shield, Cpu, Zap } from 'lucide-react';

function AnimatedFeed() {
  const feeds = [
    {
      label: 'CAM 01',
      boxes: [
        { top: '20%', left: '15%', w: '40%', h: '45%', tag: 'person 94%' },
        { top: '55%', left: '55%', w: '30%', h: '30%', tag: 'car 88%' },
      ],
    },
    {
      label: 'CAM 02',
      boxes: [
        { top: '30%', left: '25%', w: '35%', h: '40%', tag: 'person 91%' },
      ],
    },
    {
      label: 'CAM 03',
      boxes: [
        { top: '25%', left: '10%', w: '45%', h: '50%', tag: 'truck 85%' },
        { top: '60%', left: '50%', w: '25%', h: '25%', tag: 'person 79%' },
      ],
    },
    {
      label: 'CAM 04',
      boxes: [
        { top: '35%', left: '30%', w: '38%', h: '42%', tag: 'bicycle 82%' },
      ],
    },
  ];

  return (
    <div className="mx-auto w-full max-w-sm space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {feeds.map((feed) => (
          <div
            key={feed.label}
            className="relative aspect-video overflow-hidden rounded-md border border-[#1E3048] bg-[#0D1628]"
          >
            <span className="absolute top-1 left-1 z-10 rounded bg-[#0A0F1E]/80 px-1 font-mono text-[9px] text-[#5A7A9A]">
              {feed.label}
            </span>
            {feed.boxes.map((box, i) => (
              <div
                key={i}
                className="animate-pulse-border absolute rounded-sm border border-[#1565C0]"
                style={{
                  top: box.top,
                  left: box.left,
                  width: box.w,
                  height: box.h,
                }}
              >
                <span className="absolute -top-4 left-0 rounded bg-[#1565C0]/80 px-1 text-[8px] whitespace-nowrap text-[#60A5FA]">
                  {box.tag}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between rounded-md border border-[#1E3048] bg-[#0D1628] px-3 py-2 text-[10px] text-[#5A7A9A]">
        <span>
          <span className="font-medium text-[#E8EDF5]">142</span> objects today
        </span>
        <span className="text-[#1E3048]">·</span>
        <span>
          <span className="font-medium text-[#F59E0B]">4</span> events flagged
        </span>
        <span className="text-[#1E3048]">·</span>
        <span>
          <span className="font-medium text-[#E8EDF5]">61h</span> processed
        </span>
      </div>
    </div>
  );
}

const badges = [
  { icon: Shield, label: 'Secure' },
  { icon: Cpu, label: 'On-premise option' },
  { icon: Zap, label: 'Real-time ready' },
];

export function AuthSplitLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden w-[52%] flex-col border-r border-[#1E3048] bg-[#0A0F1E] p-10 lg:flex">
        <div className="mb-auto flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1565C0]">
            <Eye className="h-4 w-4 text-white" />
          </div>
          <span className="text-base font-semibold text-[#E8EDF5]">
            Vigilens
          </span>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center py-12">
          <h2 className="mb-8 text-center text-3xl leading-tight font-bold text-[#E8EDF5]">
            See what your
            <br />
            cameras see.
          </h2>
          <AnimatedFeed />
        </div>

        <div className="mt-auto flex justify-center gap-6 pt-8">
          {badges.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-1.5 text-xs text-[#5A7A9A]"
            >
              <Icon className="h-3.5 w-3.5 text-[#1565C0]" />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center bg-white p-6">
        <div className="w-full max-w-[380px]">{children}</div>
      </div>
    </div>
  );
}
