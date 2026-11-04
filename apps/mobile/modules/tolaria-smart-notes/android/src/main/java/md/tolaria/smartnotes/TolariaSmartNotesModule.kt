package md.tolaria.smartnotes

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import androidx.core.content.ContextCompat
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.Locale
import java.util.concurrent.TimeUnit

class TolariaSmartNotesModule : Module() {
  private val speechRequestCode = 48192
  @Volatile
  private var pendingSpeechPromise: Promise? = null
  private var activeSpeechRecognizer: SpeechRecognizer? = null
  private val mainHandler = Handler(Looper.getMainLooper())
  private val speechTimeoutRunnable = Runnable { finishSpeech(null) }

  // ML Kit GenAI Prompt API (Gemini Nano via AICore) dynamic state
  private val modelLock = Any()
  @Volatile
  private var generativeModel: Any? = null
  @Volatile
  private var generativeFutures: Any? = null
  @Volatile
  private var isModelWarmedUp = false
  @Volatile
  private var isDownloadRequested = false

  // Continuous WhatsApp-style voice recording state
  @Volatile
  private var isContinuousRecording = false
  private val accumulatedSpeech = StringBuilder()
  @Volatile
  private var pendingStopPromise: Promise? = null
  private var continuousRecognizer: SpeechRecognizer? = null
  private var continuousIntent: Intent? = null
  private val stopSafetyTimeoutRunnable = Runnable {
    resolvePendingStop()
  }

  private fun finishSpeech(result: String?) {
    mainHandler.post {
      mainHandler.removeCallbacks(speechTimeoutRunnable)
      try {
        activeSpeechRecognizer?.stopListening()
        activeSpeechRecognizer?.cancel()
        activeSpeechRecognizer?.destroy()
      } catch (_: Throwable) {}
      activeSpeechRecognizer = null

      val p = pendingSpeechPromise
      pendingSpeechPromise = null
      p?.resolve(result)
    }
  }

  private fun resolvePendingStop() {
    mainHandler.post {
      mainHandler.removeCallbacks(stopSafetyTimeoutRunnable)
      val text = accumulatedSpeech.toString().trim()
      val p = pendingStopPromise
      pendingStopPromise = null
      cleanupContinuousRecognizer()
      p?.resolve(if (text.isNotEmpty()) text else null)
    }
  }

  private fun cleanupContinuousRecognizer() {
    mainHandler.post {
      try {
        continuousRecognizer?.stopListening()
        continuousRecognizer?.cancel()
        continuousRecognizer?.destroy()
      } catch (_: Throwable) {}
      continuousRecognizer = null
      continuousIntent = null
    }
  }

  private fun startContinuousListeningInternal(activity: Activity) {
    mainHandler.post {
      if (!isContinuousRecording) return@post
      try {
        continuousRecognizer?.destroy()
      } catch (_: Throwable) {}

      val recognizer = SpeechRecognizer.createSpeechRecognizer(activity)
      continuousRecognizer = recognizer

      val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
        putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
        putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault())
        putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
        putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
      }
      continuousIntent = intent

      recognizer.setRecognitionListener(object : RecognitionListener {
        override fun onReadyForSpeech(params: Bundle?) {}
        override fun onBeginningOfSpeech() {}
        override fun onBufferReceived(buffer: ByteArray?) {}
        override fun onEndOfSpeech() {}

        override fun onRmsChanged(rmsdB: Float) {
          if (isContinuousRecording) {
            try {
              this@TolariaSmartNotesModule.sendEvent(
                "onSpeechRmsChanged",
                mapOf("rms" to rmsdB.toDouble())
              )
            } catch (_: Throwable) {}
          }
        }

        override fun onPartialResults(partialResults: Bundle?) {
          if (!isContinuousRecording) return
          val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
          val partial = matches?.firstOrNull()?.trim()
          if (!partial.isNullOrEmpty()) {
            val combined = if (accumulatedSpeech.isNotEmpty()) {
              "${accumulatedSpeech.toString()} $partial"
            } else {
              partial
            }
            try {
              this@TolariaSmartNotesModule.sendEvent(
                "onSpeechPartialResult",
                mapOf("text" to combined)
              )
            } catch (_: Throwable) {}
          }
        }

        override fun onResults(results: Bundle?) {
          val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
          val spoken = matches?.firstOrNull()?.trim()
          if (!spoken.isNullOrEmpty()) {
            if (accumulatedSpeech.isNotEmpty()) {
              accumulatedSpeech.append(" ")
            }
            accumulatedSpeech.append(spoken)
            try {
              this@TolariaSmartNotesModule.sendEvent(
                "onSpeechPartialResult",
                mapOf("text" to accumulatedSpeech.toString().trim())
              )
            } catch (_: Throwable) {}
          }

          if (isContinuousRecording) {
            mainHandler.postDelayed({
              if (isContinuousRecording && continuousRecognizer != null && continuousIntent != null) {
                try {
                  continuousRecognizer?.startListening(continuousIntent)
                } catch (_: Throwable) {
                  startContinuousListeningInternal(activity)
                }
              }
            }, 60)
          } else {
            resolvePendingStop()
          }
        }

        override fun onError(error: Int) {
          if (isContinuousRecording) {
            // Seamless restart on pause timeouts
            mainHandler.postDelayed({
              if (isContinuousRecording) {
                try {
                  continuousRecognizer?.cancel()
                  continuousRecognizer?.startListening(continuousIntent)
                } catch (_: Throwable) {
                  startContinuousListeningInternal(activity)
                }
              }
            }, 100)
          } else {
            resolvePendingStop()
          }
        }

        override fun onEvent(eventType: Int, params: Bundle?) {}
      })

      recognizer.startListening(intent)
    }
  }

  override fun definition() = ModuleDefinition {
    Name("TolariaSmartNotes")
    Events("onSpeechRmsChanged", "onSpeechPartialResult")

    OnDestroy {
      finishSpeech(null)
      isContinuousRecording = false
      cleanupContinuousRecognizer()
      closeGenerativeModel()
    }

    OnActivityResult { _, payload ->
      if (payload.requestCode == speechRequestCode) {
        if (payload.resultCode == Activity.RESULT_OK && payload.data != null) {
          val matches = payload.data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)
          val spoken = matches?.firstOrNull()?.trim()
          finishSpeech(if (!spoken.isNullOrEmpty()) spoken else null)
        } else {
          finishSpeech(null)
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
      val prompt = "Extrahiere alle Aufgaben, To-Dos und Handlungsanweisungen aus diesem Notiztext. Gib ausschließlich die Aufgabenliste zurück und formatiere jede Zeile exakt als '- [ ] <Aufgabe>':\n\n$text"
      val raw = executePrompt(prompt)
      val lines = raw.lines().map { it.trim() }.filter { it.isNotEmpty() }
      val checkboxLines = lines
        .filter { it.startsWith("- [ ]") || it.startsWith("- [x]") || it.startsWith("* [ ]") }
        .map { if (it.startsWith("* [ ]")) "- [ ]" + it.removePrefix("* [ ]") else it }
      if (checkboxLines.isNotEmpty()) {
        checkboxLines
      } else {
        lines
          .filter { it.startsWith("- ") || it.startsWith("* ") }
          .map { "- [ ] " + it.substring(2).trim() }
      }
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

      finishSpeech(null)
      pendingSpeechPromise = promise

      mainHandler.post {
        try {
          val hasAudioPermission = ContextCompat.checkSelfPermission(
            activity,
            Manifest.permission.RECORD_AUDIO
          ) == PackageManager.PERMISSION_GRANTED

          if (hasAudioPermission && SpeechRecognizer.isRecognitionAvailable(activity)) {
            val recognizer = SpeechRecognizer.createSpeechRecognizer(activity)
            activeSpeechRecognizer = recognizer

            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
              putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
              putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault())
              putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
              putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false)
            }

            recognizer.setRecognitionListener(object : RecognitionListener {
              override fun onReadyForSpeech(params: Bundle?) {}
              override fun onBeginningOfSpeech() {}
              override fun onRmsChanged(rmsdB: Float) {}
              override fun onBufferReceived(buffer: ByteArray?) {}
              override fun onEndOfSpeech() {}

              override fun onError(error: Int) {
                finishSpeech(null)
              }

              override fun onResults(results: Bundle?) {
                val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                val spoken = matches?.firstOrNull()?.trim()
                finishSpeech(if (!spoken.isNullOrEmpty()) spoken else null)
              }

              override fun onPartialResults(partialResults: Bundle?) {}
              override fun onEvent(eventType: Int, params: Bundle?) {}
            })

            mainHandler.postDelayed(speechTimeoutRunnable, 15000)
            recognizer.startListening(intent)
          } else {
            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
              putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
              putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault())
              putExtra(RecognizerIntent.EXTRA_PROMPT, "KI-Sprachnotiz diktieren...")
            }
            activity.startActivityForResult(intent, speechRequestCode)
          }
        } catch (e: Throwable) {
          finishSpeech(null)
        }
      }
    }

    AsyncFunction("startVoiceRecording") { promise: Promise ->
      val activity = appContext.currentActivity
      if (activity == null) {
        promise.resolve(false)
        return@AsyncFunction
      }

      val hasAudioPermission = ContextCompat.checkSelfPermission(
        activity,
        Manifest.permission.RECORD_AUDIO
      ) == PackageManager.PERMISSION_GRANTED

      if (!hasAudioPermission || !SpeechRecognizer.isRecognitionAvailable(activity)) {
        promise.resolve(false)
        return@AsyncFunction
      }

      mainHandler.post {
        isContinuousRecording = true
        accumulatedSpeech.setLength(0)
        startContinuousListeningInternal(activity)
        promise.resolve(true)
      }
    }

    AsyncFunction("stopVoiceRecording") { promise: Promise ->
      mainHandler.post {
        if (!isContinuousRecording && continuousRecognizer == null) {
          val current = accumulatedSpeech.toString().trim()
          promise.resolve(if (current.isNotEmpty()) current else null)
          return@post
        }
        isContinuousRecording = false
        pendingStopPromise = promise
        mainHandler.postDelayed(stopSafetyTimeoutRunnable, 800)
        try {
          continuousRecognizer?.stopListening()
        } catch (_: Throwable) {
          resolvePendingStop()
        }
      }
    }

    AsyncFunction("cancelVoiceRecording") { promise: Promise ->
      mainHandler.post {
        isContinuousRecording = false
        accumulatedSpeech.setLength(0)
        mainHandler.removeCallbacks(stopSafetyTimeoutRunnable)
        val p = pendingStopPromise
        pendingStopPromise = null
        p?.resolve(null)
        cleanupContinuousRecognizer()
        promise.resolve(null)
      }
    }
  }

  private fun getOrCreateFutures(): Any? {
    synchronized(modelLock) {
      generativeFutures?.let { return it }
      return try {
        val genClass = Class.forName("com.google.mlkit.genai.prompt.Generation")
        val getClientMethod = genClass.getMethod("getClient")
        val model = getClientMethod.invoke(null) ?: return null
        val futuresClass = Class.forName("com.google.mlkit.genai.prompt.java.GenerativeModelFutures")
        val fromMethod = futuresClass.getMethod("from", Class.forName("com.google.mlkit.genai.prompt.GenerativeModel"))
        val futures = fromMethod.invoke(null, model)
        generativeModel = model
        generativeFutures = futures
        futures
      } catch (_: Throwable) {
        null
      }
    }
  }

  private fun closeGenerativeModel() {
    synchronized(modelLock) {
      try {
        val model = generativeModel
        if (model != null) {
          val closeMethod = model.javaClass.getMethod("close")
          closeMethod.invoke(model)
        }
      } catch (_: Throwable) {}
      generativeModel = null
      generativeFutures = null
      isModelWarmedUp = false
      isDownloadRequested = false
    }
  }

  private fun triggerModelDownloadIfNeeded(futures: Any) {
    if (isDownloadRequested) return
    isDownloadRequested = true
    try {
      val callbackClass = Class.forName("com.google.mlkit.genai.common.DownloadCallback")
      val proxy = java.lang.reflect.Proxy.newProxyInstance(
        callbackClass.classLoader,
        arrayOf(callbackClass)
      ) { _, method, _ ->
        if (method.name == "onDownloadCompleted" || method.name == "onDownloadFailed") {
          isDownloadRequested = false
        }
        null
      }
      val downloadMethod = futures.javaClass.getMethod("download", callbackClass)
      downloadMethod.invoke(futures, proxy)
    } catch (_: Throwable) {
      isDownloadRequested = false
    }
  }

  private fun checkGeminiNanoAvailable(): Map<String, Any> {
    return try {
      val futures = getOrCreateFutures()
        ?: return mapOf(
          "available" to false,
          "engine" to "gemini-nano",
          "status" to "UNAVAILABLE",
          "reason" to "ML Kit GenAI Prompt API client could not be initialized"
        )
      val checkStatusMethod = futures.javaClass.getMethod("checkStatus")
      val futureStatus = checkStatusMethod.invoke(futures) as? java.util.concurrent.Future<*>
      val statusObj = futureStatus?.get(10, TimeUnit.SECONDS)
      val statusStr = statusObj?.toString() ?: "UNAVAILABLE"

      when (statusStr) {
        "AVAILABLE" -> {
          if (!isModelWarmedUp) {
            isModelWarmedUp = true
            try {
              val warmupMethod = futures.javaClass.getMethod("warmup")
              warmupMethod.invoke(futures)
            } catch (_: Throwable) {}
          }
          mapOf(
            "available" to true,
            "engine" to "gemini-nano",
            "model" to "Gemini Nano (AICore)",
            "status" to "AVAILABLE"
          )
        }
        "DOWNLOADING" -> mapOf(
          "available" to false,
          "engine" to "gemini-nano",
          "model" to "Gemini Nano (AICore)",
          "status" to "DOWNLOADING",
          "reason" to "Gemini Nano model is currently downloading via AICore"
        )
        "DOWNLOADABLE" -> {
          triggerModelDownloadIfNeeded(futures)
          mapOf(
            "available" to false,
            "engine" to "gemini-nano",
            "model" to "Gemini Nano (AICore)",
            "status" to "DOWNLOADABLE",
            "reason" to "Gemini Nano model download initiated via AICore"
          )
        }
        else -> mapOf(
          "available" to false,
          "engine" to "gemini-nano",
          "status" to "UNAVAILABLE",
          "reason" to "Gemini Nano / AICore is not supported on this device"
        )
      }
    } catch (e: Throwable) {
      mapOf(
        "available" to false,
        "engine" to "gemini-nano",
        "status" to "UNAVAILABLE",
        "reason" to (e.message ?: "ML Kit GenAI Prompt API / AICore not present on this device")
      )
    }
  }

  private fun executePrompt(prompt: String): String {
    if (prompt.isBlank()) return ""
    return try {
      val futures = getOrCreateFutures() ?: return ""
      val checkStatusMethod = futures.javaClass.getMethod("checkStatus")
      val futureStatus = checkStatusMethod.invoke(futures) as? java.util.concurrent.Future<*>
      val statusObj = futureStatus?.get(10, TimeUnit.SECONDS)
      val statusStr = statusObj?.toString() ?: ""

      if (statusStr == "DOWNLOADABLE") {
        triggerModelDownloadIfNeeded(futures)
        return ""
      }
      if (statusStr != "AVAILABLE") {
        return ""
      }
      if (!isModelWarmedUp) {
        isModelWarmedUp = true
        try {
          val warmupMethod = futures.javaClass.getMethod("warmup")
          warmupMethod.invoke(futures)
        } catch (_: Throwable) {}
      }
      val genMethod = futures.javaClass.getMethod("generateContent", String::class.java)
      val futureResponse = genMethod.invoke(futures, prompt) as? java.util.concurrent.Future<*>
      val response = futureResponse?.get(30, TimeUnit.SECONDS) ?: return ""
      val getCandidatesMethod = response.javaClass.getMethod("getCandidates")
      val candidates = getCandidatesMethod.invoke(response) as? List<*>
      val firstCandidate = candidates?.firstOrNull() ?: return ""
      val getTextMethod = firstCandidate.javaClass.getMethod("getText")
      val text = getTextMethod.invoke(firstCandidate) as? String
      text?.trim() ?: ""
    } catch (_: Throwable) {
      ""
    }
  }
}
