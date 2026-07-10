import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export function LineDrawingCanvas({
  videoName,
  videoFile,
  videoSavedPath,
  onLineDraw,
  onSkip,
  initialLine = null,
  isReadOnly = false,
  showMinimalHeader = false,
}: {
  videoName: string;
  videoFile: File | null;
  videoSavedPath: string | null;
  onLineDraw?: (
    start: [number, number],
    end: [number, number],
    videoW: number,
    videoH: number,
  ) => void;
  onSkip?: () => void;
  initialLine?: {
    start: [number, number];
    end: [number, number];
    resolution: { width: number; height: number };
  } | null;
  isReadOnly?: boolean;
  showMinimalHeader?: boolean;
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

  const [showTutorial, setShowTutorial] = useState(!isReadOnly);
  const [countdown, setCountdown] = useState(5);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Sync video source URL
  useEffect(() => {
    if (videoFile) {
      const url = URL.createObjectURL(videoFile);
      const t = setTimeout(() => setVideoUrl(url), 0);
      return () => {
        clearTimeout(t);
        URL.revokeObjectURL(url);
      };
    } else if (videoSavedPath) {
      const t = setTimeout(
        () => setVideoUrl(`${BACKEND_URL}/${videoSavedPath}`),
        0,
      );
      return () => clearTimeout(t);
    }
  }, [videoFile, videoSavedPath]);

  // Tutorial countdown
  useEffect(() => {
    if (!showTutorial || isReadOnly) return;
    if (countdown <= 0) {
      const t = setTimeout(() => setShowTutorial(false), 0);
      return () => clearTimeout(t);
    }
    const timer = setTimeout(() => {
      setCountdown((c) => c - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown, showTutorial, isReadOnly]);

  // Escape key to clear line
  useEffect(() => {
    if (isReadOnly) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClear();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isReadOnly]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (startPoint) {
      // Draw OUT/start point circle (rose red)
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
        // Draw crossing line (emerald green if complete, brand blue if drawing)
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

        // Draw IN/end point circle (emerald green)
        ctx.beginPath();
        ctx.arc(endPoint.x, endPoint.y, 7, 0, 2 * Math.PI);
        ctx.fillStyle = '#10B981';
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(endPoint.x, endPoint.y, 3, 0, 2 * Math.PI);
        ctx.fill();

        // Draw IN/OUT text vector labels perpendicular to the line
        const dx = endPoint.x - startPoint.x;
        const dy = endPoint.y - startPoint.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) {
          const nx = -dy / len;
          const ny = dx / len;
          const midX = (startPoint.x + endPoint.x) / 2;
          const midY = (startPoint.y + endPoint.y) / 2;

          ctx.font = 'bold 11px Inter, sans-serif';

          // Draw IN label
          ctx.fillStyle = '#10B981';
          ctx.fillText('IN', midX + nx * 22 - 6, midY + ny * 22 + 4);

          // Draw OUT label
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

    // Calculate displayed video size under object-fit: contain
    const videoRatio = videoResolution.width / videoResolution.height;
    const elementWidth = media.clientWidth;
    const elementHeight = media.clientHeight;
    const elementRatio = elementWidth / elementHeight;

    let displayedWidth = elementWidth;
    let displayedHeight = elementHeight;

    if (elementRatio > videoRatio) {
      // Height constrained (letterboxed)
      displayedHeight = elementHeight;
      displayedWidth = elementHeight * videoRatio;
    } else {
      // Width constrained (pillarboxed)
      displayedWidth = elementWidth;
      displayedHeight = elementWidth / videoRatio;
    }

    canvas.width = displayedWidth;
    canvas.height = displayedHeight;
    setCanvasSize({ width: displayedWidth, height: displayedHeight });

    drawCanvas();
  }, [drawCanvas, videoResolution]);

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

  // Load and scale initial line if provided (e.g. review step)
  useEffect(() => {
    if (
      loaded &&
      canvasRef.current &&
      initialLine &&
      canvasSize?.width &&
      canvasSize?.height
    ) {
      const canvas = canvasRef.current;
      const scaleX = canvas.width / initialLine.resolution.width;
      const scaleY = canvas.height / initialLine.resolution.height;
      setStartPoint({
        x: initialLine.start[0] * scaleX,
        y: initialLine.start[1] * scaleY,
      });
      setEndPoint({
        x: initialLine.end[0] * scaleX,
        y: initialLine.end[1] * scaleY,
      });
    }
  }, [loaded, initialLine, canvasSize?.width, canvasSize?.height]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isReadOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setStartPoint({ x, y });
    setEndPoint({ x, y });
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isReadOnly || !isDrawing || !startPoint) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setEndPoint({ x, y });
  };

  const handleMouseUp = () => {
    if (isReadOnly) return;
    setIsDrawing(false);
  };

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
    if (!onLineDraw) return;
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

  function handleClear() {
    setStartPoint(null);
    setEndPoint(null);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  const handleFlip = () => {
    if (!startPoint || !endPoint) return;
    const temp = startPoint;
    setStartPoint(endPoint);
    setEndPoint(temp);
  };

  return (
    <div className="w-full space-y-4">
      {!showMinimalHeader && (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[#5A7A9A]">
              <span className="font-semibold text-[#E8EDF5]">{videoName}</span>{' '}
              -{' '}
              {isReadOnly
                ? 'Reviewing crossing line'
                : 'Draw the entry/exit line'}
            </p>
            <p className="text-[10px] text-[#5A7A9A]/70">
              {isReadOnly
                ? 'Previewing the gate position for entry/exit tracking.'
                : 'Click and drag to draw a line. Cross from OUT (red) to IN (green) to count as entry. Press ESC to clear.'}
            </p>
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        className="relative mx-auto flex aspect-video max-h-[480px] w-full max-w-none items-center justify-center overflow-hidden rounded-lg border border-[#1E3048]/60 bg-black/60"
      >
        <style>{`
          @keyframes tutorial-stretch {
            0% { width: 0; opacity: 0; }
            5% { opacity: 1; }
            75%, 100% { width: 100%; opacity: 1; }
          }
          @keyframes tutorial-cursor {
            0% { left: 0; }
            75%, 100% { left: 100%; }
          }
          @keyframes tutorial-out {
            0% { opacity: 0; transform: scale(0.6); }
            10%, 100% { opacity: 1; transform: scale(1); }
          }
          @keyframes tutorial-in {
            0%, 70% { opacity: 0; transform: scale(0.6); }
            75%, 100% { opacity: 1; transform: scale(1); }
          }
          .animate-tutorial-stretch {
            animation: tutorial-stretch 3.5s infinite ease-in-out;
          }
          .animate-tutorial-cursor {
            animation: tutorial-cursor 3.5s infinite ease-in-out;
          }
          .animate-tutorial-out {
            animation: tutorial-out 3.5s infinite ease-in-out;
          }
          .animate-tutorial-in {
            animation: tutorial-in 3.5s infinite ease-in-out;
          }
        `}</style>

        {showTutorial && !isReadOnly && (
          <div className="absolute inset-0 z-20 flex flex-col justify-between bg-black/55 p-5 text-center backdrop-blur-[3px] select-none">
            {/* Header Instructions */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[#E8EDF5] drop-shadow-md">
                How to Draw a Crossing Line
              </p>
              <p className="mx-auto max-w-xs text-[10px] leading-relaxed text-[#5A7A9A] drop-shadow-sm">
                Click and drag your mouse across the gateway. Cross from OUT
                (red) to IN (green) to count entries.
              </p>
            </div>

            {/* Stretching Line Animation directly over the blurred video */}
            <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-center px-16">
              <div className="relative flex h-10 w-full items-center">
                {/* OUT Point */}
                <div className="animate-tutorial-out absolute left-0 flex -translate-x-1/2 flex-col items-center gap-1">
                  <div className="h-3 w-3 rounded-full border-2 border-white bg-red-500 shadow" />
                  <span className="rounded border border-red-500/20 bg-black/80 px-1 text-[9px] font-bold text-red-400">
                    OUT
                  </span>
                </div>

                {/* Stretching Line */}
                <div className="animate-tutorial-stretch absolute left-0 h-1 origin-left bg-gradient-to-r from-red-500 to-emerald-500" />

                {/* Dragging Cursor with Arrow */}
                <div className="animate-tutorial-cursor absolute left-0 -mt-2 -ml-2 flex h-4 w-4 items-center justify-center">
                  <div className="h-2.5 w-2.5 rounded-full border border-blue-500 bg-white shadow-lg" />
                  <svg
                    className="absolute -top-4 left-4 h-4 w-4 animate-bounce text-blue-400 drop-shadow"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </div>

                {/* IN Point */}
                <div className="animate-tutorial-in absolute right-0 flex translate-x-1/2 flex-col items-center gap-1">
                  <div className="h-3 w-3 rounded-full border-2 border-white bg-emerald-500 shadow" />
                  <span className="rounded border border-emerald-500/20 bg-black/80 px-1 text-[9px] font-bold text-emerald-400">
                    IN
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="mx-auto flex w-full max-w-sm items-center justify-between border-t border-[#1E3048]/30 pt-2">
              <span className="text-[10px] text-[#5A7A9A] text-white">
                Drawing starts in {countdown}s...
              </span>
              <button
                onClick={() => setShowTutorial(false)}
                className="rounded-lg bg-[#1565C0] px-4 py-1.5 text-[10px] font-semibold text-white shadow-lg shadow-[#1565C0]/20 transition-colors hover:bg-[#1976D2]"
              >
                Skip &amp; Draw
              </button>
            </div>
          </div>
        )}

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
            onMouseDown={isReadOnly ? undefined : handleMouseDown}
            onMouseMove={isReadOnly ? undefined : handleMouseMove}
            onMouseUp={isReadOnly ? undefined : handleMouseUp}
            className={cn(
              'absolute',
              isReadOnly ? 'cursor-default' : 'cursor-crosshair',
            )}
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

      {!isReadOnly && (
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
          {onSkip && (
            <button
              onClick={onSkip}
              className="rounded-lg border border-[#1E3048] px-3 py-1.5 text-xs text-[#5A7A9A] hover:bg-[#1E3048] hover:text-[#E8EDF5]"
            >
              Skip (use defaults)
            </button>
          )}
          {startPoint && endPoint && (
            <button
              onClick={handleConfirm}
              className="ml-auto rounded-lg bg-[#1565C0] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#1976D2]"
            >
              Confirm Line →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
