'use client';

import React from 'react';
import {
  Users,
  Settings2,
  Car,
  Layers,
  Search,
  Sparkles,
  Activity,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ObjectCountMediaDetails } from '@/types/objectcount';

interface TrackerConfigurationProps {
  trackPeople: boolean;
  setTrackPeople: (v: boolean) => void;
  classifyGender: boolean;
  setClassifyGender: (v: boolean) => void;
  trackVehicles: boolean;
  setTrackVehicles: (v: boolean) => void;
  classifyVehicle: boolean;
  setClassifyVehicle: (v: boolean) => void;
  entryExitReport: boolean;
  setEntryExitReport: (v: boolean) => void;
  lineCoords: number[][] | null;
  setLineCoords: (v: number[][] | null) => void;
  setIsDrawingModalOpen: (v: boolean) => void;
  trackCustom?: boolean;
  setTrackCustom?: (v: boolean) => void;
  customSearchQuery?: string;
  setCustomSearchQuery?: (v: string) => void;
  selectedCustomClasses?: string[];
  toggleCustomClass?: (cls: string) => void;
  filteredCocoClasses?: string[];
  // Unused by this sub-component but kept in interface for caller compatibility
  confidenceThreshold?: number;
  setConfidenceThreshold?: (v: number) => void;
  minTrackFrames?: number;
  setMinTrackFrames?: (v: number) => void;
  trackBuffer?: number;
  setTrackBuffer?: (v: number) => void;
  gmcMethod?: string;
  setGmcMethod?: (v: string) => void;
  imgsz?: number;
  setImgsz?: (v: number) => void;
  device?: string | null;
  setDevice?: (v: string | null) => void;
  availableReidClasses?: string[];
  reidClasses?: string[];
  setReidClasses?: (v: string[]) => void;
  details?: ObjectCountMediaDetails;
  triggeringAnalysisId?: string | null;
  handleTriggerAnalysis?: (mediaId: string) => void;
}

export default function TrackerConfiguration({
  trackPeople,
  setTrackPeople,
  classifyGender,
  setClassifyGender,
  trackVehicles,
  setTrackVehicles,
  classifyVehicle,
  setClassifyVehicle,
  entryExitReport,
  setEntryExitReport,
  lineCoords,
  setLineCoords,
  setIsDrawingModalOpen,
  trackCustom,
  setTrackCustom,
  customSearchQuery,
  setCustomSearchQuery,
  selectedCustomClasses,
  toggleCustomClass,
  filteredCocoClasses,
}: TrackerConfigurationProps) {
  return (
    <div className="space-y-6 rounded-xl border border-[#1E3048] bg-[#0D1628] p-5">
      <div className="flex items-center gap-1.5 border-b border-[#1E3048] pb-3">
        <Settings2 className="h-5 w-5 text-[#1565C0]" />
        <div>
          <h3 className="text-sm font-semibold text-[#E8EDF5]">
            AI Tracking Configuration
          </h3>
          <p className="text-[11px] text-[#5A7A9A]">
            Configure tracking parameters and models before firing the
            background task.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Presets Grid */}
        <div className="grid grid-cols-1 gap-4">
          {/* Preset: People */}
          <div
            className={cn(
              'cursor-pointer rounded-lg border p-4 transition-colors',
              trackPeople
                ? 'border-[#1565C0]/50 bg-[#1565C0]/5'
                : 'border-[#1E3048] bg-[#0A0F1E] hover:border-[#1E3048]/80',
            )}
            onClick={() => setTrackPeople(!trackPeople)}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={trackPeople}
                onChange={() => {}} // Managed by parent click
                className="mt-1 h-3.5 w-3.5 rounded border-[#1E3048] text-[#1565C0] focus:ring-[#1565C0]"
              />
              <div className="min-w-0 flex-1">
                <label className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-[#E8EDF5]">
                  <Users className="h-3.5 w-3.5 text-[#1565C0]" />
                  Track People
                </label>
                <p className="mt-1 text-[10px] leading-relaxed text-[#5A7A9A]">
                  Detect and count pedestrians, customers, or occupants
                  (`person` category).
                </p>
              </div>
            </div>

            {trackPeople && (
              <div
                className="mt-3.5 space-y-2 border-t border-[#1E3048] pt-3.5 pl-6"
                onClick={(e) => e.stopPropagation()} // Stop toggle tracking
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="classifyGender"
                    checked={classifyGender}
                    onChange={(e) => setClassifyGender(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-[#1E3048] text-[#1565C0] focus:ring-[#1565C0]"
                  />
                  <label
                    htmlFor="classifyGender"
                    className="flex cursor-pointer items-center gap-1 text-[11px] font-medium text-[#E8EDF5]"
                  >
                    <Sparkles className="h-3 w-3 text-[#60A5FA]" />
                    Gender Classification (InsightFace)
                  </label>
                </div>
                <p className="text-[9px] leading-relaxed text-[#5A7A9A]">
                  Classifies cropped head-crops into Male and Female
                  demographics.
                </p>
              </div>
            )}
          </div>

          {/* Preset: Vehicles */}
          <div
            className={cn(
              'cursor-pointer rounded-lg border p-4 transition-colors',
              trackVehicles
                ? 'border-[#1565C0]/50 bg-[#1565C0]/5'
                : 'border-[#1E3048] bg-[#0A0F1E] hover:border-[#1E3048]/80',
            )}
            onClick={() => setTrackVehicles(!trackVehicles)}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={trackVehicles}
                onChange={() => {}} // Managed by parent click
                className="mt-1 h-3.5 w-3.5 rounded border-[#1E3048] text-[#1565C0] focus:ring-[#1565C0]"
              />
              <div className="min-w-0 flex-1">
                <label className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-[#E8EDF5]">
                  <Car className="h-3.5 w-3.5 text-[#1565C0]" />
                  Track Vehicles
                </label>
                <p className="mt-1 text-[10px] leading-relaxed text-[#5A7A9A]">
                  Detect and count traffic flows (`car`, `truck`, `bus`,
                  `motorcycle`, `bicycle`).
                </p>
              </div>
            </div>

            {trackVehicles && (
              <div
                className="mt-3.5 space-y-2 border-t border-[#1E3048] pt-3.5 pl-6"
                onClick={(e) => e.stopPropagation()} // Stop toggle tracking
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="classifyVehicle"
                    checked={classifyVehicle}
                    onChange={(e) => setClassifyVehicle(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-[#1E3048] text-[#1565C0] focus:ring-[#1565C0]"
                  />
                  <label
                    htmlFor="classifyVehicle"
                    className="cursor-pointer text-[11px] font-medium text-[#E8EDF5]"
                  >
                    Vehicle Subclass Classification
                  </label>
                </div>
                <p className="text-[9px] leading-relaxed text-[#5A7A9A]">
                  Preserves class breakdown (car, truck, bike). If disabled,
                  simplifies all to a generic &quot;vehicle&quot; tracker label.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Entry & Exit Crossing Line Preset */}
        <div
          className={cn(
            'cursor-pointer rounded-lg border p-4 transition-colors',
            entryExitReport
              ? 'border-[#1565C0]/50 bg-[#1565C0]/5'
              : 'border-[#1E3048] bg-[#0A0F1E] hover:border-[#1E3048]/80',
          )}
          onClick={() => {
            const nextVal = !entryExitReport;
            setEntryExitReport(nextVal);
            if (nextVal) {
              setIsDrawingModalOpen(true);
            } else {
              setLineCoords(null);
            }
          }}
        >
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={entryExitReport}
              onChange={() => {}} // Managed by click
              className="mt-1 h-3.5 w-3.5 rounded border-[#1E3048] text-[#1565C0] focus:ring-[#1565C0]"
            />
            <div className="min-w-0 flex-1">
              <label className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-[#E8EDF5]">
                <Activity className="h-3.5 w-3.5 text-[#1565C0]" />
                Entry & Exit Line Crossing Report
              </label>
              <p className="mt-1 text-[10px] leading-relaxed text-[#5A7A9A]">
                Configure a crossing gate line. Detects and logs IN/OUT count
                directions for tracked objects.
              </p>
            </div>
          </div>

          {entryExitReport && (
            <div
              className="mt-3.5 flex items-center justify-between border-t border-[#1E3048]/60 pt-3.5 pl-6"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-[11px] text-[#E8EDF5]">
                {lineCoords
                  ? `Line defined: [(${lineCoords[0][0]}, ${lineCoords[0][1]}), (${lineCoords[1][0]}, ${lineCoords[1][1]})]`
                  : 'No custom line drawn. Defaults to middle horizontal line.'}
              </span>
              <button
                type="button"
                onClick={() => setIsDrawingModalOpen(true)}
                className="rounded bg-[#1E3048] px-2.5 py-1 text-[10px] font-semibold text-[#60A5FA] transition-colors hover:bg-[#1E3048]/80"
              >
                {lineCoords ? 'Redraw Line' : 'Draw Line'}
              </button>
            </div>
          )}
        </div>

        {/* Custom Category Selection Toggle */}
        {setTrackCustom && (
          <div className="overflow-hidden rounded-lg border border-[#1E3048] bg-[#0A0F1E]">
            <div
              className="flex cursor-pointer items-center justify-between border-b border-[#1E3048] px-4 py-3 hover:bg-[#1E3048]/30"
              onClick={() => setTrackCustom(!trackCustom)}
            >
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-[#1565C0]" />
                <span className="text-xs font-semibold text-[#E8EDF5]">
                  Track Custom COCO Categories (
                  {selectedCustomClasses?.length || 0})
                </span>
              </div>
              <span className="rounded bg-[#1E3048] px-2 py-0.5 text-[10px] font-bold text-[#E8EDF5]">
                {trackCustom ? 'Hide List' : 'Expand Classes (74 more)'}
              </span>
            </div>

            {trackCustom &&
              filteredCocoClasses &&
              selectedCustomClasses &&
              toggleCustomClass &&
              setCustomSearchQuery && (
                <div className="space-y-3 p-4">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute top-2.5 left-2.5 h-3.5 w-3.5 text-[#5A7A9A]" />
                      <input
                        type="text"
                        placeholder="Search 74 COCO classes (e.g. dog, backpack, chair)..."
                        value={customSearchQuery || ''}
                        onChange={(e) => setCustomSearchQuery(e.target.value)}
                        className="h-8.5 w-full rounded-md border border-[#1E3048] bg-[#0D1628] pr-3 pl-8.5 text-xs text-[#E8EDF5] placeholder-[#5A7A9A] focus:border-[#1565C0] focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        selectedCustomClasses.forEach((cls) =>
                          toggleCustomClass(cls),
                        );
                      }}
                      className="rounded-md border border-[#1E3048] bg-[#0D1628] px-2.5 py-1 text-[10px] font-medium text-[#5A7A9A] hover:bg-[#1E3048] hover:text-[#E8EDF5]"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="grid max-h-36 grid-cols-1 gap-2 overflow-y-auto rounded-md border border-[#1E3048]/60 bg-[#0D1628]/40 p-2 pr-1 sm:grid-cols-2">
                    {filteredCocoClasses.map((cls) => {
                      const selected = selectedCustomClasses.includes(cls);
                      return (
                        <div
                          key={cls}
                          onClick={() => toggleCustomClass(cls)}
                          className={cn(
                            'flex cursor-pointer items-center gap-2 rounded border px-2 py-1 text-xs transition-colors',
                            selected
                              ? 'border-[#1565C0]/40 bg-[#1565C0]/15 text-[#60A5FA]'
                              : 'border-transparent text-[#5A7A9A] hover:bg-[#1E3048]/40 hover:text-[#E8EDF5]',
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            readOnly
                            className="h-3 w-3 rounded border-[#1E3048] text-[#1565C0]"
                          />
                          <span className="truncate">{cls}</span>
                        </div>
                      );
                    })}
                    {filteredCocoClasses.length === 0 && (
                      <div className="col-span-2 py-4 text-center text-xs text-[#5A7A9A]">
                        No classes matching &quot;{customSearchQuery}&quot;
                      </div>
                    )}
                  </div>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
