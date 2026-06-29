import { Search, DoorOpen } from 'lucide-react';
import type { AnalysisId, AnalysisConfig } from './types';
import PersonFindInput from './person-find/input';
import PersonFindResult from './person-find/result';
import EntryExitInput from './entry-exit/input';
import EntryExitResult from './entry-exit/result';

// ── Internal registry store ───────────────────────────────────────────────────
const registry = new Map<AnalysisId, AnalysisConfig>();

// ── Public API ────────────────────────────────────────────────────────────────

/** Register a new analysis into the system. */
export function registerAnalysis(config: AnalysisConfig): void {
  if (registry.has(config.id)) {
    console.warn(
      `[AnalysisRegistry] Overwriting existing analysis: ${config.id}`,
    );
  }
  registry.set(config.id, config);
}

/** Look up an analysis by its ID. Returns undefined if not found. */
export function getAnalysis(id: AnalysisId): AnalysisConfig | undefined {
  return registry.get(id);
}

/** Get all registered analyses as an array (for ManifestScanner cards). */
export function getAllAnalyses(): AnalysisConfig[] {
  return Array.from(registry.values());
}

/** Get only analyses whose backend is ready. */
export function getReadyAnalyses(): AnalysisConfig[] {
  return getAllAnalyses().filter((a) => a.backendReady);
}

// ── Default registrations ─────────────────────────────────────────────────────

registerAnalysis({
  id: 'person-find',
  label: 'Person Search',
  description:
    'Find anyone across hours of footage using face recognition. Upload a reference selfie and search all indexed media.',
  icon: Search,
  category: 'search',
  backendReady: true,
  InputComponent: PersonFindInput,
  ResultComponent: PersonFindResult,
});

registerAnalysis({
  id: 'entry-exit',
  label: 'Entry / Exit Counting',
  description:
    'Draw entry and exit zones on video keyframes to count people or vehicles crossing defined boundaries.',
  icon: DoorOpen,
  category: 'zone-based',
  backendReady: false,
  InputComponent: EntryExitInput,
  ResultComponent: EntryExitResult,
});
