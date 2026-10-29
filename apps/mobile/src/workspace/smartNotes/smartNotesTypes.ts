export type SmartNoteActionType = 'summarize' | 'suggestTitle' | 'generateTags' | 'extractTodos'

export type SmartNotesStatus = {
  available: boolean
  engine: 'gemini-nano' | 'local-on-device'
  model: string
  reason?: string
}

export type SmartNotesResult = {
  action: SmartNoteActionType
  text: string
  items?: string[]
}

export type SmartNoteDraft = {
  title: string
  type: string
  tags: string[]
  todos: string[]
  markdownBody: string
  engine: 'gemini-nano' | 'local-on-device'
}

