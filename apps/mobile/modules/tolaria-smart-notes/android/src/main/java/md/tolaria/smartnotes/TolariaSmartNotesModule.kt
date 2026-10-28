package md.tolaria.smartnotes

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class TolariaSmartNotesModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("TolariaSmartNotes")

    AsyncFunction("isAvailable") {
      withContext(Dispatchers.IO) {
        checkGeminiNanoAvailable()
      }
    }

    AsyncFunction("generateContent") { prompt: String ->
      withContext(Dispatchers.IO) {
        executePrompt(prompt)
      }
    }

    AsyncFunction("summarize") { text: String ->
      withContext(Dispatchers.IO) {
        val prompt = "Fasse die folgende Notiz kurz und prägnant in 2 bis 4 Aufzählungspunkten auf Deutsch zusammen (- Punkt):\n\n$text"
        executePrompt(prompt)
      }
    }

    AsyncFunction("suggestTitle") { text: String ->
      withContext(Dispatchers.IO) {
        val prompt = "Erstelle einen kurzen, prägnanten Titel (maximal 6 Wörter, ohne Anführungszeichen) für folgenden Notiztext:\n\n$text"
        executePrompt(prompt).trim().removeSurrounding("\"").removeSurrounding("'")
      }
    }

    AsyncFunction("generateTags") { text: String ->
      withContext(Dispatchers.IO) {
        val prompt = "Generiere 3 bis 5 thematisch passende Tags für diesen Text. Gib ausschließlich eine kommagetrennte Liste ohne '#' oder Erklärungen zurück:\n\n$text"
        val raw = executePrompt(prompt)
        raw.split(",").map { it.trim().removePrefix("#").lowercase() }.filter { it.isNotEmpty() }
      }
    }

    AsyncFunction("extractTodos") { text: String ->
      withContext(Dispatchers.IO) {
        val prompt = "Extrahiere alle Aufgaben, To-Dos und Handlungsanweisungen aus diesem Notiztext. Formatiere jede Zeile als '- [ ] <Aufgabe>':\n\n$text"
        val raw = executePrompt(prompt)
        raw.lines().map { it.trim() }.filter { it.isNotEmpty() }
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
    } catch (_: Throwable) {
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
    } catch (_: Throwable) {
      ""
    }
  }
}
