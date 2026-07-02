/**
 * Non-linear 60-step frame sampling interval utility.
 *
 * Steps 0–29 (left half): frame-by-frame from 1 frame to 30 frames.
 *   step 0  → 1/30 s ≈ 0.033s (1 frame)
 *   step 29 → 30/30 s = 1.000s (30 frames)
 *
 * Steps 30–59 (right half): coarse time increments.
 *   steps 30–49 → 1.1s to 3.0s (step 0.1s, 20 steps)
 *   steps 50–59 → 3.2s to 5.0s (step 0.2s, 10 steps)
 *
 * Total: 30 + 20 + 10 = 60 steps.
 * Step 29 (center) = 1.0s exactly.
 */

export const SLIDER_STEPS = 60;
export const SLIDER_MIN = 0;
export const SLIDER_MAX = SLIDER_STEPS - 1; // 59

/**
 * Map a slider step index (0–59) to the actual interval value in seconds.
 */
export function stepToInterval(step: number): number {
  const s = Math.round(Math.max(0, Math.min(SLIDER_MAX, step)));
  if (s <= 29) {
    // left half: 1 to 30 frames → 1/30 to 1.0s
    return parseFloat(((s + 1) / 30).toFixed(4));
  } else if (s <= 49) {
    // right half, first segment: 1.1s to 3.0s in 0.1s steps
    return parseFloat((1.1 + (s - 30) * 0.1).toFixed(1));
  } else {
    // right half, second segment: 3.2s to 5.0s in 0.2s steps
    return parseFloat((3.2 + (s - 50) * 0.2).toFixed(1));
  }
}

/**
 * Map an interval value (seconds) to the nearest slider step index (0–59).
 */
export function intervalToStep(interval: number): number {
  let best = 0;
  let bestDiff = Infinity;
  for (let s = 0; s <= SLIDER_MAX; s++) {
    const diff = Math.abs(stepToInterval(s) - interval);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = s;
    }
  }
  return best;
}

/**
 * Format a step index as a human-readable label for the badge.
 * Left half shows frame count + seconds for sub-second, pure seconds for 1.0s.
 * Right half shows seconds only.
 */
export function stepLabel(step: number): string {
  const s = Math.round(Math.max(0, Math.min(SLIDER_MAX, step)));
  if (s <= 28) {
    // 1–29 frames
    const frames = s + 1;
    const secs = stepToInterval(s);
    return `${frames}f (${secs.toFixed(2)}s)`;
  } else if (s === 29) {
    return '1.0s';
  } else {
    return `${stepToInterval(s).toFixed(1)}s`;
  }
}
