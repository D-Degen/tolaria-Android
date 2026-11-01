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
  recognizeSpeech?(): Promise<string | null>
  startVoiceRecording?(): Promise<boolean>
  stopVoiceRecording?(): Promise<string | null>
  cancelVoiceRecording?(): Promise<null>
  addListener?(
    eventName: 'onSpeechRmsChanged' | 'onSpeechPartialResult',
    listener: (event: { rms?: number; text?: string }) => void,
  ): { remove: () => void }
}
