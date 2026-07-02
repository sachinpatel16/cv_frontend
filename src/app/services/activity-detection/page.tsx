import { redirect } from 'next/navigation';

/**
 * The old /services/activity-detection URL now redirects to the unified
 * activity detection page which includes smoking detection and all other
 * activity detectors in a single workflow.
 */
export default function ActivityDetectionRedirect() {
  redirect('/services/activity-detection/activity');
}
