'use client';

import { useState } from 'react';
import { Play, Loader2, RotateCcw, User } from 'lucide-react';
import { UploadZone } from '@/components/ui/UploadZone';

const VIDEO_ACCEPT = { 'video/*': ['.mp4', '.mov', '.avi'] };
const IMAGE_ACCEPT = { 'image/*': ['.jpg', '.jpeg', '.png'] };

interface SearchResult {
  id: string;
  timestamp: string;
  similarity: number;
  thumbnail: string;
}

const MOCK_RESULTS: SearchResult[] = [
  { id: 'r1', timestamp: '00:04:12', similarity: 97, thumbnail: 'A' },
  { id: 'r2', timestamp: '00:11:38', similarity: 91, thumbnail: 'B' },
  { id: 'r3', timestamp: '00:23:05', similarity: 85, thumbnail: 'C' },
  { id: 'r4', timestamp: '00:41:20', similarity: 78, thumbnail: 'D' },
  { id: 'r5', timestamp: '01:02:44', similarity: 72, thumbnail: 'E' },
];

export default function PersonSearchPage() {
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [footageFile, setFootageFile] = useState<File | null>(null);
  const [threshold, setThreshold] = useState(70);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<SearchResult[] | null>(null);

  async function handleRun() {
    if (!referenceFile || !footageFile) return;
    setRunning(true);
    await new Promise((r) => setTimeout(r, 2500));
    setResults(MOCK_RESULTS.filter((r) => r.similarity >= threshold));
    setRunning(false);
  }

  function handleReset() {
    setReferenceFile(null);
    setFootageFile(null);
    setResults(null);
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#E8EDF5]">
          Person / Object Search
        </h1>
        <p className="mt-1 text-sm text-[#5A7A9A]">
          Find anyone across hours of footage using visual similarity matching.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Config */}
        <div className="space-y-5 rounded-xl border border-[#1E3048] bg-[#0D1628] p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-[#E8EDF5]">
            Configuration
          </h2>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#5A7A9A]">
              Reference image
            </label>
            <UploadZone
              label="Photo of person or object to find"
              accept={IMAGE_ACCEPT}
              file={referenceFile}
              onChange={setReferenceFile}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#5A7A9A]">
              Footage file
            </label>
            <UploadZone
              label="Video to search through"
              accept={VIDEO_ACCEPT}
              file={footageFile}
              onChange={setFootageFile}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[#5A7A9A]">
                Similarity threshold
              </label>
              <span className="text-xs font-semibold text-[#E8EDF5]">
                {threshold}%
              </span>
            </div>
            <input
              type="range"
              min={50}
              max={99}
              step={1}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full accent-[#1565C0]"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleRun}
              disabled={!referenceFile || !footageFile || running}
              className="flex h-9 flex-1 items-center justify-center gap-2 rounded-md bg-[#1565C0] text-sm font-medium text-white transition-colors hover:bg-[#1565C0]/90 disabled:opacity-40"
            >
              {running ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Play className="h-4 w-4" /> Search
                </>
              )}
            </button>
            {results && (
              <button
                onClick={handleReset}
                className="flex h-9 w-9 items-center justify-center rounded-md border border-[#1E3048] text-[#5A7A9A] transition-colors hover:bg-[#1E3048] hover:text-[#E8EDF5]"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4 lg:col-span-3">
          {!results ? (
            <div className="flex h-64 items-center justify-center rounded-xl border border-[#1E3048] bg-[#0D1628]">
              <p className="text-sm text-[#5A7A9A]">
                {running
                  ? 'Searching footage…'
                  : 'Upload reference and footage to start'}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-[#1E3048] bg-[#0D1628]">
              <div className="flex items-center justify-between border-b border-[#1E3048] px-5 py-3">
                <p className="text-xs font-semibold text-[#5A7A9A]">
                  Search results
                </p>
                <span className="text-xs font-medium text-[#E8EDF5]">
                  {results.length} match{results.length !== 1 ? 'es' : ''}
                </span>
              </div>
              {results.length === 0 ? (
                <div className="flex h-32 items-center justify-center">
                  <p className="text-sm text-[#5A7A9A]">
                    No matches above {threshold}% similarity
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#1E3048]">
                  {results.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center gap-4 px-5 py-3"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-[#1E3048] bg-[#1E3048]">
                        <User className="h-6 w-6 text-[#5A7A9A]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-[#E8EDF5]">
                          Match at {r.timestamp}
                        </p>
                        <p className="mt-0.5 text-xs text-[#5A7A9A]">
                          Frame time in footage
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-sm font-bold ${r.similarity >= 90 ? 'text-emerald-400' : r.similarity >= 75 ? 'text-[#F59E0B]' : 'text-[#5A7A9A]'}`}
                        >
                          {r.similarity}%
                        </p>
                        <p className="text-xs text-[#5A7A9A]">similarity</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
