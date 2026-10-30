package md.tolaria.smartnotes

import android.app.Activity
import android.content.Intent
import android.speech.RecognizerIntent
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.Locale

class TolariaSmartNotesModule : Module() {
  private val speechRequestCode = 48192
  @Volatile
  private var pendingSpeechPromise: Promise? = null

  override fun definition() = ModuleDefinition {
    Name("TolariaSmartNotes")

    OnActivityResult { _, payload ->
      if (payload.requestCode == speechRequestCode) {
        val promise = pendingSpeechPromise
        pendingSpeechPromise = null
        if (promise != null) {
          if (payload.resultCode == Activity.RESULT_OK && payload.data != null) {
            val matches = payload.data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)
            val spoken = matches?.firstOrNull()?.trim()
            promise.resolve(if (!spoken.isNullOrEmpty()) spoken else null)
          } else {
            promise.resolve(null)
          }
        }
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

    AsyncFunction("recognizeSpeech") { promise: Promise ->
      val activity = appContext.currentActivity
      if (activity == null) {
        promise.resolve(null)
        return@AsyncFunction
      }
      pendingSpeechPromise?.resolve(null)
      pendingSpeechPromise = promise
      try {
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
          putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
          putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault())
          putExtra(RecognizerIntent.EXTRA_PROMPT, "KI-Sprachnotiz diktieren...")
        }
        activity.startActivityForResult(intent, speechRequestCode)
      } catch (e: Throwable) {
        pendingSpeechPromise = null
        promise.resolve(null)
      }
    }
  }

  private fun checkGeminiNanoAvailable(): Map<String, Any> {
    return try {
      val generationClass = Class.forName("com.google.mlkit.genai.prompt.Generation")
      val getClientMethod = generationClass.getMethod("getClient")
      val client = getClientMethod.invoke(null)
      mapOf(
        "available" to (client != null),
        "engine" to "gemini-nano",
        "model" to "Gemini Nano (AICore)"
      )
    } catch (e: Throwable) {
      mapOf(
        "available" to false,
        "engine" to "gemini-nano",
        "reason" to "ML Kit GenAI Prompt API / AICore not present on this device"
      )
    }
  }

  private fun executePrompt(prompt: String): String {
    return try {
      val generationClass = Class.forName("com.google.mlkit.genai.prompt.Generation")
      val getClientMethod = generationClass.getMethod("getClient")
      val client = getClientMethod.invoke(null)
      if (client != null) {
        val generateMethod = client.javaClass.methods.firstOrNull { it.name == "generateContent" }
        val result = generateMethod?.invoke(client, prompt)
        result?.toString() ?: ""
      } else {
        ""
      }
    } catch (e: Throwable) {
      ""
    }
  }
}
