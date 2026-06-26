'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export function LineDrawingCanvas({
  videoName,
  videoFile,
  videoSavedPath,
  onLineDraw,
  onSkip,
}: {
  videoName: string;
  videoFile: File | null;
  videoSavedPath: string | null;
  onLineDraw: (
    start: [number, number],
    end: [number, number],
    videoW: number,
    videoH: number,
  ) => void;
  onSkip: () => void;
}) {
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [endPoint, setEndPoint] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [isDrawing, setIsDrawing] = useState(false);
  const [videoResolution, setVideoResolution] = useState({
    width: 1280,
    height: 720,
  });
  const [loaded, setLoaded] = useState(false);
  const [canvasSize, setCanvasSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (videoFile) {
      const url = URL.createObjectURL(videoFile);
      //eslint-disable-next-line react-hooks/set-state-in-effect
      setVideoUrl(url);
      return () => URL.revokeObjectURL(url);
    } else if (videoSavedPath) {
      setVideoUrl(`${BACKEND_URL}/${videoSavedPath}`);
    }
  }, [videoFile, videoSavedPath]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (startPoint) {
      ctx.shadowColor = '#EF4444';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(startPoint.x, startPoint.y, 7, 0, 2 * Math.PI);
      ctx.fillStyle = '#EF4444';
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(startPoint.x, startPoint.y, 3, 0, 2 * Math.PI);
      ctx.fill();

      if (endPoint) {
        const isComplete = !isDrawing;
        const lineColor = isComplete ? '#10B981' : '#3B82F6';
        ctx.shadowColor = lineColor;
        ctx.shadowBlur = 8;
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(endPoint.x, endPoint.y);
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.beginPath();
        ctx.arc(endPoint.x, endPoint.y, 7, 0, 2 * Math.PI);
        ctx.fillStyle = '#10B981';
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(endPoint.x, endPoint.y, 3, 0, 2 * Math.PI);
        ctx.fill();

        const dx = endPoint.x - startPoint.x;
        const dy = endPoint.y - startPoint.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) {
          const nx = -dy / len;
          const ny = dx / len;
          const midX = (startPoint.x + endPoint.x) / 2;
          const midY = (startPoint.y + endPoint.y) / 2;
          ctx.font = 'bold 11px Inter, sans-serif';
          ctx.fillStyle = '#10B981';
          ctx.fillText('IN', midX + nx * 22 - 6, midY + ny * 22 + 4);
          ctx.fillStyle = '#EF4444';
          ctx.fillText('OUT', midX - nx * 22 - 10, midY - ny * 22 + 4);
        }
      }
    }
  }, [startPoint, endPoint, isDrawing]);

  const syncCanvasSize = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const media = container.querySelector('video');
    const canvas = canvasRef.current;
    if (!media || !canvas) return;
    canvas.width = media.clientWidth;
    canvas.height = media.clientHeight;
    setCanvasSize({ width: media.clientWidth, height: media.clientHeight });
    drawCanvas();
  }, [drawCanvas]);

  useEffect(() => {
    if (loaded) {
      window.addEventListener('resize', syncCanvasSize);
      const t = setTimeout(syncCanvasSize, 100);
      return () => {
        window.removeEventListener('resize', syncCanvasSize);
        clearTimeout(t);
      };
    }
  }, [loaded, syncCanvasSize]);

  useEffect(() => {
    drawCanvas();
  }, [startPoint, endPoint, drawCanvas]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    setStartPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setEndPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPoint) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    setEndPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseUp = () => setIsDrawing(false);

  const handleMediaLoad = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const target = e.currentTarget;
    setVideoResolution({
      width: target.videoWidth || 1280,
      height: target.videoHeight || 720,
    });
    setLoaded(true);
    setTimeout(syncCanvasSize, 50);
  };

  const handleConfirm = () => {
    if (!startPoint || !endPoint || !canvasRef.current) {
      toast.error(
        'Please draw a line first by clicking and dragging on the video preview.',
      );
      return;
    }
    const canvas = canvasRef.current;
    const scaleX = videoResolution.width / canvas.width;
    const scaleY = videoResolution.height / canvas.height;
    const ptA: [number, number] = [
      Math.round(startPoint.x * scaleX),
      Math.round(startPoint.y * scaleY),
    ];
    const ptB: [number, number] = [
      Math.round(endPoint.x * scaleX),
      Math.round(endPoint.y * scaleY),
    ];
    onLineDraw(ptA, ptB, videoResolution.width, videoResolution.height);
  };

  const handleClear = () => {
    setStartPoint(null);
    setEndPoint(null);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleFlip = () => {
    if (!startPoint || !endPoint) return;
    const temp = startPoint;
    setStartPoint(endPoint);
    setEndPoint(temp);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-[#5A7A9A]">
            <span className="font-semibold text-[#E8EDF5]">{videoName}</span> —
            Draw the entry/exit line
          </p>
          <p className="text-[10px] text-[#5A7A9A]/70">
            Click and drag to draw a line. Cross from OUT (red) to IN (green) to
            count as entry.
          </p>
        </div>
        {!loaded && (
          <span className="flex items-center gap-1 text-[10px] text-[#5A7A9A]">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading video…
          </span>
        )}
      </div>

      <div
        ref={containerRef}
        className="relative mx-auto flex aspect-video max-h-[360px] w-full max-w-[640px] items-center justify-center overflow-hidden rounded-lg border border-[#1E3048]/60 bg-black/60"
      >
        {videoUrl && (
          <video
            src={videoUrl}
            muted
            playsInline
            onLoadedMetadata={handleMediaLoad}
            className="pointer-events-none max-h-full max-w-full object-contain"
          />
        )}
        {loaded && (
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="absolute cursor-crosshair"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: canvasSize?.width ? `${canvasSize.width}px` : '100%',
              height: canvasSize?.height ? `${canvasSize.height}px` : '100%',
            }}
          />
        )}
      </div>

      <div className="flex items-center gap-2">
        {startPoint && endPoint && (
          <button
            onClick={handleFlip}
            className="rounded-lg border border-[#F59E0B]/30 px-3 py-1.5 text-xs font-semibold text-[#F59E0B] transition-colors hover:border-[#F59E0B]/60 hover:bg-[#F59E0B]/5"
          >
            Flip Directions
          </button>
        )}
        {startPoint && endPoint && (
          <button
            onClick={handleClear}
            className="rounded-lg border border-[#1E3048] px-3 py-1.5 text-xs text-[#5A7A9A] hover:bg-[#1E3048] hover:text-[#E8EDF5]"
          >
            Clear Line
          </button>
        )}
        <button
          onClick={onSkip}
          className="rounded-lg border border-[#1E3048] px-3 py-1.5 text-xs text-[#5A7A9A] hover:bg-[#1E3048] hover:text-[#E8EDF5]"
        >
          Skip (use defaults)
        </button>
        {startPoint && endPoint && (
          <button
            onClick={handleConfirm}
            className="ml-auto rounded-lg bg-[#1565C0] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#1976D2]"
          >
            Confirm Line →
          </button>
        )}
      </div>
    </div>
  );
}
