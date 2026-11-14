import { createRoot } from 'react-dom/client'
import { EditorContent } from '@tiptap/react'
import type { Editor } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { useTenTap } from '@10play/tentap-editor/web'
import { mobileWikilinkStartKit } from './MobileWysiwygLinkBridge.web'
import { MobileCodeBlockBridge } from './MobileWysiwygCodeBlockBridge'
import { MobileDiagramBridge } from './MobileWysiwygDiagramBridge'
import { disposeMobileDiagramRenderer, MobileDiagramNodeView } from './mobileDiagramNodeView.web'
import { MobileWysiwygContentBridge } from './MobileWysiwygContentBridge'
import { MobileMathInlineBridge } from './MobileWysiwygMathBridge'
import { MobileWysiwygOutlineBridge } from './MobileWysiwygOutlineBridge'
import { MobileTableBridge } from './MobileWysiwygTableBridge'
import { createMobileSlashBridge } from './MobileWysiwygSlashBridge'
import { MobileSlashExtension, readMobileSlash, runMobileSlash } from './MobileWysiwygSlashExtension'
import { createMobileFindBridge } from './MobileWysiwygFindBridge'
import { MobileFindExtension, readMobileFind, applyMobileFindRequest } from './MobileWysiwygFindExtension'

declare global {
  interface Window {
    contentInjected: boolean | undefined
    dynamicHeight?: boolean
  }
}

const mobileTenTapExtensions = [
  ...mobileWikilinkStartKit(),
  MobileCodeBlockBridge,
  MobileDiagramBridge.extendExtension({
    addNodeView(this: { editor: Editor }) {
      return ({ node }: { node: ProseMirrorNode }) => new MobileDiagramNodeView(node, this.editor)
    },
    onDestroy(this: { editor: Editor }) { disposeMobileDiagramRenderer(this.editor) },
  }),
  MobileMathInlineBridge,
  MobileWysiwygContentBridge,
  MobileWysiwygOutlineBridge,
  MobileTableBridge,
  createMobileSlashBridge({ extension: MobileSlashExtension, read: readMobileSlash, run: runMobileSlash }),
  createMobileFindBridge({ extension: MobileFindExtension, read: readMobileFind, run: applyMobileFindRequest }),
]

function enabledTenTapExtensions() {
  return mobileTenTapExtensions.filter(
    (extension) => !window.whiteListBridgeExtensions || window.whiteListBridgeExtensions.includes(extension.name),
  )
}

export function MobileWysiwygTenTapEditor() {
  const editor = useTenTap({ bridges: enabledTenTapExtensions() })

  return <EditorContent editor={editor} className={window.dynamicHeight ? 'dynamic-height' : undefined} />
}

function renderWhenInjected() {
  if (!window.contentInjected) {
    window.requestAnimationFrame(renderWhenInjected)
    return
  }

  const container = document.getElementById('root')
  if (!container) return

  createRoot(container).render(<MobileWysiwygTenTapEditor />)
}

renderWhenInjected()
