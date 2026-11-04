package md.tolaria.workspaceaccess

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Handler
import android.os.Looper
import androidx.documentfile.provider.DocumentFile
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.nio.file.Files
import java.nio.file.LinkOption
import java.nio.file.NoSuchFileException
import java.nio.file.attribute.BasicFileAttributes
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors

private const val MANAGED_WORKSPACE_DIRECTORY_NAME = "Tolaria Vault"
private const val PREFS_NAME = "tolaria.workspace.prefs"
private const val MANAGED_WORKSPACE_LABEL_KEY = "tolaria.workspace.label"
private const val PICK_WORKSPACE_REQUEST_CODE = 48193
private const val BACKGROUND_LEASE_TIMEOUT_MS = 25_000L

class TolariaWorkspaceAccessModule : Module() {
  private val mainHandler = Handler(Looper.getMainLooper())
  private val ioExecutor = Executors.newCachedThreadPool()
  private val activeSyncLeases = ConcurrentHashMap<String, Runnable>()
  @Volatile
  private var pendingPickerPromise: Promise? = null

  private val reactContext: Context
    get() = appContext.reactContext ?: throw WorkspaceAccessException.InvalidState()

  override fun definition() = ModuleDefinition {
    Name("TolariaWorkspaceAccess")
    Events("workspaceSyncExpired")

    OnDestroy {
      cancelAllSyncLeases()
      val pending = pendingPickerPromise
      pendingPickerPromise = null
      pending?.resolve(null)
    }

    OnActivityResult { _, payload ->
      if (payload.requestCode == PICK_WORKSPACE_REQUEST_CODE) {
        val promise = pendingPickerPromise
        pendingPickerPromise = null
        if (promise != null) {
          val treeUri = payload.data?.data
          if (payload.resultCode == Activity.RESULT_OK && treeUri != null) {
            handlePickedWorkspaceUri(treeUri, promise)
          } else {
            promise.resolve(null)
          }
        }
      }
    }

    AsyncFunction("beginWorkspaceSync") { identifier: String ->
      beginSyncLease(identifier)
    }

    AsyncFunction("endWorkspaceSync") { identifier: String ->
      endSyncLease(identifier)
    }

    Function("gitEntryInfo") { uri: String ->
      readGitEntryInfo(uri)
    }

    AsyncFunction("saveWorkspaceText") { uri: String, path: String, content: String, identifier: String ->
      managedWorkspaceText(reactContext, uri).write(path, content = content, identifier = identifier)
    }

    AsyncFunction("saveWorkspaceTexts") { uri: String, changes: List<Map<String, String>>, identifier: String ->
      val parsed = changes.map { entry ->
        val path = entry["path"] ?: throw WorkspaceAccessException.InvalidPath()
        val content = entry["content"] ?: throw WorkspaceAccessException.InvalidPath()
        WorkspaceTextChange(path = path, content = content)
      }
      managedWorkspaceText(reactContext, uri).writeBatch(parsed, identifier = identifier)
    }

    Function("recoverWorkspaceText") { uri: String ->
      managedWorkspaceText(reactContext, uri).recover()
    }

    Function("createWorkspaceOperationId") {
      UUID.randomUUID().toString()
    }

    AsyncFunction("changeWorkspaceEntry") { uri: String, path: String, toPath: String?, directory: Boolean, identifier: String ->
      managedWorkspaceText(reactContext, uri).changeEntry(
        WorkspaceEntryChange(
          path = path,
          toPath = toPath,
          directory = directory,
          identifier = identifier
        )
      )
    }

    AsyncFunction("importWorkspace") { uri: String ->
      importWorkspaceFromUriString(uri)
    }

    AsyncFunction("pickAndImportWorkspace") { promise: Promise ->
      presentWorkspacePicker(promise)
    }

    AsyncFunction("restoreWorkspace") {
      restoreManagedWorkspace()
    }

    AsyncFunction("readWorkspaceIndex") { uri: String ->
      readWorkspaceIndexInternal(uri)
    }

    Function("isWorkspaceLinked") { uri: String ->
      LinkedWorkspaceStore(reactContext).session(uri).isLinked
    }

    AsyncFunction("syncLinkedWorkspace") { uri: String ->
      LinkedWorkspaceStore(reactContext).sync(uri)
    }

    AsyncFunction("reviewLinkedConflicts") { uri: String ->
      LinkedWorkspaceStore(reactContext).session(uri).reviewConflicts()
    }

    AsyncFunction("resolveLinkedConflicts") { uri: String, review: String, choices: Map<String, String> ->
      LinkedWorkspaceStore(reactContext).session(uri).resolveConflicts(review, choices)
    }
  }

  private fun beginSyncLease(identifier: String): Boolean {
    if (identifier.isBlank()) return false
    endSyncLease(identifier)
    val expirationRunnable = Runnable {
      activeSyncLeases.remove(identifier)
      try {
        sendEvent("workspaceSyncExpired", mapOf("identifier" to identifier))
      } catch (_: Throwable) {}
    }
    activeSyncLeases[identifier] = expirationRunnable
    mainHandler.postDelayed(expirationRunnable, BACKGROUND_LEASE_TIMEOUT_MS)
    return true
  }

  private fun endSyncLease(identifier: String) {
    val runnable = activeSyncLeases.remove(identifier)
    if (runnable != null) {
      mainHandler.removeCallbacks(runnable)
    }
  }

  private fun cancelAllSyncLeases() {
    for ((_, runnable) in activeSyncLeases) {
      mainHandler.removeCallbacks(runnable)
    }
    activeSyncLeases.clear()
  }

  private fun readGitEntryInfo(uriString: String): Map<String, Any> {
    val (targetFile, _) = resolveManagedWorkspaceRoot(reactContext, uriString)
    val nioPath = targetFile.toPath()
    if (Files.isSymbolicLink(nioPath)) {
      throw WorkspaceAccessException.SymbolicLink()
    }
    val attrs = try {
      Files.readAttributes(nioPath, BasicFileAttributes::class.java, LinkOption.NOFOLLOW_LINKS)
    } catch (_: NoSuchFileException) {
      return mapOf("exists" to false)
    } catch (_: Throwable) {
      if (!Files.exists(nioPath, LinkOption.NOFOLLOW_LINKS)) {
        return mapOf("exists" to false)
      }
      throw WorkspaceAccessException.InvalidPath()
    }
    if (attrs.isSymbolicLink) {
      throw WorkspaceAccessException.SymbolicLink()
    }
    if (!attrs.isRegularFile && !attrs.isDirectory) {
      throw WorkspaceAccessException.InvalidPath()
    }
    return mapOf(
      "exists" to true,
      "isDirectory" to attrs.isDirectory,
      "size" to attrs.size(),
      "modificationTime" to attrs.lastModifiedTime().toMillis().toDouble(),
      "creationTime" to attrs.creationTime().toMillis().toDouble()
    )
  }

  private fun readWorkspaceIndexInternal(uri: String): String {
    val store = managedWorkspaceText(reactContext, uri)
    withWorkspaceMutationLock {
      store.recover()
      requireWorkspaceMutationRoot(store.root)
    }
    return WorkspaceFileIndex(root = store.root).json()
  }

  private fun importWorkspaceFromUriString(uriString: String): Map<String, String>? {
    val parsed = try {
      Uri.parse(uriString)
    } catch (_: Throwable) {
      return null
    }
    return when (parsed.scheme) {
      "content" -> {
        try {
          val flags = Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
          reactContext.contentResolver.takePersistableUriPermission(parsed, flags)
        } catch (_: Throwable) {}
        val doc = DocumentFile.fromTreeUri(reactContext, parsed)
        if (doc == null || !doc.exists() || !doc.isDirectory || !doc.canRead()) {
          return null
        }
        val label = extractWorkspaceLabel(parsed, doc.name)
        copyAndLinkWorkspace(parsed, label)
      }
      "file" -> {
        val path = parsed.path ?: return null
        val sourceDir = File(path)
        if (!sourceDir.exists() || !sourceDir.isDirectory || !sourceDir.canRead()) {
          return null
        }
        val label = sourceDir.nameWithoutExtension.ifEmpty { sourceDir.name }
        if (label.isEmpty()) return null
        copyAndLinkWorkspace(parsed, label)
      }
      else -> null
    }
  }

  private fun copyAndLinkWorkspace(sourceUri: Uri, label: String): Map<String, String> {
    if (label.isBlank()) throw WorkspaceAccessException.InvalidPath()
    val localVaultsBase = File(reactContext.filesDir, "Local Vaults")
    val managedDir = File(localVaultsBase, "local-${UUID.randomUUID().toString().lowercase()}")
    localVaultsBase.mkdirs()
    val indexJson = LinkedWorkspaceStore(reactContext).connect(sourceUri = sourceUri, cacheDir = managedDir)
    val managedUri = managedDir.toURI().toString()
    return mapOf(
      "indexJson" to indexJson,
      "label" to label,
      "uri" to managedUri
    )
  }

  private fun presentWorkspacePicker(promise: Promise) {
    val activity = appContext.currentActivity
    if (activity == null || pendingPickerPromise != null) {
      promise.resolve(null)
      return
    }
    pendingPickerPromise = promise
    mainHandler.post {
      try {
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT_TREE).apply {
          addFlags(
            Intent.FLAG_GRANT_READ_URI_PERMISSION or
              Intent.FLAG_GRANT_WRITE_URI_PERMISSION or
              Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION or
              Intent.FLAG_GRANT_PREFIX_URI_PERMISSION
          )
        }
        activity.startActivityForResult(intent, PICK_WORKSPACE_REQUEST_CODE)
      } catch (e: Throwable) {
        val p = pendingPickerPromise
        pendingPickerPromise = null
        p?.resolve(null)
      }
    }
  }

  private fun handlePickedWorkspaceUri(treeUri: Uri, promise: Promise) {
    ioExecutor.execute {
      try {
        try {
          val flags = Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
          reactContext.contentResolver.takePersistableUriPermission(treeUri, flags)
        } catch (_: Throwable) {}

        val doc = DocumentFile.fromTreeUri(reactContext, treeUri)
        if (doc == null || !doc.exists() || !doc.isDirectory || !doc.canRead()) {
          promise.reject("ERR_WORKSPACE_PERMISSION", "Picked SAF folder is not readable", null)
          return@execute
        }
        val label = extractWorkspaceLabel(treeUri, doc.name)
        val record = copyAndLinkWorkspace(treeUri, label)
        promise.resolve(record)
      } catch (e: Throwable) {
        promise.reject("ERR_WORKSPACE_IMPORT", e.message ?: "Failed to import picked workspace", e)
      }
    }
  }

  private fun extractWorkspaceLabel(uri: Uri, docName: String?): String {
    if (!docName.isNullOrBlank()) {
      return docName.trim()
    }
    val lastSeg = uri.lastPathSegment ?: return "Tolaria Vault"
    val afterColon = lastSeg.substringAfterLast(':')
    val leaf = afterColon.substringAfterLast('/').trim()
    return leaf.ifEmpty { "Tolaria Vault" }
  }

  private fun restoreManagedWorkspace(): Map<String, String>? {
    val prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val label = prefs.getString(MANAGED_WORKSPACE_LABEL_KEY, null) ?: return null
    val managedDir = File(reactContext.filesDir, MANAGED_WORKSPACE_DIRECTORY_NAME)
    if (!managedDir.exists() || !managedDir.isDirectory) return null
    val managedUri = managedDir.toURI().toString()
    managedWorkspaceText(reactContext, managedUri).recover()
    val indexJson = WorkspaceFileIndex(root = managedDir).json()
    return mapOf(
      "indexJson" to indexJson,
      "label" to label,
      "uri" to managedUri
    )
  }
}
