import type { MobileCrashArea } from './mobileCrashReporting'
import { logDiagnostic } from '../diagnostics/mobileDiagnostics'

type Reporter = (error: unknown, area: MobileCrashArea) => void
let reporter: Reporter = () => {}

export function registerMobileCrashReporter(next: Reporter) { reporter = next }
export function captureMobileError(error: unknown, area: MobileCrashArea) {
  logDiagnostic('error', area, `Mobile error captured in area: ${area}`, error)
  reporter(error, area)
}
