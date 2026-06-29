'use client';

import { useState } from 'react';
import { Pencil, MousePointerSquareDashed, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ZoneDefinition, ZoneType } from '@/features/analyses/types';

// ── Props ─────────────────────────────────────────────────────────────────────

interface ZoneEditorProps {
  /** URL of the keyframe image to draw zones on. */
  keyframeUrl?: string;
  /** Pre-existing zones (for editing). */
  zones?: ZoneDefinition[];
  /** Called when zones change. */
  onZonesChange?: (zones: ZoneDefinition[]) => void;
  /** Whether editing is enabled. */
  readOnly?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Stub component for zone drawing on video keyframes.
 * Will be fully implemented when the Entry/Exit backend is ready.
 * Placeholder UI shows the concept with tool icons and an overlay canvas.
 */
export function ZoneEditor({
  keyframeUrl,
  zones = [],
  readOnly = true,
}: ZoneEditorProps) {
  const [selectedTool, setSelectedTool] = useState<ZoneType | null>(null);

  const tools: { id: ZoneType; label: string; icon: React.ElementType }[] = [
    { id: 'line', label: 'Line', icon: Minus },
    { id: 'polygon', label: 'Polygon', icon: MousePointerSquareDashed },
  ];

  return (
    <div className="space-y-3">
      {/* ── Toolbar ── */}
      {!readOnly && (
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium text-[#5A7A9A]">Draw:</p>
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setSelectedTool(tool.id)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                selectedTool === tool.id
                  ? 'border-[#1565C0] bg-[#1565C0]/10 text-[#60A5FA]'
                  : 'border-[#1E3048] text-[#5A7A9A] hover:border-[#1565C0]/30 hover:text-[#E8EDF5]',
              )}
            >
              <tool.icon className="h-3.5 w-3.5" />
              {tool.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Canvas area ── */}
      <div className="relative overflow-hidden rounded-xl border border-[#1E3048] bg-[#0A0F1E]">
        {keyframeUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={keyframeUrl}
            alt="Video keyframe"
            className="w-full object-contain"
          />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center bg-[#1E3048]/20">
            <div className="text-center">
              <MousePointerSquareDashed className="mx-auto h-10 w-10 text-[#5A7A9A]/30" />
              <p className="mt-2 text-xs text-[#5A7A9A]">
                Video keyframe will appear here
              </p>
            </div>
          </div>
        )}

        {/* Zone overlay placeholder */}
        <div className="absolute inset-0">
          {zones.map((zone) => (
            <div
              key={zone.id}
              className="absolute rounded border border-dashed border-[#F59E0B]/50 bg-[#F59E0B]/5"
              style={{
                left: '10%',
                top: '30%',
                width: '30%',
                height: '40%',
              }}
            >
              <span className="absolute -top-5 left-0 rounded bg-[#F59E0B]/80 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                {zone.label}
              </span>
            </div>
          ))}
        </div>

        {/* Coming soon overlay */}
        {readOnly && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#F59E0B]/20 bg-[#F59E0B]/10">
                <Pencil className="h-5 w-5 text-[#F59E0B]" />
              </div>
              <p className="text-sm font-semibold text-[#E8EDF5]">
                Zone Drawing
              </p>
              <p className="mt-1 text-xs text-[#5A7A9A]">
                Draw entry/exit lines and polygons on keyframes.
                <br />
                Available when backend support is ready.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Zone list ── */}
      {zones.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold tracking-wider text-[#5A7A9A] uppercase">
            Defined Zones ({zones.length})
          </p>
          {zones.map((zone) => (
            <div
              key={zone.id}
              className="flex items-center gap-2 rounded-lg border border-[#1E3048] px-3 py-2 text-xs text-[#E8EDF5]"
            >
              <div
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: zone.color ?? '#F59E0B' }}
              />
              <span className="flex-1">{zone.label}</span>
              <span className="text-[#5A7A9A]">
                {zone.type} · {zone.points.length} pts
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
