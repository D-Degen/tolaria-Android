export type MobileNoteSwipeAction = 'favorite' | 'archive' | 'organize'
export const mobileNoteSwipeThreshold = 0.68

export function fullSwipeNoteAction(
  distance: number,
  width: number,
  primaryAction: 'archive' | 'organize' = 'archive',
): MobileNoteSwipeAction | null {
  'worklet'
  if (width <= 0 || distance > -width * mobileNoteSwipeThreshold) return null
  return primaryAction
}
