export type MobileSettings = {
  autoGit: boolean
  analytics: boolean
  crashReporting: boolean
  taskNotificationsEnabled: boolean
  taskNotificationTime: string
  theme: 'system' | 'light' | 'dark'
  uiScale: 1.2
  updateChannel: 'stable' | 'alpha'
}

export const defaultMobileSettings: MobileSettings = {
  autoGit: false,
  analytics: false,
  crashReporting: false,
  taskNotificationsEnabled: true,
  taskNotificationTime: '09:00',
  theme: 'system',
  uiScale: 1.2,
  updateChannel: 'stable',
}

export function parseMobileSettings(raw: string | null): MobileSettings {
  if (raw === null) return { ...defaultMobileSettings }
  const value: unknown = JSON.parse(raw)
  if (!isRecord(value)) throw new Error('invalidSettings')
  // Validate old preferences without retaining the retired density choice.
  setting(value.uiScale, [1, 1.1, 1.2], defaultMobileSettings.uiScale)
  return {
    autoGit: setting(value.autoGit, [true, false], defaultMobileSettings.autoGit),
    analytics: setting(value.analytics, [true, false], defaultMobileSettings.analytics),
    crashReporting: setting(value.crashReporting, [true, false], defaultMobileSettings.crashReporting),
    taskNotificationsEnabled: setting(value.taskNotificationsEnabled, [true, false], defaultMobileSettings.taskNotificationsEnabled),
    taskNotificationTime: notificationTimeSetting(value.taskNotificationTime, defaultMobileSettings.taskNotificationTime),
    theme: setting(value.theme, ['system', 'light', 'dark'], defaultMobileSettings.theme),
    uiScale: defaultMobileSettings.uiScale,
    updateChannel: setting(value.updateChannel, ['stable', 'alpha'], defaultMobileSettings.updateChannel),
  }
}

function notificationTimeSetting(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(trimmed) ? trimmed : fallback
}

function setting<T extends string | number | boolean>(value: unknown, allowed: T[], fallback: T): T {
  if (value === undefined) return fallback
  const match = allowed.find((candidate) => candidate === value)
  if (match === undefined) throw new Error('invalidSettings')
  return match
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
