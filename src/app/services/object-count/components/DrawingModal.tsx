'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DrawingModalProps {
  mediaUrl: string;
  mediaType: 'photo' | 'video';
  onClose: () => void;
  onSave: (coords: number[][]) => void;
  initialCoords: number[][] | null;
}

export default function DrawingModal({
  mediaUrl,
  mediaType,
  onClose,
  onSave,
  initialCoords,
}: DrawingModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [loaded, setLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [canvasSize, setCanvasSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [endPoint, setEndPoint] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [drawing, setDrawing] = useState(false);

  // Parse initial coordinates if provided
  useEffect(() => {
    if (!initialCoords || !canvasSize || !naturalSize) return;
    const scaleX = canvasSize.width / naturalSize.width;
    const scaleY = canvasSize.height / naturalSize.height;

    setTimeout(() => {
      setStartPoint({
        x: initialCoords[0][0] * scaleX,
        y: initialCoords[0][1] * scaleY,
      });
      setEndPoint({
        x: initialCoords[1][0] * scaleX,
        y: initialCoords[1][1] * scaleY,
      });
    }, 0);
  }, [initialCoords, canvasSize, naturalSize]);

  // Adjust canvas size to fit visual container aspect ratio
  const handleMediaLoad = (
    e: React.SyntheticEvent<HTMLImageElement | HTMLVideoElement>,
  ) => {
    const target = e.target as any;
    const isVideo = target.tagName.toLowerCase() === 'video';
    const width = isVideo ? target.videoWidth : target.naturalWidth;
    const height = isVideo ? target.videoHeight : target.naturalHeight;

    setNaturalSize({ width, height });
    setLoaded(true);
  };

  useEffect(() => {
    if (!loaded || !containerRef.current || !naturalSize) return;

    const updateSize = () => {
      const container = containerRef.current;
      if (!container) return;

      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      const containerAspect = containerWidth / containerHeight;
      const mediaAspect = naturalSize.width / naturalSize.height;

      let w = containerWidth;
      let h = containerHeight;

      if (mediaAspect > containerAspect) {
        h = containerWidth / mediaAspect;
      } else {
        w = containerHeight * mediaAspect;
      }

      setCanvasSize({ width: w, height: h });
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [loaded, naturalSize]);

  // Canvas drawing lifecycle
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvasSize) return;

    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (startPoint && endPoint) {
      // Draw standard line crossing gate
      ctx.beginPath();
      ctx.moveTo(startPoint.x, startPoint.y);
      ctx.lineTo(endPoint.x, endPoint.y);
      ctx.strokeStyle = '#EF4444'; // Red line
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 4;
      ctx.stroke();
      ctx.shadowColor = 'transparent';

      // Draw direction arrows / tags (IN -> Green, OUT -> Red)
      const midX = (startPoint.x + endPoint.x) / 2;
      const midY = (startPoint.y + endPoint.y) / 2;

      const dx = endPoint.x - startPoint.x;
      const dy = endPoint.y - startPoint.y;
      const len = Math.sqrt(dx * dx + dy * dy);

      if (len > 0) {
        // Normal vector perpendicular to the line
        const nx = -dy / len;
        const ny = dx / len;

        // Draw Inward direction arrow (Green)
        ctx.beginPath();
        ctx.moveTo(midX, midY);
        ctx.lineTo(midX + nx * 20, midY + ny * 20);
        ctx.strokeStyle = '#10B981'; // Green arrow
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = '#10B981';
        ctx.beginPath();
        ctx.arc(midX + nx * 20, midY + ny * 20, 4, 0, 2 * Math.PI);
        ctx.fill();

        ctx.font = 'bold 9px sans-serif';
        ctx.fillStyle = '#10B981';
        ctx.fillText('IN', midX + nx * 25 - 5, midY + ny * 25 + 3);

        // Draw Outward direction arrow (Red)
        ctx.beginPath();
        ctx.moveTo(midX, midY);
        ctx.lineTo(midX - nx * 20, midY - ny * 20);
        ctx.strokeStyle = '#EF4444'; // Red arrow
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.arc(midX - nx * 20, midY - ny * 20, 4, 0, 2 * Math.PI);
        ctx.fill();

        ctx.font = 'bold 9px sans-serif';
        ctx.fillStyle = '#EF4444';
        ctx.fillText('OUT', midX - nx * 25 - 8, midY - ny * 25 + 3);
      }
    } else if (startPoint) {
      // Draw starting node indicator
      ctx.beginPath();
      ctx.arc(startPoint.x, startPoint.y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = '#60A5FA';
      ctx.fill();
    }
  }, [canvasSize, startPoint, endPoint]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setStartPoint({ x, y });
    setEndPoint(null);
    setDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing || !startPoint) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setEndPoint({ x, y });
  };

  const handleMouseUp = () => {
    setDrawing(false);
  };

  const handleSave = () => {
    if (!startPoint || !endPoint || !naturalSize || !canvasSize) return;

    const scaleX = naturalSize.width / canvasSize.width;
    const scaleY = naturalSize.height / canvasSize.height;

    const ptA = [
      Math.round(startPoint.x * scaleX),
      Math.round(startPoint.y * scaleY),
    ];
    const ptB = [
      Math.round(endPoint.x * scaleX),
      Math.round(endPoint.y * scaleY),
    ];

    onSave([ptA, ptB]);
    onClose();
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
    <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl space-y-4 rounded-xl border border-[#1E3048] bg-[#0D1628] p-5 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#1E3048] pb-3">
          <div>
            <h3 className="text-sm font-semibold text-[#E8EDF5]">
              Draw Entry/Exit Crossing Gate
            </h3>
            <p className="mt-0.5 text-[10px] text-[#5A7A9A]">
              Click and drag on the media preview to draw your crossing detector
              line.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-[#5A7A9A] transition-colors hover:bg-[#1E3048] hover:text-[#E8EDF5]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body: Drawing Canvas */}
        <div
          ref={containerRef}
          className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded border border-[#1E3048]/60 bg-black/60"
        >
          {mediaType === 'video' ? (
            <video
              src={mediaUrl}
              muted
              playsInline
              onLoadedMetadata={handleMediaLoad}
              className="pointer-events-none max-h-full max-w-full object-contain"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaUrl}
              alt="Media source"
              onLoad={handleMediaLoad}
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

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-[#1E3048] pt-3">
          <div className="text-[10px] text-[#5A7A9A]">
            {startPoint && endPoint ? (
              <span className="font-semibold text-[#10B981]">
                Line defined. Cross from OUT (red) to IN (green) to count as
                entry.
              </span>
            ) : (
              <span>
                No line drawn. Drag your cursor across the zone to draw.
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {startPoint && endPoint && (
              <button
                type="button"
                onClick={handleFlip}
                className="rounded border border-[#F59E0B]/30 px-3 py-1.5 text-xs font-semibold text-[#F59E0B] transition-colors hover:border-[#F59E0B]/60"
              >
                Flip Directions
              </button>
            )}
            <button
              onClick={handleClear}
              className="rounded px-3 py-1.5 text-xs font-semibold text-[#5A7A9A] transition-colors hover:bg-[#1E3048] hover:text-[#E8EDF5]"
            >
              Clear Line
            </button>
            <button
              onClick={onClose}
              className="rounded px-3 py-1.5 text-xs font-semibold text-[#5A7A9A] transition-colors hover:bg-[#1E3048] hover:text-[#E8EDF5]"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="rounded bg-[#1565C0] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#1565C0]/90"
            >
              Save Line & Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
