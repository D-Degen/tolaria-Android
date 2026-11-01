import { expect, test } from '@playwright/test'
import { phoneBack } from './mobile-panel-navigation'

for (const action of ['button', 'shortcut', 'command'] as const) {
  test(`@smoke phone ${action} creates an untitled note directly in the editor`, async ({ page }, info) => {
    test.skip(info.project.name !== 'phone-portrait')
    await page.goto('/?source=fixture&phoneState=list&editorMode=source')
    await expect(page.getByTestId('phone-note-list-screen')).toBeVisible()
    if (action === 'button') await page.getByTestId('note-list-create-action').click()
    if (action === 'shortcut') await page.keyboard.press('Meta+n')
    if (action === 'command') {
      await page.keyboard.press('Meta+k')
      await expect(page.getByTestId('mobile-command-palette')).toBeVisible()
      await page.getByTestId('mobile-command-palette-input').fill('new note')
      await page.getByTestId('mobile-command-palette-command-file-new-note').click()
    }
    await expect(page.getByTestId('phone-editor-screen')).toBeVisible()
    await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
    const source = page.getByTestId('editor-markdown-input')
    await expect(source).toHaveValue(/type: Note/u)
    await source.fill('---\ntype: Note\n---\n\nA body without a title.')
    await phoneBack(page)
    await expect(page.getByTestId('phone-note-list-screen')).toBeVisible()
    await expect(page.getByTestId('phone-note-list-screen').getByText('A body without a title.', { exact: true }).first()).toBeVisible()
  })
}
