package md.tolaria.smartnotes

import android.content.Intent
import android.os.Build
import com.google.mlkit.genai.common.FeatureStatus
import com.google.mlkit.genai.prompt.Generation
import com.google.mlkit.genai.prompt.GenerativeModel
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeoutOrNull

class TolariaSmartNotesModule : Module() {
  @Volatile
  private var generativeModel: GenerativeModel? = null

  private fun getOrCreateModel(): GenerativeModel {
    val existing = generativeModel
    if (existing != null) return existing
    return synchronized(this) {
      generativeModel ?: Generation.getClient().also { generativeModel = it }
    }
  }

  override fun definition() = ModuleDefinition {
    Name("TolariaSmartNotes")

    OnDestroy {
      try {
        generativeModel?.close()
      } catch (e: Throwable) {
      } finally {
        generativeModel = null
      }
    }

    AsyncFunction("isAvailable") {
      checkGeminiNanoAvailable()
    }

    AsyncFunction("generateContent") { prompt: String ->
      executePrompt(prompt)
    }

    AsyncFunction("summarize") { text: String ->
      val prompt = "Fasse die folgende Notiz kurz und prägnant in 2 bis 4 Aufzählungspunkten auf Deutsch zusammen (- Punkt):\n\n$text"
      executePrompt(prompt)
    }

    AsyncFunction("suggestTitle") { text: String ->
      val prompt = "Erstelle einen kurzen, prägnanten Titel (maximal 6 Wörter, ohne Anführungszeichen) für folgenden Notiztext:\n\n$text"
      executePrompt(prompt).trim().removeSurrounding("\"").removeSurrounding("'")
    }

    AsyncFunction("generateTags") { text: String ->
      val prompt = "Generiere 3 bis 5 thematisch passende Tags für diesen Text. Gib ausschließlich eine kommagetrennte Liste ohne '#' oder Erklärungen zurück:\n\n$text"
      val raw = executePrompt(prompt)
      raw.split(",").map { it.trim().removePrefix("#").lowercase() }.filter { it.isNotEmpty() }
    }

    AsyncFunction("extractTodos") { text: String ->
      val prompt = "Extrahiere alle Aufgaben, To-Dos und Handlungsanweisungen aus diesem Notiztext. Formatiere jede Zeile als '- [ ] <Aufgabe>':\n\n$text"
      val raw = executePrompt(prompt)
      raw.lines().map { it.trim() }.filter { it.isNotEmpty() }
    }

    AsyncFunction("generateStructuredNote") { text: String, availableTypes: List<String> ->
      val typesHint = if (availableTypes.isNotEmpty()) availableTypes.joinToString(", ") else "Note"
      val prompt = buildString {
        appendLine("Verwandle die folgende Eingabe in eine strukturierte Markdown-Notiz auf Deutsch.")
        appendLine("Verfügbare Notiz-Typen: $typesHint")
        appendLine("Antworte exakt in diesem Format:")
        appendLine("TITLE: <Kurzer prägnanter Titel, max 6 Wörter>")
        appendLine("TYPE: <Passendster Typ aus der Liste der verfügbaren Notiz-Typen>")
        appendLine("TAGS: <3 bis 5 kommagetrennte Schlagwörter in Kleinbuchstaben ohne #>")
        appendLine("TODOS:")
        appendLine("- [ ] <Extrahierte Aufgabe falls vorhanden, sonst leer lassen>")
        appendLine("BODY:")
        appendLine("<Gut strukturierter Markdown-Text ohne den Haupttitel>")
        appendLine()
        appendLine("Eingabe:")
        append(text)
      }
      executePrompt(prompt)
    }

    AsyncFunction("consumeSharedText") {
      val activity = appContext.currentActivity ?: return@AsyncFunction null
      val intent = activity.intent ?: return@AsyncFunction null
      if (intent.action == Intent.ACTION_SEND && intent.type?.startsWith("text/") == true) {
        val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT)?.trim()
        val sharedSubject = intent.getStringExtra(Intent.EXTRA_SUBJECT)?.trim()
        intent.removeExtra(Intent.EXTRA_TEXT)
        intent.removeExtra(Intent.EXTRA_SUBJECT)
        intent.action = Intent.ACTION_MAIN
        if (!sharedText.isNullOrEmpty()) {
          if (!sharedSubject.isNullOrEmpty() && !sharedText.startsWith(sharedSubject)) {
            "$sharedSubject\n\n$sharedText"
          } else {
            sharedText
          }
        } else {
          null
        }
      } else {
        null
      }
    }
  }

  private fun checkGeminiNanoAvailable(): Map<String, Any> {
    if (Build.VERSION.SDK_INT < 26) {
      return mapOf(
        "available" to false,
        "engine" to "gemini-nano",
        "reason" to "Requires Android 8.0 (API 26) or higher"
      )
    }
    return try {
      runBlocking {
        val model = getOrCreateModel()
        val status = model.checkStatus()
        when (status) {
          FeatureStatus.AVAILABLE -> mapOf(
            "available" to true,
            "engine" to "gemini-nano",
            "model" to "Gemini Nano (AICore)"
          )
          FeatureStatus.DOWNLOADABLE, FeatureStatus.DOWNLOADING -> mapOf(
            "available" to true,
            "engine" to "gemini-nano",
            "model" to "Gemini Nano (AICore - Downloadable)"
          )
          else -> mapOf(
            "available" to false,
            "engine" to "gemini-nano",
            "reason" to "Gemini Nano status: $status"
          )
        }
      }
    } catch (e: Throwable) {
      mapOf(
        "available" to false,
        "engine" to "gemini-nano",
        "reason" to (e.message ?: "ML Kit GenAI Prompt API / AICore not present on this device")
      )
    }
  }

  private fun executePrompt(prompt: String): String {
    if (Build.VERSION.SDK_INT < 26) return ""
    return try {
      runBlocking {
        withTimeoutOrNull(15_000L) {
          val model = getOrCreateModel()
          val status = model.checkStatus()
          if (status == FeatureStatus.DOWNLOADABLE) {
            CoroutineScope(Dispatchers.IO).launch {
              try {
                model.download().collect {}
              } catch (e: Throwable) {
              }
            }
            ""
          } else if (status == FeatureStatus.AVAILABLE) {
            val response = model.generateContent(prompt)
            response.candidates.firstOrNull()?.text?.trim() ?: ""
          } else {
            ""
          }
        } ?: ""
      }
    } catch (e: Throwable) {
      ""
    }
  }
}
