import type { LucideIcon } from 'lucide-react';
import type { MediaSource } from '@/types/peoplefind';

// ── Analysis identifiers ──────────────────────────────────────────────────────
// Extend this union as new analyses are added.
export type AnalysisId = 'person-find' | 'entry-exit';

// ── Analysis categories ───────────────────────────────────────────────────────
export type AnalysisCategory =
  | 'search'
  | 'counting'
  | 'detection'
  | 'zone-based';

// ── Lifecycle status of an investigation run ──────────────────────────────────
export type AnalysisStatus =
  | 'idle'
  | 'uploading'
  | 'scanning'
  | 'configuring'
  | 'running'
  | 'completed'
  | 'failed';

// ── Component prop contracts ──────────────────────────────────────────────────

/** Props passed to every analysis-specific Input component. */
export interface InputComponentProps {
  /** Pre-selected media from the investigation flow. */
  media: MediaSource[];
  /** Called when the analysis is submitted — passes the session/job ID. */
  onSubmit: (sessionId: string) => void;
}

/** Props passed to every analysis-specific Result component. */
export interface ResultComponentProps {
  /** The session/job ID returned from the input step. */
  sessionId: string;
  /** Which analysis produced these results. */
  analysisId: AnalysisId;
}

// ── Registry entry shape ──────────────────────────────────────────────────────

/** A single analysis definition registered in the system. */
export interface AnalysisConfig {
  /** Unique identifier matching the AnalysisId union. */
  id: AnalysisId;
  /** Human-readable label shown in UI. */
  label: string;
  /** Short description for discovery cards. */
  description: string;
  /** Lucide icon component for sidebar/cards. */
  icon: LucideIcon;
  /** Grouping category for filtering/sorting. */
  category: AnalysisCategory;
  /** Whether the backend endpoints are ready for this analysis. */
  backendReady: boolean;
  /** Renders analysis-specific configuration UI. */
  InputComponent: React.ComponentType<InputComponentProps>;
  /** Renders analysis-specific results UI. */
  ResultComponent: React.ComponentType<ResultComponentProps>;
}

// ── Zone types (for future Entry/Exit analysis) ───────────────────────────────

export type ZoneType = 'line' | 'polygon';

/** A drawn zone on a video keyframe for entry/exit or region-of-interest. */
export interface ZoneDefinition {
  /** Unique zone identifier. */
  id: string;
  /** The kind of zone boundary. */
  type: ZoneType;
  /** Array of [x, y] coordinates defining the zone shape. */
  points: [number, number][];
  /** User-provided label (e.g. "Main Entrance", "Exit Gate"). */
  label: string;
  /** Optional colour for the overlay rendering. */
  color?: string;
}

// ── Re-export peoplefind types for convenience ────────────────────────────────
export type {
  MediaSource,
  SearchSession,
  SearchMatch,
  SessionHistoryItem,
  SessionUser,
} from '@/types/peoplefind';
