import { requireOptionalNativeModule } from 'expo'
import type { NativeSmartNotesModule } from './mobileSmartNotesContract'

let cachedModule: NativeSmartNotesModule | null | undefined

export function optionalNativeSmartNotesModule(): NativeSmartNotesModule | null {
  if (cachedModule !== undefined) return cachedModule
  cachedModule = requireOptionalNativeModule<NativeSmartNotesModule>('TolariaSmartNotes')
  return cachedModule
}
