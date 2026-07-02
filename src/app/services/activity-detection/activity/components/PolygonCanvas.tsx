'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, Undo2, Trash2, CheckCircle2, Info } from 'lucide-react';
import toast from 'react-hot-toast';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

interface Props {
  /** Uploaded File object (before server save) */
  localFile: File | null;
  /** Backend-saved path for already-uploaded media */
  savedPath: string | null;
  mediaType: 'photo' | 'video';
  /** Called with scaled polygon coords in actual media resolution */
  onConfirm: (points: [number, number][]) => void;
  onClear: () => void;
  /** When false, collapses canvas and shows info note instead */
  required: boolean;
  label?: string; // e.g. "Required for Trespassing"
}

export function PolygonCanvas({
  localFile,
  savedPath,
  mediaType,
  onConfirm,
  onClear,
  required,
  label,
}: Props) {
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaResolution, setMediaResolution] = useState({
    width: 1280,
    height: 720,
  });
  const [loaded, setLoaded] = useState(false);
  const [canvasSize, setCanvasSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  // Polygon state — each point in canvas (display) coords
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const [closed, setClosed] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ── Media URL ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (localFile) {
      const url = URL.createObjectURL(localFile);
      const timer = setTimeout(() => setMediaUrl(url), 0);
      return () => {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
      };
    } else if (savedPath) {
      const timer = setTimeout(
        () => setMediaUrl(`${BACKEND_URL}/${savedPath}`),
        0,
      );
      return () => clearTimeout(timer);
    }
  }, [localFile, savedPath]);

  // ── Canvas sync ────────────────────────────────────────────────────────────
  const syncCanvasSize = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const media = container.querySelector('video, img') as HTMLElement | null;
    const canvas = canvasRef.current;
    if (!media || !canvas) return;
    canvas.width = media.clientWidth;
    canvas.height = media.clientHeight;
    setCanvasSize({ width: media.clientWidth, height: media.clientHeight });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    window.addEventListener('resize', syncCanvasSize);
    const t = setTimeout(syncCanvasSize, 100);
    return () => {
      window.removeEventListener('resize', syncCanvasSize);
      clearTimeout(t);
    };
  }, [loaded, syncCanvasSize]);

  // ── Draw ───────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (points.length === 0) return;

    // Polygon fill (3+ points)
    if (points.length >= 3) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      points.forEach((p) => ctx.lineTo(p.x, p.y));
      if (closed) ctx.closePath();
      ctx.fillStyle = 'rgba(245, 158, 11, 0.18)';
      ctx.fill();
    }

    // Edges
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach((p) => ctx.lineTo(p.x, p.y));
    if (closed) ctx.closePath();
    ctx.strokeStyle = closed ? '#F59E0B' : '#60A5FA';
    ctx.lineWidth = 2;
    ctx.setLineDash(closed ? [] : [6, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Vertices
    points.forEach((p, i) => {
      // Outer ring
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, 2 * Math.PI);
      ctx.fillStyle = i === 0 ? '#F59E0B' : '#60A5FA';
      ctx.fill();
      // Inner white dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, 2 * Math.PI);
      ctx.fillStyle = '#fff';
      ctx.fill();
      // Number label
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(String(i + 1), p.x, p.y - 12);
    });

    // Closing hint line from last → first when open
    if (!closed && points.length >= 3) {
      ctx.beginPath();
      ctx.moveTo(points[points.length - 1].x, points[points.length - 1].y);
      ctx.lineTo(points[0].x, points[0].y);
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [points, closed]);

  useEffect(() => {
    draw();
  }, [draw]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (closed || confirmed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Snap-to-close: if clicking near first point and 3+ points exist
    if (points.length >= 3) {
      const dx = x - points[0].x;
      const dy = y - points[0].y;
      if (Math.sqrt(dx * dx + dy * dy) < 16) {
        setClosed(true);
        return;
      }
    }
    setPoints((prev) => [...prev, { x, y }]);
  };

  const handleUndo = () => {
    if (closed) {
      setClosed(false);
      return;
    }
    setPoints((prev) => prev.slice(0, -1));
    setConfirmed(false);
  };

  const handleClear = () => {
    setPoints([]);
    setClosed(false);
    setConfirmed(false);
    onClear();
  };

  const handleClose = () => {
    if (points.length < 3) {
      toast.error('Draw at least 3 points to close a polygon');
      return;
    }
    setClosed(true);
  };

  const handleConfirm = () => {
    if (!closed || points.length < 3 || !canvasRef.current) {
      toast.error(
        'Close the polygon first (click first point or press "Close")',
      );
      return;
    }
    const canvas = canvasRef.current;
    const scaleX = mediaResolution.width / canvas.width;
    const scaleY = mediaResolution.height / canvas.height;
    const scaled: [number, number][] = points.map((p) => [
      Math.round(p.x * scaleX),
      Math.round(p.y * scaleY),
    ]);
    setConfirmed(true);
    onConfirm(scaled);
    toast.success(`Polygon confirmed — ${scaled.length} vertices`);
  };

  const handleMediaLoad = (
    e: React.SyntheticEvent<HTMLVideoElement | HTMLImageElement>,
  ) => {
    if (e.currentTarget instanceof HTMLVideoElement) {
      setMediaResolution({
        width: e.currentTarget.videoWidth || 1280,
        height: e.currentTarget.videoHeight || 720,
      });
    } else if (e.currentTarget instanceof HTMLImageElement) {
      setMediaResolution({
        width: e.currentTarget.naturalWidth || 1280,
        height: e.currentTarget.naturalHeight || 720,
      });
    }
    setLoaded(true);
    setTimeout(syncCanvasSize, 50);
  };

  // ── Collapsed state ────────────────────────────────────────────────────────
  if (!required) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-[#1E3048] bg-[#0D1628] px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
        <p className="text-xs text-[#5A7A9A]">
          <span className="font-medium text-[#E8EDF5]">
            Full frame detection
          </span>{' '}
          — no ROI zone required for this detector. All persons visible to the
          camera will be analyzed.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Instructions */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-[#E8EDF5]">
            Draw Region of Interest (ROI)
            {label && (
              <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                {label}
              </span>
            )}
          </p>
          <p className="mt-0.5 text-[10px] text-[#5A7A9A]">
            Click to add vertices · Click the{' '}
            <span className="font-semibold text-amber-400">first point</span> or
            press{' '}
            <kbd className="rounded border border-[#1E3048] bg-[#0A0F1E] px-1 py-0.5 font-mono text-[9px]">
              Close
            </kbd>{' '}
            to seal the polygon
          </p>
        </div>
        {!loaded && (
          <span className="flex items-center gap-1 text-[10px] text-[#5A7A9A]">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading…
          </span>
        )}
      </div>

      {/* Canvas area */}
      <div
        ref={containerRef}
        className="relative mx-auto flex aspect-video max-h-[360px] w-full max-w-[640px] items-center justify-center overflow-hidden rounded-xl border border-[#1E3048]/60 bg-black/60"
      >
        {mediaUrl && mediaType === 'video' && (
          <video
            src={mediaUrl}
            muted
            playsInline
            onLoadedMetadata={
              handleMediaLoad as React.ReactEventHandler<HTMLVideoElement>
            }
            className="pointer-events-none max-h-full max-w-full object-contain"
          />
        )}
        {mediaUrl && mediaType === 'photo' && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediaUrl}
            alt="Preview"
            onLoad={
              handleMediaLoad as React.ReactEventHandler<HTMLImageElement>
            }
            className="pointer-events-none max-h-full max-w-full object-contain"
          />
        )}

        {loaded && (
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className={
              closed || confirmed
                ? 'absolute cursor-default'
                : 'absolute cursor-crosshair'
            }
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: canvasSize ? `${canvasSize.width}px` : '100%',
              height: canvasSize ? `${canvasSize.height}px` : '100%',
            }}
          />
        )}

        {/* Confirmed overlay badge */}
        {confirmed && (
          <div className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            Polygon saved
          </div>
        )}
      </div>

      {/* Vertex list */}
      {points.length > 0 && (
        <p className="text-[10px] text-[#5A7A9A]">
          <span className="font-medium text-[#E8EDF5]">
            {points.length} vertices
          </span>
          {closed
            ? ' · polygon closed'
            : points.length >= 3
              ? ' · click first point or press Close'
              : ' · need 3+ to close'}
        </p>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {points.length > 0 && (
          <button
            onClick={handleUndo}
            className="flex items-center gap-1.5 rounded-lg border border-[#1E3048] px-3 py-1.5 text-xs text-[#5A7A9A] hover:bg-[#1E3048] hover:text-[#E8EDF5]"
          >
            <Undo2 className="h-3 w-3" />
            {closed ? 'Reopen' : 'Undo'}
          </button>
        )}
        {points.length > 0 && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 rounded-lg border border-red-500/20 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10"
          >
            <Trash2 className="h-3 w-3" />
            Clear All
          </button>
        )}
        {points.length >= 3 && !closed && (
          <button
            onClick={handleClose}
            className="rounded-lg border border-amber-500/30 px-3 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/10"
          >
            Close Polygon
          </button>
        )}
        {closed && !confirmed && (
          <button
            onClick={handleConfirm}
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-400"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Confirm Zone →
          </button>
        )}
        {confirmed && (
          <button
            onClick={() => {
              setConfirmed(false);
              setClosed(false);
              setPoints([]);
              onClear();
            }}
            className="ml-auto rounded-lg border border-[#1E3048] px-3 py-1.5 text-xs text-[#5A7A9A] hover:bg-[#1E3048]"
          >
            Redraw
          </button>
        )}
      </div>
    </div>
  );
}
