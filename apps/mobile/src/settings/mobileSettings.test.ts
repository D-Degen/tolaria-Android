import { expect, it } from 'vitest'
import { defaultMobileSettings, parseMobileSettings } from './mobileSettings'

it('keeps automatic Git and telemetry opt-in on a fresh installation', () => {
  expect(parseMobileSettings(null)).toEqual(defaultMobileSettings)
  expect(defaultMobileSettings.autoGit).toBe(false)
  expect(defaultMobileSettings.analytics).toBe(false)
  expect(defaultMobileSettings.taskNotificationsEnabled).toBe(true)
  expect(defaultMobileSettings.taskNotificationTime).toBe('09:00')
})

it('round-trips task notification settings and validates time format', () => {
  const custom = { ...defaultMobileSettings, taskNotificationsEnabled: false, taskNotificationTime: '14:30' }
  expect(parseMobileSettings(JSON.stringify(custom))).toEqual(custom)
  // Invalid time falls back to default 09:00
  const invalidTime = parseMobileSettings(JSON.stringify({ ...defaultMobileSettings, taskNotificationTime: 'invalid' }))
  expect(invalidTime.taskNotificationTime).toBe('09:00')
})

it('round-trips explicit choices without accepting malformed booleans or theme values', () => {
  const settings = { ...defaultMobileSettings, autoGit: true, theme: 'dark', uiScale: 1.2 }
  expect(parseMobileSettings(JSON.stringify(settings))).toEqual(settings)
  expect(() => parseMobileSettings('{"autoGit":"false"}')).toThrow()
  expect(() => parseMobileSettings('{"theme":"invalid"}')).toThrow()
  expect(() => parseMobileSettings('{"uiScale":20}')).toThrow()
  expect(() => parseMobileSettings('{')).toThrow()
})

it.each([undefined, 1, 1.1, 1.2])('uses fixed 120 percent density when loading legacy scale %s', (uiScale) => {
  const settings = parseMobileSettings(JSON.stringify({ autoGit: true, theme: 'dark', uiScale }))
  expect(settings).toMatchObject({ autoGit: true, theme: 'dark', uiScale: 1.2 })
  expect(defaultMobileSettings.uiScale).toBe(1.2)
})
