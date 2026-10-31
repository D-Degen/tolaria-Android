import { describe, expect, it } from 'vitest'
import {
  calculateTaskNotificationTimestamp,
  parseTaskTime,
  buildTaskNotificationPayload,
  syncTaskNotifications,
  type NotificationScheduler,
} from './mobileTaskNotifications'
import type { MobileTaskEntry } from './mobileTasks'

describe('mobileTaskNotifications', () => {
  it('parses task specific time formats correctly', () => {
    expect(parseTaskTime('Meeting mit Team ⏰ 14:30')).toBe('14:30')
    expect(parseTaskTime('Zahnarzt um 08:15')).toBe('08:15')
    expect(parseTaskTime('Call at 9:00')).toBe('09:00')
    expect(parseTaskTime('time: 16:45')).toBe('16:45')
    expect(parseTaskTime('Normale Aufgabe')).toBeNull()
  })

  it('calculates notification timestamp using task time or fallback default time', () => {
    const timestampFallback = calculateTaskNotificationTimestamp('2026-11-05', '09:00', null)
    expect(timestampFallback).toBe(new Date(2026, 10, 5, 9, 0, 0, 0).getTime())

    const timestampCustom = calculateTaskNotificationTimestamp('2026-11-05', '09:00', '15:30')
    expect(timestampCustom).toBe(new Date(2026, 10, 5, 15, 30, 0, 0).getTime())
  })

  it('builds notification payload for open tasks with due date', () => {
    const entry: MobileTaskEntry = {
      done: false,
      due: '2026-11-05',
      id: 'checkbox:1',
      inheritedDue: false,
      kind: 'checkbox',
      line: 2,
      noteId: 'note.md',
      parentIsTask: false,
      subtitle: 'Ideen',
      title: 'Review machen ⏰ 10:00',
    }

    const payload = buildTaskNotificationPayload(entry, '09:00')
    expect(payload).toEqual({
      body: 'In Notiz: Ideen',
      identifier: 'tolaria:task:checkbox:1',
      title: 'Review machen',
      triggerTimestamp: new Date(2026, 10, 5, 10, 0, 0, 0).getTime(),
    })
  })

  it('schedules future tasks and cancels completed tasks', async () => {
    const scheduled: string[] = []
    const cancelled: string[] = []
    const fakeScheduler: NotificationScheduler = {
      cancel: async (id) => { cancelled.push(id) },
      cancelAll: async () => {},
      schedule: async (p) => { scheduled.push(p.identifier) },
    }

    const entries: MobileTaskEntry[] = [
      {
        done: false,
        due: '2026-11-05',
        id: 'open-task',
        inheritedDue: false,
        kind: 'checkbox',
        line: 1,
        noteId: 'n1',
        parentIsTask: false,
        subtitle: 'Notes',
        title: 'Task in future',
      },
      {
        done: true,
        due: '2026-11-05',
        id: 'done-task',
        inheritedDue: false,
        kind: 'checkbox',
        line: 2,
        noteId: 'n1',
        parentIsTask: false,
        subtitle: 'Notes',
        title: 'Task completed',
      },
    ]

    const fakeNow = new Date(2026, 10, 1, 8, 0, 0).getTime()
    const result = await syncTaskNotifications(entries, {
      defaultTime: '09:00',
      enabled: true,
      now: fakeNow,
      scheduler: fakeScheduler,
    })

    expect(result.scheduled).toContain('tolaria:task:open-task')
    expect(result.cancelled).toContain('tolaria:task:done-task')
  })

  it('cancels all notifications when notifications are disabled', async () => {
    const cancelled: string[] = []
    const fakeScheduler: NotificationScheduler = {
      cancel: async (id) => { cancelled.push(id) },
      cancelAll: async () => {},
      schedule: async () => {},
    }

    const entries: MobileTaskEntry[] = [
      {
        done: false,
        due: '2026-11-05',
        id: 'task-1',
        inheritedDue: false,
        kind: 'checkbox',
        line: 1,
        noteId: 'n1',
        parentIsTask: false,
        subtitle: 'Notes',
        title: 'Task 1',
      },
    ]

    const result = await syncTaskNotifications(entries, {
      defaultTime: '09:00',
      enabled: false,
      scheduler: fakeScheduler,
    })

    expect(result.scheduled).toHaveLength(0)
    expect(result.cancelled).toContain('tolaria:task:task-1')
  })
})
