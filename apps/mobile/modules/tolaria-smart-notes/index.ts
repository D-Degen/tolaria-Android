import { requireOptionalNativeModule } from 'expo'

export type NativeSmartNotesStatus = {
  available: boolean
  engine: string
  model?: string
  reason?: string
}

export type NativeSmartNotesModule = {
  isAvailable(): Promise<NativeSmartNotesStatus>
  generateContent(prompt: string): Promise<string>
  summarize(text: string): Promise<string>
  suggestTitle(text: string): Promise<string>
  generateTags(text: string): Promise<string[]>
  extractTodos(text: string): Promise<string[]>
  generateStructuredNote?(text: string, availableTypes: string[]): Promise<string>
  consumeSharedText?(): Promise<string | null>
}

export function optionalNativeSmartNotesModule(): NativeSmartNotesModule | null {
  return requireOptionalNativeModule<NativeSmartNotesModule>('TolariaSmartNotes')
}
