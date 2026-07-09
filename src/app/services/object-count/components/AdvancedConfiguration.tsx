'use client';

import React from 'react';
import { Sliders, AlertCircle, Loader2, Play } from 'lucide-react';
import type { ObjectCountMediaDetails } from '@/types/objectcount';

interface AdvancedConfigurationProps {
  confidenceThreshold: number;
  setConfidenceThreshold: (v: number) => void;
  minTrackFrames: number;
  setMinTrackFrames: (v: number) => void;
  trackBuffer: number;
  setTrackBuffer: (v: number) => void;
  gmcMethod: string;
  setGmcMethod: (v: string) => void;
  imgsz: number;
  setImgsz: (v: number) => void;
  device: string | null;
  setDevice: (v: string | null) => void;
  availableReidClasses: string[];
  reidClasses: string[];
  setReidClasses: (v: string[]) => void;
  details: ObjectCountMediaDetails;
  triggeringAnalysisId: string | null;
  handleTriggerAnalysis: (mediaId: string) => void;
  trackPeople: boolean;
  trackVehicles: boolean;
  trackCustom: boolean;
  selectedCustomClasses: string[];
}

export default function AdvancedConfiguration({
  confidenceThreshold,
  setConfidenceThreshold,
  minTrackFrames,
  setMinTrackFrames,
  trackBuffer,
  setTrackBuffer,
  gmcMethod,
  setGmcMethod,
  imgsz,
  setImgsz,
  device,
  setDevice,
  availableReidClasses,
  reidClasses,
  setReidClasses,
  details,
  triggeringAnalysisId,
  handleTriggerAnalysis,
  trackPeople,
  trackVehicles,
  trackCustom,
  selectedCustomClasses,
}: AdvancedConfigurationProps) {
  return (
    <div className="space-y-6 rounded-xl border border-[#1E3048] bg-[#0D1628] p-5">
      <div className="flex items-center gap-1.5 border-b border-[#1E3048] pb-3 text-[#E8EDF5]">
        <Sliders className="h-4 w-4 text-[#1565C0]" />
        <h3 className="text-xs font-semibold tracking-wider uppercase">
          Advanced settings
        </h3>
      </div>

      {/* Confidence Threshold */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-[#5A7A9A]">Detection Confidence</span>
          <span className="font-semibold text-[#E8EDF5]">
            {confidenceThreshold.toFixed(2)}
          </span>
        </div>
        <input
          type="range"
          min="0.10"
          max="1.00"
          step="0.05"
          value={confidenceThreshold}
          onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
          className="w-full accent-[#1565C0]"
        />
        <div className="flex justify-between text-[9px] text-[#5A7A9A]/60">
          <span>0.10 (More matches)</span>
          <span>1.00 (Strictly precise)</span>
        </div>
      </div>

      {/* Min Track Frames */}
      <div className="space-y-1">
        <label className="text-xs text-[#5A7A9A]">
          Min Track Duration (Frames)
        </label>
        <input
          type="number"
          min="1"
          value={minTrackFrames}
          onChange={(e) => setMinTrackFrames(parseInt(e.target.value) || 1)}
          className="w-full rounded-md border border-[#1E3048] bg-[#0A0F1E] px-3 py-1.5 text-xs text-[#E8EDF5] focus:border-[#1565C0] focus:outline-none"
        />
        <p className="text-[10px] text-[#5A7A9A]/60">
          Minimum frames active before track is saved. Helps filter momentary
          false detections.
        </p>
      </div>

      {/* Track Buffer */}
      <div className="space-y-1">
        <label className="text-xs text-[#5A7A9A]">
          Track Memory Buffer (Frames)
        </label>
        <input
          type="number"
          min="1"
          value={trackBuffer}
          onChange={(e) => setTrackBuffer(parseInt(e.target.value) || 1)}
          className="w-full rounded-md border border-[#1E3048] bg-[#0A0F1E] px-3 py-1.5 text-xs text-[#E8EDF5] focus:border-[#1565C0] focus:outline-none"
        />
        <p className="text-[10px] text-[#5A7A9A]/60">
          Buffer frames to remember and stitch a temporarily occluded object
          track.
        </p>
      </div>

      {/* Global Motion Compensation */}
      <div className="space-y-1">
        <label className="text-xs text-[#5A7A9A]">
          Global Motion Compensation (GMC)
        </label>
        <select
          value={gmcMethod}
          onChange={(e) => setGmcMethod(e.target.value)}
          className="w-full rounded-md border border-[#1E3048] bg-[#0A0F1E] px-3 py-1.5 text-xs text-[#E8EDF5] focus:border-[#1565C0] focus:outline-none"
        >
          <option value="none">None (Disabled)</option>
          <option value="ortho">Ortho</option>
          <option value="aff_sift">Aff Sift</option>
          <option value="ecc">ECC</option>
          <option value="sparseOptFlow">Sparse Optical Flow</option>
        </select>
        <p className="text-[10px] text-[#5A7A9A]/60">
          Compensates camera movement (e.g. pan, tilt, zoom) to stabilize object
          tracking.
        </p>
      </div>

      {/* YOLO Image Size */}
      <div className="space-y-1">
        <label className="text-xs text-[#5A7A9A]">
          YOLO Image Size (Resolution)
        </label>
        <input
          type="number"
          min="32"
          step="32"
          value={imgsz}
          onChange={(e) => setImgsz(parseInt(e.target.value) || 480)}
          className="w-full rounded-md border border-[#1E3048] bg-[#0A0F1E] px-3 py-1.5 text-xs text-[#E8EDF5] focus:border-[#1565C0] focus:outline-none"
        />
        <p className="text-[10px] text-[#5A7A9A]/60">
          Higher resolution (e.g. 1920) improves detection of small objects but
          runs slower.
        </p>
      </div>

      {/* Execution Device */}
      <div className="space-y-1">
        <label className="text-xs text-[#5A7A9A]">Execution Device</label>
        <select
          value={device || 'null'}
          onChange={(e) =>
            setDevice(e.target.value === 'null' ? null : e.target.value)
          }
          className="w-full rounded-md border border-[#1E3048] bg-[#0A0F1E] px-3 py-1.5 text-xs text-[#E8EDF5] focus:border-[#1565C0] focus:outline-none"
        >
          <option value="null">Auto-detect</option>
          <option value="cpu">CPU</option>
          <option value="cuda">GPU (CUDA)</option>
        </select>
        <p className="text-[10px] text-[#5A7A9A]/60">
          Inference hardware device (CPU or NVIDIA GPU via CUDA).
        </p>
      </div>

      {/* Re-ID Feature Extraction Classes */}
      <div className="space-y-1.5">
        <label className="text-xs text-[#5A7A9A]">Re-ID Tracking Classes</label>
        <div className="max-h-32 space-y-2 overflow-y-auto rounded-md border border-[#1E3048] bg-[#0A0F1E] p-2.5">
          {availableReidClasses.map((cls) => {
            const isChecked = reidClasses.includes(cls);
            return (
              <label
                key={cls}
                className="flex cursor-pointer items-center gap-2 text-[11px] text-[#E8EDF5]"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {
                    if (isChecked) {
                      setReidClasses(reidClasses.filter((c) => c !== cls));
                    } else {
                      setReidClasses([...reidClasses, cls]);
                    }
                  }}
                  className="h-3.5 w-3.5 rounded border-[#1E3048] text-[#1565C0] focus:ring-[#1565C0]"
                />
                <span className="capitalize">{cls}</span>
              </label>
            );
          })}
          {availableReidClasses.length === 0 && (
            <div className="text-[10px] text-[#5A7A9A] italic">
              No active classes to select
            </div>
          )}
        </div>
        <p className="text-[9px] leading-relaxed text-[#5A7A9A]/60">
          Enables Re-ID feature extraction to link occluded tracks. Re-ID is
          optimized for &apos;person&apos;.
        </p>
      </div>

      <div className="pt-2">
        {details.status === 'failed' && (
          <div className="mb-4 flex items-start gap-2 rounded border border-red-400/15 bg-red-400/5 p-3 text-[11px] text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Previous tracker run failed. You can tweak thresholds and trigger
              a new analysis queue.
            </span>
          </div>
        )}

        <button
          onClick={() => handleTriggerAnalysis(details.id)}
          disabled={
            triggeringAnalysisId !== null ||
            details.status === 'processing' ||
            (!trackPeople &&
              !trackVehicles &&
              (!trackCustom || selectedCustomClasses.length === 0))
          }
          className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#1565C0] text-sm font-semibold text-white transition-colors hover:bg-[#1565C0]/90 disabled:pointer-events-none disabled:opacity-40"
        >
          {triggeringAnalysisId !== null || details.status === 'processing' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {details.status === 'processing'
                ? 'Processing...'
                : 'Triggering...'}
            </>
          ) : (
            <>
              <Play className="h-4 w-4 fill-white" />
              Run Object Tracking
            </>
          )}
        </button>
      </div>
    </div>
  );
}
