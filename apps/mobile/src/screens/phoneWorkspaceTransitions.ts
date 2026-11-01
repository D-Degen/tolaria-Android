export type PhoneWorkspaceState = 'editor' | 'list' | 'properties' | 'sidebar'
export type PhoneWorkspaceSwipeDirection = 'left' | 'right'
export type PhoneWorkspaceTransitionDirection = 'fade' | 'fromLeft' | 'fromRight'

export const phoneWorkspaceTransitionDurationMs = 180
export const phoneWorkspaceSidebarDrawerMaxWidth = 320
export const phoneWorkspaceSidebarDrawerWidthRatio = 0.78
export const phoneWorkspacePropertiesDrawerMaxWidth = 360
export const phoneWorkspacePropertiesDrawerWidthRatio = 0.85

const phoneStateOrder = {
  sidebar: 0,
  list: 1,
  editor: 2,
  properties: 3,
} satisfies Record<PhoneWorkspaceState, number>

const phoneSwipeDestinations: Record<PhoneWorkspaceState, Partial<Record<PhoneWorkspaceSwipeDirection, PhoneWorkspaceState>>> = {
  editor: { left: 'properties', right: 'list' },
  list: { right: 'sidebar' },
  properties: { right: 'editor' },
  sidebar: { left: 'list' },
}

export function phoneWorkspaceTransitionDirection(
  previousState: PhoneWorkspaceState,
  nextState: PhoneWorkspaceState,
): PhoneWorkspaceTransitionDirection {
  if (previousState === nextState) return 'fade'
  return phoneStateOrder[nextState] > phoneStateOrder[previousState] ? 'fromRight' : 'fromLeft'
}

export function phoneWorkspaceSwipeDestination(
  state: PhoneWorkspaceState,
  direction: PhoneWorkspaceSwipeDirection,
): PhoneWorkspaceState | null {
  return phoneSwipeDestinations[state][direction] ?? null
}

export function phoneWorkspaceDragOffset(
  state: PhoneWorkspaceState,
  dx: number,
  width: number,
): number {
  const direction = swipeDirectionForOffset(dx)
  if (!direction || !phoneWorkspaceSwipeDestination(state, direction)) return 0
  const maxOffset = phoneWorkspaceDragLimit(state, direction, width)
  return Math.max(-maxOffset, Math.min(maxOffset, dx))
}

export function phoneWorkspaceDragCommitOffset(
  state: PhoneWorkspaceState,
  nextState: PhoneWorkspaceState,
  width: number,
): number {
  if (state === nextState) return 0

  const direction: PhoneWorkspaceSwipeDirection = phoneStateOrder[nextState] > phoneStateOrder[state] ? 'left' : 'right'
  const limit = phoneWorkspaceDragLimit(state, direction, width)
  return direction === 'left' ? -limit : limit
}

export function phoneWorkspaceSidebarDrawerWidth(rootWidth: number): number {
  'worklet'
  return Math.min(
    phoneWorkspaceSidebarDrawerMaxWidth,
    Math.round(rootWidth * phoneWorkspaceSidebarDrawerWidthRatio),
  )
}

export function phoneWorkspacePropertiesDrawerWidth(rootWidth: number): number {
  'worklet'
  return Math.min(
    phoneWorkspacePropertiesDrawerMaxWidth,
    Math.round(rootWidth * phoneWorkspacePropertiesDrawerWidthRatio),
  )
}

function phoneWorkspaceDragLimit(
  state: PhoneWorkspaceState,
  direction: PhoneWorkspaceSwipeDirection,
  width: number,
): number {
  if (isSidebarRailDrag(state, direction)) return phoneWorkspaceSidebarDrawerWidth(width)
  return Math.max(0, width)
}

function isSidebarRailDrag(
  state: PhoneWorkspaceState,
  direction: PhoneWorkspaceSwipeDirection,
) {
  return (state === 'list' && direction === 'right') || (state === 'sidebar' && direction === 'left')
}

function swipeDirectionForOffset(dx: number): PhoneWorkspaceSwipeDirection | null {
  if (dx < 0) return 'left'
  if (dx > 0) return 'right'
  return null
}
